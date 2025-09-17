// app/endpoints/my/sales/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const COOKIE = process.env.SESSION_COOKIE_NAME || 'fenix_session';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const month = url.searchParams.get('month') || new Date().toISOString().slice(0,7);

    const cookie = req.cookies.get(COOKIE)?.value;
    if (!cookie) return NextResponse.json({ ok:false, error:'no_session' }, { status:401 });

    let payload:any;
    try { payload = jwt.verify(cookie, JWT_SECRET); }
    catch { return NextResponse.json({ ok:false, error:'invalid_token' }, { status:401 }); }

    const personId = payload.sub as string;
    const role = String(payload.role || '').toLowerCase();

    const monthStart = `${month}-01`;
    const nextMonth = new Date(
      new Date(`${monthStart}T00:00:00Z`).getUTCFullYear(),
      new Date(`${monthStart}T00:00:00Z`).getUTCMonth() + 1,
      1
    ).toISOString().slice(0,10);

    // 1º intento: si no existe 'sales', PostgREST devuelve PGRST205 -> fallback
    const primTable = role.includes('promotor') ? 'promoter_sales' : 'sales';
    let table = primTable;
    let rows:any[] = [];

    const run = async (tbl:string) => {
      const { data, error } = await supabaseAdmin
        .from(tbl)
        .select('id, order_id, order_date, product_name, qty, total, person_id')
        .eq('person_id', personId)
        .gte('order_date', monthStart)
        .lt('order_date', nextMonth)
        .order('order_date', { ascending: true });

      if (error) {
        console.error('[my/sales] supabase error:', error);
        return { ok:false, data:[] as any[], error };
      }
      return { ok:true, data:data||[] };
    };

    let r = await run(table);
    if (!r.ok && r.error?.code === 'PGRST205') {
      table = table === 'sales' ? 'promoter_sales' : 'sales';
      r = await run(table);
    }
    if (r.ok) rows = r.data;

    const orders = new Set(rows.map(r => r.order_id));
    const total = rows.reduce((acc, r) => acc + Number(r.total || 0), 0);

    const byProd: Record<string, { qty:number; amount:number }> = {};
    for (const r of rows) {
      const k = r.product_name || 'Producto';
      if (!byProd[k]) byProd[k] = { qty:0, amount:0 };
      byProd[k].qty += Number(r.qty || 0);
      byProd[k].amount += Number(r.total || 0);
    }
    const topProducts = Object.entries(byProd)
      .map(([name, v]) => ({ name, qty:v.qty, amount:v.amount }))
      .sort((a,b) => b.amount - a.amount)
      .slice(0, 8);

    return NextResponse.json({
      ok:true,
      kpis: { ventas: rows.length, pedidos: orders.size, total },
      topProducts,
      list: rows,
    }, { status:200, headers:{'Cache-Control':'no-store'} });

  } catch (e:any) {
    console.error('[my/sales] server_error:', e);
    return NextResponse.json({
      ok:true, kpis:{ ventas:0, pedidos:0, total:0 }, topProducts:[], list:[]
    }, { status:200 });
  }
}