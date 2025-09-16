import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const COOKIE = process.env.SESSION_COOKIE_NAME || 'fenix_session';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const norm = (s?: string) =>
  (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();

const BASE_SELECT =
  'id, created_at, sale_date, promoter_name, origin, product_name, quantity, unit_price, customer_name, customer_phone';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const today = new Date();
    const from =
      url.searchParams.get('from') ||
      new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
    const to =
      url.searchParams.get('to') ||
      new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);

    const cookie = req.cookies.get(COOKIE)?.value;
    if (!cookie) return NextResponse.json({ ok:false, error:'no_session' }, { status:401 });

    let payload:any;
    try { payload = jwt.verify(cookie, JWT_SECRET); }
    catch { return NextResponse.json({ ok:false, error:'invalid_token' }, { status:401 }); }

    const personId = String(payload.sub || '').trim();
    if (!personId) return NextResponse.json({ ok:false, error:'no_sub' }, { status:401 });

    // nombre para fallback
    const { data: me } = await supabaseAdmin
      .from('people')
      .select('full_name')
      .eq('id', personId)
      .maybeSingle();

    const myNameRaw = (me?.full_name || payload.name || '').trim();
    const myNameN = norm(myNameRaw);
    const toks = myNameN.split(' ').filter(w => w.length >= 3);
    const first = toks[0];
    const last  = toks[toks.length - 1];

    const debug:any = { personId, myNameRaw, tokens:toks };

    // 1) match por UUID directo
    const r1 = await supabaseAdmin
      .from('promoter_sales')
      .select(BASE_SELECT)
      .eq('promoter_person_id', personId)
      .gte('sale_date', from)
      .lte('sale_date', to)
      .order('sale_date', { ascending: true });

    if (r1.error) return NextResponse.json({ ok:false, error:'db_error', detail:r1.error.message }, { status:500 });
    let rows = r1.data || [];
    debug.byIdCount = rows.length;

    // 2) nombre EXACTO (ilike full)
    if (rows.length === 0 && myNameRaw) {
      const r2 = await supabaseAdmin
        .from('promoter_sales')
        .select(BASE_SELECT)
        .gte('sale_date', from)
        .lte('sale_date', to)
        .ilike('promoter_name', `%${myNameRaw}%`)
        .order('sale_date', { ascending: true });
      if (r2.error) return NextResponse.json({ ok:false, error:'db_error', detail:r2.error.message }, { status:500 });
      rows = r2.data || [];
      debug.byExactNameCount = rows.length;
    }

    // 3) primer + último token (AND)
    if (rows.length === 0 && first && last && first !== last) {
      let qb = supabaseAdmin
        .from('promoter_sales')
        .select(BASE_SELECT)
        .gte('sale_date', from)
        .lte('sale_date', to)
        .order('sale_date', { ascending: true })
        .ilike('promoter_name', `%${first}%`)
        .ilike('promoter_name', `%${last}%`);
      const r3 = await qb;
      if (r3.error) return NextResponse.json({ ok:false, error:'db_error', detail:r3.error.message }, { status:500 });
      rows = r3.data || [];
      debug.byFirstLastCount = rows.length;
    }

    // 4) OR por tokens (cualquier token) — último recurso
    if (rows.length === 0 && toks.length) {
      const ors = toks.map(t => `promoter_name.ilike.%25${encodeURIComponent(t)}%25`).join(',');
      const r4 = await supabaseAdmin
        .from('promoter_sales')
        .select(BASE_SELECT)
        .gte('sale_date', from)
        .lte('sale_date', to)
        .or(ors)
        .order('sale_date', { ascending: true });
      if (r4.error) return NextResponse.json({ ok:false, error:'db_error', detail:r4.error.message }, { status:500 });
      rows = r4.data || [];
      debug.byAnyTokenCount = rows.length;
    }

    const registros = rows.length;
    const items = rows.reduce((s, r:any) => s + Number(r.quantity || 0), 0);
    const totalBs = rows.reduce((s, r:any) => s + Number(r.quantity) * Number(r.unit_price), 0);

    return NextResponse.json({
      ok: true,
      mode:
        debug.byIdCount > 0 ? 'uuid' :
        debug.byExactNameCount > 0 ? 'exact' :
        debug.byFirstLastCount > 0 ? 'first_last' :
        debug.byAnyTokenCount > 0 ? 'any_token' : 'none',
      promoter: myNameRaw,
      range: { from, to },
      kpis: { registros, items, totalBs },
      rows,
      debug,
    }, { status:200, headers:{'Cache-Control':'no-store'} });

  } catch (e:any) {
    return NextResponse.json({ ok:false, error:'server_error', message:e?.message }, { status:500 });
  }
}