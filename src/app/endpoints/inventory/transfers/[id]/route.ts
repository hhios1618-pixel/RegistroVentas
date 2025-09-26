import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { supabaseAdmin, isSupabaseTransientError } from '@/lib/supabase';
import { normalizeRole } from '@/lib/auth/roles';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'fenix_session';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

type SessionPayload = {
  sub?: string;
  role?: string | null;
};

type PatchBody = {
  action?: 'confirm' | 'cancel';
  notes?: string;
};

const FORBIDDEN = NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
const UNAUTHORIZED = NextResponse.json({ ok: false, error: 'no_session' }, { status: 401 });

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const transferId = params?.id;
    if (!transferId) {
      return NextResponse.json({ ok: false, error: 'missing_id' }, { status: 400 });
    }

    const cookie = req.cookies.get(COOKIE_NAME)?.value;
    if (!cookie) return UNAUTHORIZED;

    let payload: SessionPayload;
    try {
      payload = jwt.verify(cookie, JWT_SECRET) as SessionPayload;
    } catch {
      return UNAUTHORIZED;
    }

    const normalizedRole = normalizeRole(payload.role);
    if (!['admin', 'coordinador'].includes(normalizedRole)) {
      return FORBIDDEN;
    }

    const personId = payload.sub;
    if (!personId) return UNAUTHORIZED;

    const body = (await req.json().catch(() => ({}))) as PatchBody;
    const action = body.action;
    if (!action || !['confirm', 'cancel'].includes(action)) {
      return NextResponse.json({ ok: false, error: 'invalid_action' }, { status: 400 });
    }

    const supabase = supabaseAdmin();

    const { data: movement, error: movementError } = await supabase
      .from('inventory_movements')
      .select('id, product_id, from_site_id, to_site_id, quantity, status, movement_type')
      .eq('id', transferId)
      .maybeSingle();

    if (movementError) {
      console.error('[inventory/transfers PATCH] fetch error:', movementError);
      return NextResponse.json({ ok: false, error: 'movement_fetch_failed' }, { status: 500 });
    }

    if (!movement) {
      return NextResponse.json({ ok: false, error: 'transfer_not_found' }, { status: 404 });
    }

    if (movement.movement_type !== 'transfer') {
      return NextResponse.json({ ok: false, error: 'not_a_transfer' }, { status: 400 });
    }

    if (movement.status !== 'in_transit') {
      return NextResponse.json({ ok: false, error: 'invalid_status' }, { status: 400 });
    }

    const nowIso = new Date().toISOString();

    if (action === 'cancel') {
      if (!movement.from_site_id) {
        return NextResponse.json({ ok: false, error: 'missing_source_site' }, { status: 400 });
      }

      const { data: stockRow, error: stockError } = await supabase
        .from('inventory_stock')
        .select('id, quantity')
        .eq('product_id', movement.product_id)
        .eq('site_id', movement.from_site_id)
        .maybeSingle();

      if (stockError && stockError.code !== 'PGRST116') {
        console.error('[inventory/transfers PATCH cancel] stock error:', stockError);
        return NextResponse.json({ ok: false, error: 'stock_fetch_failed' }, { status: 500 });
      }

      const currentQuantity = stockRow?.quantity ? Number(stockRow.quantity) : 0;
      const newQuantity = currentQuantity + Number(movement.quantity ?? 0);

      const { error: updateError } = await supabase
        .from('inventory_stock')
        .upsert({
          id: stockRow?.id,
          product_id: movement.product_id,
          site_id: movement.from_site_id,
          quantity: newQuantity,
          updated_at: nowIso,
        }, { onConflict: 'product_id,site_id' });

      if (updateError) {
        console.error('[inventory/transfers PATCH cancel] stock update error:', updateError);
        return NextResponse.json({ ok: false, error: 'stock_update_failed' }, { status: 500 });
      }

      const { error: movementUpdateError } = await supabase
        .from('inventory_movements')
        .update({
          status: 'cancelled',
          confirmed_by: personId,
          updated_at: nowIso,
          notes: body.notes ?? null,
        })
        .eq('id', transferId);

      if (movementUpdateError) {
        console.error('[inventory/transfers PATCH cancel] movement update error:', movementUpdateError);
        return NextResponse.json({ ok: false, error: 'movement_update_failed' }, { status: 500 });
      }

      return NextResponse.json({ ok: true, status: 'cancelled' });
    }

    // confirm path
    if (!movement.to_site_id) {
      return NextResponse.json({ ok: false, error: 'missing_destination_site' }, { status: 400 });
    }

    const { data: destStock, error: destError } = await supabase
      .from('inventory_stock')
      .select('id, quantity')
      .eq('product_id', movement.product_id)
      .eq('site_id', movement.to_site_id)
      .maybeSingle();

    if (destError && destError.code !== 'PGRST116') {
      console.error('[inventory/transfers PATCH confirm] dest stock error:', destError);
      return NextResponse.json({ ok: false, error: 'stock_fetch_failed' }, { status: 500 });
    }

    const destQuantity = destStock?.quantity ? Number(destStock.quantity) : 0;
    const newDestQuantity = destQuantity + Number(movement.quantity ?? 0);

    const { error: destUpdateError } = await supabase
      .from('inventory_stock')
      .upsert({
        id: destStock?.id,
        product_id: movement.product_id,
        site_id: movement.to_site_id,
        quantity: newDestQuantity,
        updated_at: nowIso,
      }, { onConflict: 'product_id,site_id' });

    if (destUpdateError) {
      console.error('[inventory/transfers PATCH confirm] stock update error:', destUpdateError);
      return NextResponse.json({ ok: false, error: 'stock_update_failed' }, { status: 500 });
    }

    const { error: confirmError } = await supabase
      .from('inventory_movements')
      .update({
        status: 'completed',
        confirmed_by: personId,
        updated_at: nowIso,
        notes: body.notes ?? null,
      })
      .eq('id', transferId);

    if (confirmError) {
      console.error('[inventory/transfers PATCH confirm] movement update error:', confirmError);
      return NextResponse.json({ ok: false, error: 'movement_update_failed' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, status: 'completed' });
  } catch (error) {
    if (isSupabaseTransientError(error)) {
      console.error('[inventory/transfers PATCH] transient error:', (error as Error).message);
      return NextResponse.json({ ok: false, error: 'supabase_unavailable' }, { status: 503 });
    }
    console.error('[inventory/transfers PATCH] fatal:', error);
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}

