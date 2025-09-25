// src/app/endpoints/my/attendance/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { supabaseAdmin, withSupabaseRetry, isSupabaseTransientError } from '@/lib/supabase';
import type { PostgrestResponse } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const COOKIE = process.env.SESSION_COOKIE_NAME || 'fenix_session';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const TZ = 'America/La_Paz';

/* ================= Tipos ================= */
type JwtPayloadMinimal = { sub: string };

type AttendanceRow = {
  id: string;
  person_id: string;
  site_id: string | null;
  type: string | null;
  created_at: string | null;
  taken_at?: string | null; // puede no existir en algunos esquemas
};

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

    const personId = payload.sub;
    if (!personId) {
      return NextResponse.json({ ok: false, error: 'invalid_sub' }, { status: 401 });
    }

    // === rango mensual (UTC) ===
    const monthStart = `${month}-01`;
    const base = new Date(`${monthStart}T00:00:00Z`);
    const nextMonth = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 1));
    const nextMonthIso = nextMonth.toISOString().slice(0, 10);

    const sb = supabaseAdmin();

    // helper genérico: selecciona por columna de tiempo existente
    async function safeSelect(timeCol: 'taken_at' | 'created_at') {
      const cols =
        timeCol === 'taken_at'
          ? 'id, person_id, site_id, type, taken_at, created_at'
          : 'id, person_id, site_id, type, created_at';

      try {
        // ⚠️ Declaramos la PROMESA tipada para que withSupabaseRetry no devuelva unknown
        const resp: PostgrestResponse<AttendanceRow> = await withSupabaseRetry(
          async (): Promise<PostgrestResponse<AttendanceRow>> => {
            const r = await sb
              .from('attendance')
              .select(cols as any) // bypass del type-level parser de columnas
              .eq('person_id', personId)
              .gte(timeCol, monthStart)
              .lt(timeCol, nextMonthIso)
              .order(timeCol, { ascending: true });
            return r as PostgrestResponse<AttendanceRow>;
          }
        );

        const { data, error } = resp;
        if (error) {
          return { rows: [] as AttendanceRow[], err: true, error };
        }
        return { rows: (data ?? []) as AttendanceRow[], err: false, error: null };
      } catch (e) {
        if (isSupabaseTransientError(e)) {
          return { rows: [] as AttendanceRow[], err: true, error: e };
        }
        throw e;
      }
    }

    // 1) intentamos con created_at
    const primary = await safeSelect('created_at');

    if (primary.err) {
      const err = primary.error as any;

      // si el esquema no tiene created_at indexable (o error 42703: columna no existe), probamos con taken_at
      if (err && (err.code === '42703' || /column .* does not exist/i.test(String(err.message ?? '')))) {
        const fallback = await safeSelect('taken_at');

        if (fallback.err) {
          const fErr = fallback.error as any;
          if (isSupabaseTransientError(fErr)) {
            console.error('[my/attendance] Supabase temporalmente no disponible:', fErr.message);
            return NextResponse.json({ ok: false, error: 'supabase_unavailable' }, { status: 503 });
          }
          console.error('[my/attendance] select error:', fErr);
          return NextResponse.json({ ok: false, error: 'db_error' }, { status: 500 });
        }

        return NextResponse.json(
          buildResponse(fallback.rows, 'taken_at'),
          { status: 200, headers: { 'Cache-Control': 'no-store' } }
        );
      }

      if (isSupabaseTransientError(err)) {
        console.error('[my/attendance] Supabase temporalmente no disponible:', err.message);
        return NextResponse.json({ ok: false, error: 'supabase_unavailable' }, { status: 503 });
      }

      console.error('[my/attendance] select error:', err);
      return NextResponse.json({ ok: false, error: 'db_error' }, { status: 500 });
    }

    // 2) OK con created_at
    return NextResponse.json(
      buildResponse(primary.rows, 'created_at'),
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );

  } catch (e: any) {
    if (isSupabaseTransientError(e)) {
      console.error('[my/attendance] Supabase temporalmente no disponible:', e.message);
      return NextResponse.json({ ok: false, error: 'supabase_unavailable' }, { status: 503 });
    }
    console.error('[my/attendance] server_error:', e);
    return NextResponse.json({ ok: false, error: 'server_error', message: e?.message }, { status: 500 });
  }
}

function buildResponse(rows: AttendanceRow[], timeCol: 'taken_at' | 'created_at') {
  const getTime = (r: AttendanceRow) => (r as any)[timeCol] ?? r.created_at;

  const byDay: Record<string, AttendanceRow[]> = {};
  let entradas = 0, salidas = 0;

  for (const r of rows) {
    const t = getTime(r);
    if (!t) continue;

    const day = dayKeyLocal(String(t));
    (byDay[day] ||= []).push(r);

    const nt = normType(r.type);
    if (nt === 'in') entradas++;
    if (nt === 'out') salidas++;
  }

  const days = Object.entries(byDay)
    .map(([date, marks]) => {
      const sorted = [...marks].sort((a, b) =>
        String(getTime(a)).localeCompare(String(getTime(b)))
      );

      let firstIn: string | null = null, lastOut: string | null = null;
      let lunchOut: string | null = null, lunchIn: string | null = null;

      for (const m of sorted) {
        const t = String(getTime(m));
        const nt = normType(m.type);
        if (nt === 'in' && !firstIn) firstIn = t;
        if (nt === 'out') lastOut = t;
        if (nt === 'lunch_out' && !lunchOut) lunchOut = t;
        if (nt === 'lunch_in')  lunchIn  = t;
      }

      let worked = 0, lunchMin = 0;
      if (firstIn && lastOut) {
        const fi = toLocalMinutes(firstIn);
        const lo = toLocalMinutes(lastOut);
        worked = Math.max(0, fi <= lo ? lo - fi : 0);
      }

      if (lunchOut && lunchIn) {
        const lo = toLocalMinutes(lunchOut);
        const li = toLocalMinutes(lunchIn);
        lunchMin = Math.max(0, li - lo);
        worked   = Math.max(0, worked - lunchMin);
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
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const kpis = { dias_con_marca: days.length, entradas, salidas, pct_geocerca_ok: 0 };

  return { ok: true, kpis, days, raw: rows };
}
