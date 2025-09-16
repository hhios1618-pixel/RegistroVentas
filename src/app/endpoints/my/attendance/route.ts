import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const COOKIE = process.env.SESSION_COOKIE_NAME || 'fenix_session';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /endpoints/my/attendance?month=YYYY-MM
 * Responde: { ok, kpis, days[], raw[] }
 * - Considera 'in' | 'out' | 'lunch_out' | 'lunch_in'
 * - Descunta colación de las horas trabajadas
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const month = (url.searchParams.get('month') || new Date().toISOString().slice(0,7)); // YYYY-MM

    const cookie = req.cookies.get(COOKIE)?.value;
    if (!cookie) return NextResponse.json({ ok:false, error:'no_session' }, { status:401 });

    let payload:any;
    try { payload = jwt.verify(cookie, JWT_SECRET); }
    catch { return NextResponse.json({ ok:false, error:'invalid_token' }, { status:401 }); }

    const personId = payload.sub as string;
    const monthStart = `${month}-01`;
    const monthEnd = new Date(
      new Date(`${monthStart}T00:00:00Z`).getUTCFullYear(),
      new Date(`${monthStart}T00:00:00Z`).getUTCMonth()+1,
      1
    ).toISOString().slice(0,10);

    // Intentar con taken_at si existe; si no, usar created_at
    const { data: rowsTry, error: errTry } = await supabaseAdmin
      .from('attendance')
      .select('id, person_id, site_id, type, taken_at, created_at, distance_m, within_geofence, site_name')
      .eq('person_id', personId)
      .gte('taken_at', monthStart)
      .lt('taken_at', monthEnd)
      .order('taken_at', { ascending: true });

    if (!errTry) {
      return NextResponse.json(buildResponse(rowsTry || [], 'taken_at'), { status:200, headers:{'Cache-Control':'no-store'} });
    }

    // Fallback a created_at
    const { data: rows, error } = await supabaseAdmin
      .from('attendance')
      .select('id, person_id, site_id, type, created_at, distance_m, within_geofence, site_name')
      .eq('person_id', personId)
      .gte('created_at', monthStart)
      .lt('created_at', monthEnd)
      .order('created_at', { ascending: true });

    if (error) return NextResponse.json({ ok:false, error:'db_error' }, { status:500 });
    return NextResponse.json(buildResponse(rows || [], 'created_at'), { status:200, headers:{'Cache-Control':'no-store'} });

  } catch (e:any) {
    return NextResponse.json({ ok:false, error:'server_error', message:e?.message }, { status:500 });
  }
}

/* ================= Helpers ================= */

const TZ = 'America/La_Paz';

function dayKeyLocal(iso: string) {
  const d = new Date(iso);
  const y  = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric' }).format(d);
  const mo = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, month: '2-digit' }).format(d);
  const da = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, day: '2-digit' }).format(d);
  return `${y}-${mo}-${da}`;
}

function toLocalMinutes(iso: string) {
  const d = new Date(iso);
  const hh = Number(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', hour12: false }).format(d));
  const mm = Number(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, minute: '2-digit' }).format(d));
  return hh * 60 + mm;
}

function normType(t?: string | null) {
  const v = (t || '').toLowerCase().trim();
  if (v === 'in' || v === 'entrada') return 'in';
  if (v === 'out' || v === 'salida') return 'out';
  if (v === 'lunch_out') return 'lunch_out';
  if (v === 'lunch_in')  return 'lunch_in';
  return '';
}

function buildResponse(rows: any[], timeCol: 'taken_at'|'created_at') {
  const getTime = (r:any) => (r[timeCol] ?? r['created_at']);

  // KPIs
  const daysSet = new Set<string>();
  let inCount = 0, outCount = 0, geoOk = 0;
  for (const r of rows) {
    const t = getTime(r);
    if (!t) continue;
    const day = String(t).slice(0,10);
    daysSet.add(day);
    const nt = normType(r.type);
    if (nt === 'in') inCount++;
    if (nt === 'out') outCount++;
    if (r.within_geofence) geoOk++;
  }
  const kpis = {
    dias_con_marca: daysSet.size,
    entradas: inCount,
    salidas: outCount,
    pct_geocerca_ok: rows.length ? Math.round((geoOk / rows.length) * 100) : 0,
  };

  // Agrupar por día y calcular colación
  const byDay: Record<string, any[]> = {};
  for (const r of rows) {
    const t = getTime(r);
    if (!t) continue;
    const day = dayKeyLocal(String(t));
    (byDay[day] ||= []).push(r);
  }

  const days = Object.entries(byDay).map(([date, marks]) => {
    const sorted = [...marks].sort((a:any,b:any)=>String(getTime(a)).localeCompare(String(getTime(b))));
    let firstIn: string|null = null;
    let lastOut: string|null = null;
    let lunchOut: string|null = null;
    let lunchIn: string|null = null;

    for (const m of sorted) {
      const t = String(getTime(m));
      const nt = normType(m.type);
      if (nt === 'in'  && !firstIn) firstIn = t;
      if (nt === 'out') lastOut = t; // último OUT prevalece
      if (nt === 'lunch_out' && !lunchOut) lunchOut = t;
      if (nt === 'lunch_in')  lunchIn  = t; // último IN lunch prevalece
    }

    let worked = 0, lunchMin = 0;
    if (firstIn && lastOut) {
      worked = Math.max(0, toLocalMinutes(lastOut) - toLocalMinutes(firstIn));
    }
    if (lunchOut && lunchIn) {
      const lo = toLocalMinutes(lunchOut);
      const li = toLocalMinutes(lunchIn);
      lunchMin = Math.max(0, li - lo);
      worked = Math.max(0, worked - lunchMin); // descuenta colación
    }

    return {
      date,
      marks: sorted,
      first_in: firstIn,
      last_out: lastOut,
      lunch_out: lunchOut,
      lunch_in: lunchIn,
      lunch_minutes: lunchMin,
      worked_minutes: worked,
    };
  }).sort((a,b)=>a.date.localeCompare(b.date));

  return { ok: true, kpis, days, raw: rows };
}