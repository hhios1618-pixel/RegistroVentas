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

type TransferPayload = {
  product_id?: string;
  from_site_id?: string;
  to_site_id?: string;
  quantity?: number;
  notes?: string;
};

const FORBIDDEN = NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
const UNAUTHORIZED = NextResponse.json({ ok: false, error: 'no_session' }, { status: 401 });

function ensureSession(req: NextRequest) {
  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (!cookie) return { error: UNAUTHORIZED } as const;
  try {
    const payload = jwt.verify(cookie, JWT_SECRET) as SessionPayload;
    const normalizedRole = normalizeRole(payload.role);
    if (!['admin', 'coordinador'].includes(normalizedRole)) {
      return { error: FORBIDDEN } as const;
    }
    if (!payload.sub) {
      return { error: UNAUTHORIZED } as const;
    }
    return { payload } as const;
  } catch {
    return { error: UNAUTHORIZED } as const;
  }
}

export async function GET(req: NextRequest) {
  const session = ensureSession(req);
  if ('error' in session) return session.error;

  try {
    const supabase = supabaseAdmin();
    const { data, error } = await supabase
      .from('inventory_movements')
      .select(`
        id,
        product_id,
        from_site_id,
        to_site_id,
        quantity,
        status,
        notes,
        created_at,
        updated_at,
        movement_type,
        products:inventory_products(id, sku, name),
        from_site:sites!inventory_movements_from_site_id_fkey(id, name),
        to_site:sites!inventory_movements_to_site_id_fkey(id, name)
      `)
      .eq('movement_type', 'transfer')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[inventory/transfers GET] fetch error:', error);
      return NextResponse.json({ ok: false, error: 'transfers_fetch_failed' }, { status: 500 });
    }

    const transfers = (data ?? []).map((row) => ({
      id: row.id,
      product_id: row.product_id,
      product: Array.isArray(row.products) && row.products.length > 0
        ? { id: row.products[0].id, sku: row.products[0].sku, name: row.products[0].name }
        : null,
      from_site: Array.isArray(row.from_site) && row.from_site.length > 0
        ? { id: row.from_site[0].id, name: row.from_site[0].name }
        : null,
      to_site: Array.isArray(row.to_site) && row.to_site.length > 0
        ? { id: row.to_site[0].id, name: row.to_site[0].name }
        : null,
      quantity: Number(row.quantity ?? 0),
      status: row.status,
      notes: row.notes,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return NextResponse.json({ ok: true, transfers }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (isSupabaseTransientError(error)) {
      console.error('[inventory/transfers GET] transient error:', (error as Error).message);
      return NextResponse.json({ ok: false, error: 'supabase_unavailable' }, { status: 503 });
    }
    console.error('[inventory/transfers GET] fatal:', error);
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = ensureSession(req);
  if ('error' in session) return session.error;

  try {
    const body = (await req.json().catch(() => ({}))) as TransferPayload;
    const productId = body.product_id?.trim();
    const fromSiteId = body.from_site_id?.trim();
    const toSiteId = body.to_site_id?.trim();
    const quantity = Number(body.quantity);

    if (!productId || !fromSiteId || !toSiteId || Number.isNaN(quantity) || quantity <= 0) {
      return NextResponse.json({ ok: false, error: 'invalid_payload' }, { status: 400 });
    }

    if (fromSiteId === toSiteId) {
      return NextResponse.json({ ok: false, error: 'same_site' }, { status: 400 });
    }

    const supabase = supabaseAdmin();

    const { data: stockRow, error: stockError } = await supabase
      .from('inventory_stock')
      .select('id, quantity')
      .eq('product_id', productId)
      .eq('site_id', fromSiteId)
      .maybeSingle();

    if (stockError && stockError.code !== 'PGRST116') {
      console.error('[inventory/transfers POST] stock fetch error:', stockError);
      return NextResponse.json({ ok: false, error: 'stock_fetch_failed' }, { status: 500 });
    }

    const available = stockRow?.quantity ? Number(stockRow.quantity) : 0;
    if (available < quantity) {
      return NextResponse.json({ ok: false, error: 'insufficient_stock' }, { status: 400 });
    }

    const newFromQuantity = available - quantity;
    const nowIso = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('inventory_stock')
      .upsert(
        {
          id: stockRow?.id,
          product_id: productId,
          site_id: fromSiteId,
          quantity: newFromQuantity,
          updated_at: nowIso,
        },
        { onConflict: 'product_id,site_id' }
      );

    if (updateError) {
      console.error('[inventory/transfers POST] source update error:', updateError);
      return NextResponse.json({ ok: false, error: 'stock_update_failed' }, { status: 500 });
    }

    const { error: movementError, data } = await supabase
      .from('inventory_movements')
      .insert({
        product_id: productId,
        from_site_id: fromSiteId,
        to_site_id: toSiteId,
        quantity,
        movement_type: 'transfer',
        status: 'in_transit',
        requested_by: session.payload.sub,
        notes: body.notes ?? null,
      })
      .select()
      .maybeSingle();

    if (movementError || !data) {
      console.error('[inventory/transfers POST] movement insert error:', movementError);
      return NextResponse.json({ ok: false, error: 'movement_create_failed' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, transfer_id: data.id });
  } catch (error) {
    if (isSupabaseTransientError(error)) {
      console.error('[inventory/transfers POST] transient error:', (error as Error).message);
      return NextResponse.json({ ok: false, error: 'supabase_unavailable' }, { status: 503 });
    }
    console.error('[inventory/transfers POST] fatal:', error);
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}