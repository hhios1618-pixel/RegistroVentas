import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const COOKIE = process.env.SESSION_COOKIE_NAME || 'fenix_session';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /endpoints/my/promoter-sales?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Devuelve SOLO mis ventas (filtra por promoter_person_id)
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const from = url.searchParams.get('from') || new Date().toISOString().slice(0, 10);
    const to   = url.searchParams.get('to')   || new Date().toISOString().slice(0, 10);

    const cookie = req.cookies.get(COOKIE)?.value;
    if (!cookie) return NextResponse.json({ ok:false, error:'no_session' }, { status:401 });

    let payload: any;
    try { payload = jwt.verify(cookie, JWT_SECRET); }
    catch { return NextResponse.json({ ok:false, error:'invalid_token' }, { status:401 }); }

    const myId = String(payload.sub); // <-- ESTE es tu UUID

    // IMPORTANTE: filtrar por promoter_person_id (NO person_id)
    const { data: rows, error } = await supabaseAdmin
      .from('promoter_sales')
      .select(`
        id, created_at, sale_date, promoter_name,
        promoter_person_id, origin, product_name,
        quantity, unit_price, customer_name, customer_phone
      `)
      .eq('promoter_person_id', myId)
      .gte('sale_date', from)
      .lte('sale_date', to)
      .order('sale_date', { ascending: true })
      .limit(1000);

    if (error) return NextResponse.json({ ok:false, error:'db_error', message:error.message }, { status:500 });

    // KPIs
    const registros = rows?.length || 0;
    const items = (rows||[]).reduce((s,r)=> s + Number(r.quantity||0), 0);
    const totalBs = (rows||[]).reduce((s,r)=> s + Number(r.quantity||0)*Number(r.unit_price||0), 0);

    return NextResponse.json({
      ok:true,
      mode:'mine',
      promoter: payload?.name || payload?.full_name || '',
      range:{ from, to },
      kpis:{ registros, items, totalBs },
      rows: rows||[]
    }, { status:200, headers:{ 'Cache-Control':'no-store' }});

  } catch (e:any) {
    return NextResponse.json({ ok:false, error:'server_error', message:e?.message }, { status:500 });
  }
}