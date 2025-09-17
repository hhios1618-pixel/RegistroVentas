// app/endpoints/my/attendance/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const COOKIE = process.env.SESSION_COOKIE_NAME || 'fenix_session';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const TZ = 'America/La_Paz';

const dayKeyLocal = (iso: string) => {
  const d = new Date(iso);
  const y  = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric' }).format(d);
  const m  = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, month: '2-digit' }).format(d);
  const da = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, day: '2-digit' }).format(d);
  return `${y}-${m}-${da}`;
};

const toLocalMinutes = (iso: string) => {
  const d = new Date(iso);
  const hh = Number(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', hour12: false }).format(d));
  const mm = Number(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, minute: '2-digit' }).format(d));
  return hh * 60 + mm;
};

const normType = (t?: string | null) => {
  const v = (t || '').toLowerCase().trim();
  if (v === 'in' || v === 'entrada') return 'in';
  if (v === 'out' || v === 'salida')  return 'out';
  if (v === 'lunch_out') return 'lunch_out';
  if (v === 'lunch_in')  return 'lunch_in';
  return '';
};

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const month = url.searchParams.get('month') || new Date().toISOString().slice(0, 7);

    const cookie = req.cookies.get(COOKIE)?.value;
    if (!cookie) return NextResponse.json({ ok:false, error:'no_session' }, { status:401 });

    let payload:any;
    try { payload = jwt.verify(cookie, JWT_SECRET); }
    catch { return NextResponse.json({ ok:false, error:'invalid_token' }, { status:401 }); }

    const personId = payload.sub as string;

    const monthStart = `${month}-01`;
    const nextMonthIso = new Date(
      new Date(`${monthStart}T00:00:00Z`).getUTCFullYear(),
      new Date(`${monthStart}T00:00:00Z`).getUTCMonth() + 1,
      1
    ).toISOString().slice(0,10);

    // helper genérico que NO selecciona columnas inexistentes
    async function safeSelect(timeCol: 'taken_at' | 'created_at') {
      const cols = timeCol === 'taken_at'
        ? 'id, person_id, site_id, type, taken_at, created_at'
        : 'id, person_id, site_id, type, created_at';
      try {
        const { data, error } = await supabaseAdmin
          .from('attendance')
          .select(cols)
          .eq('person_id', personId)
          .gte(timeCol, monthStart)
          .lt(timeCol, nextMonthIso)
          .order(timeCol, { ascending: true });
        if (error) {
          console.error('[my/attendance] select error:', error);
          return { rows: [] as any[], err: true };
        }
        return { rows: data || [], err: false };
      } catch (e) {
        console.error('[my/attendance] select thrown:', e);
        return { rows: [] as any[], err: true };
      }
    }

    // 1) taken_at
    let res = await safeSelect('taken_at');
    // 2) fallback a created_at si vacío o error
    if (res.err || res.rows.length === 0) {
      res = await safeSelect('created_at');
      if (res.err) return NextResponse.json({ ok:false, error:'db_error' }, { status:500 });
      return NextResponse.json(buildResponse(res.rows, 'created_at'), { status:200, headers:{'Cache-Control':'no-store'} });
    }
    return NextResponse.json(buildResponse(res.rows, 'taken_at'), { status:200, headers:{'Cache-Control':'no-store'} });

  } catch (e:any) {
    console.error('[my/attendance] server_error:', e);
    return NextResponse.json({ ok:false, error:'server_error', message:e?.message }, { status:500 });
  }
}

function buildResponse(rows: any[], timeCol: 'taken_at'|'created_at') {
  const getTime = (r:any) => r[timeCol] ?? r['created_at'];

  // Agrupación local + KPIs (sin geofence porque no hay columnas)
  const byDay: Record<string, any[]> = {};
  let entradas = 0, salidas = 0;

  for (const r of rows) {
    const t = getTime(r);
    if (!t) continue;
    const day = dayKeyLocal(String(t));
    (byDay[day] ||= []).push(r);

    const nt = normType(r.type);
    if (nt === 'in')  entradas++;
    if (nt === 'out') salidas++;
  }

  const days = Object.entries(byDay).map(([date, marks]) => {
    const sorted = [...marks].sort((a:any,b:any)=>String(getTime(a)).localeCompare(String(getTime(b))));
    let firstIn: string|null = null, lastOut: string|null = null;
    let lunchOut: string|null = null, lunchIn: string|null = null;

    for (const m of sorted) {
      const t = String(getTime(m));
      const nt = normType(m.type);
      if (nt === 'in'  && !firstIn) firstIn = t;
      if (nt === 'out') lastOut = t;
      if (nt === 'lunch_out' && !lunchOut) lunchOut = t;
      if (nt === 'lunch_in')  lunchIn  = t;
    }

    let worked = 0, lunchMin = 0;
    if (firstIn && lastOut) worked = Math.max(0, toLocalMinutes(lastOut) - toLocalMinutes(firstIn));
    if (lunchOut && lunchIn) {
      const lo = toLocalMinutes(lunchOut), li = toLocalMinutes(lunchIn);
      lunchMin = Math.max(0, li - lo);
      worked   = Math.max(0, worked - lunchMin);
    }

    return { date, marks: sorted, first_in:firstIn, last_out:lastOut, lunch_out:lunchOut, lunch_in:lunchIn, lunch_minutes:lunchMin, worked_minutes:worked };
  }).sort((a,b)=>a.date.localeCompare(b.date));

  const kpis = { dias_con_marca: days.length, entradas, salidas, pct_geocerca_ok: 0 };

  return { ok: true, kpis, days, raw: rows };
}