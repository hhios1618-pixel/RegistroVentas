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

type Site = {
  id: string;
  name: string;
  is_active: boolean;
};

type StockRow = {
  product_id: string;
  site_id: string;
  quantity: number;
  updated_at: string;
  site_name: string | null;
};

type Product = {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  unit: string | null;
  is_active: boolean;
  total_quantity: number;
  stock: {
    site_id: string;
    site_name: string | null;
    quantity: number;
    updated_at: string;
  }[];
};

const FORBIDDEN = NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
const UNAUTHORIZED = NextResponse.json({ ok: false, error: 'no_session' }, { status: 401 });

export async function GET(req: NextRequest) {
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

    const supabase = supabaseAdmin();

    const [productsRes, stockRes, sitesRes] = await Promise.all([
      supabase
        .from('inventory_products')
        .select('id, sku, name, description, unit, is_active')
        .order('name'),
      supabase
        .from('inventory_stock')
        .select('product_id, site_id, quantity, updated_at, sites:sites(id, name)')
        .order('updated_at', { ascending: false }),
      supabase
        .from('sites')
        .select('id, name, is_active')
        .eq('is_active', true)
        .order('name'),
    ]);

    if (productsRes.error) {
      console.error('[inventory/summary] products error:', productsRes.error);
      return NextResponse.json({ ok: false, error: 'products_fetch_failed' }, { status: 500 });
    }
    if (stockRes.error) {
      console.error('[inventory/summary] stock error:', stockRes.error);
      return NextResponse.json({ ok: false, error: 'stock_fetch_failed' }, { status: 500 });
    }
    if (sitesRes.error) {
      console.error('[inventory/summary] sites error:', sitesRes.error);
      return NextResponse.json({ ok: false, error: 'sites_fetch_failed' }, { status: 500 });
    }

    const sites: Site[] = (sitesRes.data ?? []).map((site) => ({
      id: site.id,
      name: site.name,
      is_active: site.is_active,
    }));

    const stockRows: StockRow[] = (stockRes.data ?? []).flatMap((row) => {
      // si no hay sites relacionados → fila única con null
      if (!row.sites || row.sites.length === 0) {
        return [{
          product_id: row.product_id,
          site_id: row.site_id,
          quantity: Number(row.quantity ?? 0),
          updated_at: row.updated_at,
          site_name: null,
        }];
      }

      // expandir cada sucursal en una fila propia
      return row.sites.map((site: any) => ({
        product_id: row.product_id,
        site_id: row.site_id,
        quantity: Number(row.quantity ?? 0),
        updated_at: row.updated_at,
        site_name: site.name,
      }));
    });

    // agrupar por producto
    const stockByProduct = new Map<string, StockRow[]>();
    for (const row of stockRows) {
      if (!stockByProduct.has(row.product_id)) {
        stockByProduct.set(row.product_id, []);
      }
      stockByProduct.get(row.product_id)!.push(row);
    }

    const products: Product[] = (productsRes.data ?? []).map((product) => {
      const rows = stockByProduct.get(product.id) ?? [];
      const totalsBySite = rows.map((row) => ({
        site_id: row.site_id,
        site_name: row.site_name,
        quantity: row.quantity,
        updated_at: row.updated_at,
      }));
      const total_quantity = rows.reduce((acc, row) => acc + row.quantity, 0);
      return {
        id: product.id,
        sku: product.sku,
        name: product.name,
        description: product.description,
        unit: product.unit,
        is_active: product.is_active,
        total_quantity,
        stock: totalsBySite,
      };
    });

    return NextResponse.json(
      {
        ok: true,
        products,
        sites,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    if (isSupabaseTransientError(error)) {
      console.error('[inventory/summary] transient error:', (error as Error).message);
      return NextResponse.json({ ok: false, error: 'supabase_unavailable' }, { status: 503 });
    }
    console.error('[inventory/summary] fatal:', error);
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}