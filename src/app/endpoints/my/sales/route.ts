// src/app/endpoints/my/sales/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { supabaseAdmin, withSupabaseRetry, isSupabaseTransientError } from '@/lib/supabase';
import type { PostgrestResponse } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const COOKIE = process.env.SESSION_COOKIE_NAME || 'fenix_session';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

/* ================= Tipos ================= */
type JwtPayloadMinimal = { sub: string; role?: string; name?: string };

type RowCommon = {
  id: string;
  order_id: string | null;
  order_date: string;            // ISO
  product_name: string | null;
  qty: number;                   // cantidad
  total: number;                 // monto total Bs
  person_id: string;             // UUID unificado
};

type OrdersJoined = {
  created_at: string;
  sales_user_id: string | null;
  seller: string | null;
  seller_role: string | null;
  sales_role: string | null;
  branch_id: string | null;
};

type OrderItemJoined = {
  id: string;
  order_id: string | null;
  product_name: string | null;
  quantity: number | null;
  unit_price: number | null;
  subtotal: number | null;
  // algunos clients tipan 'orders' como array en inner join; manejamos ambos
  orders: OrdersJoined | OrdersJoined[] | null;
};

type PromoterSaleRow = {
  id: string;
  sale_date: string;
  product_name: string | null;
  quantity: number | null;
  unit_price: number | null;
  promoter_person_id: string;
};

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const month = (url.searchParams.get('month') || new Date().toISOString().slice(0, 7)).trim();

    // === sesión ===
    const cookie = req.cookies.get(COOKIE)?.value;
    if (!cookie) {
      return NextResponse.json({ ok: false, error: 'no_session' }, { status: 401 });
    }

    let payload: JwtPayloadMinimal;
    try {
      payload = jwt.verify(cookie, JWT_SECRET) as JwtPayloadMinimal;
    } catch {
      return NextResponse.json({ ok: false, error: 'invalid_token' }, { status: 401 });
    }

    const personId = String(payload?.sub || '').trim();
    const role = String(payload?.role || '').toLowerCase();
    const personName = typeof payload?.name === 'string' ? payload.name.trim() : null;

    if (!personId) {
      return NextResponse.json({ ok: false, error: 'invalid_sub' }, { status: 401 });
    }

    const monthStart = `${month}-01`;
    const base = new Date(`${monthStart}T00:00:00Z`);
    const nextMonthIso = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 1))
      .toISOString()
      .slice(0, 10);

    const sb = supabaseAdmin();

    // Helpers de fetch con normalización de shape
    const baseOrderItemsSelect =
      `id,
       order_id,
       product_name,
       quantity,
       unit_price,
       subtotal,
       orders!inner(
         created_at,
         sales_user_id,
         seller,
         seller_role,
         sales_role,
         branch_id
       )`;

    // === Query de order_items con join a orders (por userId o por nombre seller) ===
    const fromOrderItems = async (filters: { byUserId?: boolean; bySeller?: string | null })
      : Promise<{ ok: boolean; data: RowCommon[]; error?: any }> => {
      try {
        // devolvemos una PROMESA tipada, no un builder
        const resp: PostgrestResponse<OrderItemJoined> = await withSupabaseRetry(
          async (): Promise<PostgrestResponse<OrderItemJoined>> => {
            let query = sb
              .from('order_items')
              .select(baseOrderItemsSelect as any) // bypass del parser de columnas
              .gte('orders.created_at', monthStart)
              .lt('orders.created_at', nextMonthIso)
              .order('created_at', { ascending: true, foreignTable: 'orders' });

            if (filters.byUserId) {
              query = query.eq('orders.sales_user_id', personId);
            }

            if (filters.bySeller && filters.bySeller.trim().length) {
              query = query.ilike('orders.seller', `%${filters.bySeller.trim()}%`);
            }

            const r = await query;
            return r as PostgrestResponse<OrderItemJoined>;
          }
        );

        const { data, error } = resp;
        if (error) {
          return { ok: false, data: [], error };
        }

        const rows: RowCommon[] = (data ?? [])
          .map((item): RowCommon | null => {
            const orderRaw = item.orders;
            const order: OrdersJoined | null = Array.isArray(orderRaw)
              ? (orderRaw[0] ?? null)
              : orderRaw;

            if (!order) return null;

            const qty = Number(item.quantity ?? 0);
            const unit = Number(item.unit_price ?? 0);
            const subtotal = Number(item.subtotal ?? qty * unit);

            return {
              id: String(item.id),
              order_id: item.order_id ?? null,
              order_date: String(order.created_at),
              product_name: item.product_name ?? null,
              qty,
              total: subtotal,
              person_id: personId,
            };
          })
          .filter((r): r is RowCommon => !!r && !!r.order_date);

        return { ok: true, data: rows };
      } catch (error) {
        return { ok: false, data: [], error };
      }
    };

    // === Tabla alternativa para promotores ===
    const fetchFromPromoter = async (): Promise<{ ok: boolean; data: RowCommon[]; error?: any }> => {
      try {
        const resp: PostgrestResponse<PromoterSaleRow> = await withSupabaseRetry(
          async (): Promise<PostgrestResponse<PromoterSaleRow>> => {
            const r = await sb
              .from('promoter_sales')
              .select('id, sale_date, product_name, quantity, unit_price, promoter_person_id')
              .eq('promoter_person_id', personId)
              .gte('sale_date', monthStart)
              .lt('sale_date', nextMonthIso)
              .order('sale_date', { ascending: true });
            return r as PostgrestResponse<PromoterSaleRow>;
          }
        );

        const { data, error } = resp;
        if (error) return { ok: false, data: [], error };

        const rows: RowCommon[] = (data ?? []).map((r) => {
          const qty = Number(r.quantity ?? 0);
          const unit = Number(r.unit_price ?? 0);
          return {
            id: String(r.id),
            order_id: null,
            order_date: String(r.sale_date),         // normalizamos nombre
            product_name: r.product_name ?? null,
            qty,
            total: qty * unit,                        // calculamos total
            person_id: r.promoter_person_id,          // normalizamos persona
          };
        });

        return { ok: true, data: rows };
      } catch (error) {
        return { ok: false, data: [], error };
      }
    };

    let rows: RowCommon[] = [];

    // 1) ventas registradas mediante sales_user_id (comerciales asignados)
    const orderItemsByUser = await fromOrderItems({ byUserId: true });
    if (orderItemsByUser.ok) {
      rows = orderItemsByUser.data;
    } else if (orderItemsByUser.error) {
      if (isSupabaseTransientError(orderItemsByUser.error)) {
        console.error('[my/sales] Supabase temporalmente no disponible:', orderItemsByUser.error.message);
        return NextResponse.json({ ok: false, error: 'supabase_unavailable' }, { status: 503 });
      }
      if (orderItemsByUser.error.code !== 'PGRST205') {
        console.error('[my/sales] order_items by user failed:', orderItemsByUser.error);
      }
    }

    // 2) fallback por nombre del vendedor (delivery / legacy registros)
    if (!rows.length && personName) {
      const orderItemsBySeller = await fromOrderItems({ bySeller: personName });
      if (orderItemsBySeller.ok && orderItemsBySeller.data.length) {
        rows = orderItemsBySeller.data;
      } else if (orderItemsBySeller.error) {
        if (isSupabaseTransientError(orderItemsBySeller.error)) {
          console.error('[my/sales] Supabase temporalmente no disponible:', orderItemsBySeller.error.message);
          return NextResponse.json({ ok: false, error: 'supabase_unavailable' }, { status: 503 });
        }
        if (orderItemsBySeller.error.code !== 'PGRST205') {
          console.error('[my/sales] order_items by seller failed:', orderItemsBySeller.error);
        }
      }
    }

    // 3) Promotores: usa tabla dedicada
    if (!rows.length && role.includes('promotor')) {
      const promoterRes = await fetchFromPromoter();
      if (promoterRes.ok) {
        rows = promoterRes.data;
      } else if (promoterRes.error) {
        if (isSupabaseTransientError(promoterRes.error)) {
          console.error('[my/sales] Supabase temporalmente no disponible:', promoterRes.error.message);
          return NextResponse.json({ ok: false, error: 'supabase_unavailable' }, { status: 503 });
        }
        console.error('[my/sales] promoter_sales failed:', promoterRes.error);
      }
    }

    // ================= KPIs =================
    const orders = new Set<string>(rows.map((r) => r.order_id!).filter(Boolean) as string[]);
    const total = rows.reduce<number>((acc, r) => acc + Number(r.total || 0), 0);

    const byProd: Record<string, { qty: number; amount: number }> = {};
    for (const r of rows) {
      const k = r.product_name || 'Producto';
      if (!byProd[k]) byProd[k] = { qty: 0, amount: 0 };
      byProd[k].qty += Number(r.qty || 0);
      byProd[k].amount += Number(r.total || 0);
    }

    const topProducts = Object.entries(byProd)
      .map(([name, v]) => ({ name, qty: v.qty, amount: v.amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);

    return NextResponse.json(
      {
        ok: true,
        kpis: { ventas: rows.length, pedidos: orders.size, total },
        topProducts,
        list: rows,
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (e: any) {
    if (isSupabaseTransientError(e)) {
      console.error('[my/sales] Supabase temporalmente no disponible:', e.message);
      return NextResponse.json({ ok: false, error: 'supabase_unavailable' }, { status: 503 });
    }
    console.error('[my/sales] server_error:', e);
    // Mantén comportamiento resiliente para no romper el UI
    return NextResponse.json(
      { ok: true, kpis: { ventas: 0, pedidos: 0, total: 0 }, topProducts: [], list: [] },
      { status: 200 }
    );
  }
}
