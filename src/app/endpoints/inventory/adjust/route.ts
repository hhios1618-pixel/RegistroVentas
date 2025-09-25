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

type AdjustBody = {
  product_id?: string;
  site_id?: string;
  quantity_delta?: number;
  reason?: string;
};

const FORBIDDEN = NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
const UNAUTHORIZED = NextResponse.json({ ok: false, error: 'no_session' }, { status: 401 });

export async function POST(req: NextRequest) {
  try {
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

    const body = (await req.json().catch(() => ({}))) as AdjustBody;
    const productId = body.product_id?.trim();
    const siteId = body.site_id?.trim();
    const delta = Number(body.quantity_delta);

    if (!productId || !siteId || Number.isNaN(delta) || delta === 0) {
      return NextResponse.json({ ok: false, error: 'invalid_payload' }, { status: 400 });
    }

    const supabase = supabaseAdmin();

    const { data: stockRow, error: stockError } = await supabase
      .from('inventory_stock')
      .select('id, quantity')
      .eq('product_id', productId)
      .eq('site_id', siteId)
      .maybeSingle();

    if (stockError && stockError.code !== 'PGRST116') {
      console.error('[inventory/adjust] stock fetch error:', stockError);
      return NextResponse.json({ ok: false, error: 'stock_fetch_failed' }, { status: 500 });
    }

    const currentQuantity = stockRow?.quantity ? Number(stockRow.quantity) : 0;
    const nextQuantity = currentQuantity + delta;
    if (nextQuantity < 0) {
      return NextResponse.json({ ok: false, error: 'insufficient_stock' }, { status: 400 });
    }

    const upsertPayload = {
      id: stockRow?.id,
      product_id: productId,
      site_id: siteId,
      quantity: nextQuantity,
      updated_at: new Date().toISOString(),
    } as const;

    const { error: upsertError } = await supabase
      .from('inventory_stock')
      .upsert(upsertPayload, { onConflict: 'product_id,site_id' });

    if (upsertError) {
      console.error('[inventory/adjust] upsert error:', upsertError);
      return NextResponse.json({ ok: false, error: 'stock_update_failed' }, { status: 500 });
    }

    const { error: movementError } = await supabase.from('inventory_movements').insert({
      product_id: productId,
      from_site_id: delta < 0 ? siteId : null,
      to_site_id: delta > 0 ? siteId : null,
      quantity: Math.abs(delta),
      movement_type: 'adjustment',
      status: 'completed',
      requested_by: personId,
      confirmed_by: personId,
      notes: body.reason ?? null,
    });

    if (movementError) {
      console.error('[inventory/adjust] movement error:', movementError);
      return NextResponse.json({ ok: false, error: 'movement_create_failed' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, product_id: productId, site_id: siteId, quantity: nextQuantity });
  } catch (error) {
    if (isSupabaseTransientError(error)) {
      console.error('[inventory/adjust] transient error:', (error as Error).message);
      return NextResponse.json({ ok: false, error: 'supabase_unavailable' }, { status: 503 });
    }
    console.error('[inventory/adjust] fatal:', error);
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}

