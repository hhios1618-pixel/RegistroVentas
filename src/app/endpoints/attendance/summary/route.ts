// src/app/endpoints/attendance/summary/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin, withSupabaseRetry, isSupabaseTransientError } from '@/lib/supabase';
import { normalizeRole } from '@/lib/auth/roles';

/* ───── Types ───── */
type AttendanceRow = {
  id: string;
  created_at: string;
  type?: string | null;
  person_id: string;
  site_id?: string | null;
};

type PersonRow = {
  id: string;
  full_name: string | null;
  local: string | null;
  site_id: string | null;
  role: string | null;
  fenix_role: string | null;
  active: boolean | null;
};

type SiteRow = { id: string; name: string | null };

type RetryResult<T> = { data: T | null; error: { message: string } | null };

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/* ───── Constantes de horario local ───── */
const TZ = "America/La_Paz";           // GMT-4 fijo
const TZ_OFFSET_MINUTES = -4 * 60;

const formatOffset = (minutes: number) => {
  const sign = minutes >= 0 ? '+' : '-';
  const abs = Math.abs(minutes);
  const hh = String(Math.floor(abs / 60)).padStart(2, '0');
  const mm = String(abs % 60).padStart(2, '0');
  return `${sign}${hh}:${mm}`;
};
const OFFSET_ISO = formatOffset(TZ_OFFSET_MINUTES);

const toUtcBoundary = (day: string, endOfDay: boolean) =>
  new Date(`${day}${endOfDay ? 'T23:59:59.999' : 'T00:00:00.000'}${OFFSET_ISO}`).toISOString();

const dayKeyLocal = (d: Date) => {
  const y  = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric" }).format(d);
  const mo = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, month: "2-digit" }).format(d);
  const da = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, day: "2-digit" }).format(d);
  return `${y}-${mo}-${da}`;
};
const isSundayLocal = (d: Date) =>
  new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" }).format(d).startsWith("Sun");

const toLocalMinutes = (iso: string) => {
  const d = new Date(iso);
  const hh = Number(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hour12: false }).format(d));
  const mm = Number(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, minute: "2-digit" }).format(d));
  return hh * 60 + mm;
};
const mm = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const norm = (s?: string | null) =>
  (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

const canonicalSite = (raw?: string | null): string | null => {
  const n = norm(raw);
  if (!n) return null;
  if (n.includes("magdalena 2140") || n.includes("santa cruz")) return "Santa Cruz";
  if (n.includes("calle santa lucia") || n.includes("sucre")) return "Sucre";
  if (n.includes("cochabamba")) return "Cochabamba";
  if (n.includes("la paz")) return "La Paz";
  if (n.includes("el alto")) return "El Alto";
  return raw ?? null;
};
const normType = (t?: string | null) => {
  const v = (t || "").toLowerCase().trim();
  if (v === "in" || v === "entrada") return "in";
  if (v === "out" || v === "salida") return "out";
  if (v === "lunch_out") return "lunch_out";
  if (v === "lunch_in") return "lunch_in";
  return "";
};

// Roles visibles en la vista (asesor/venedor + coordinador/líder/supervisor)
const isAllowedRole = (raw?: string | null): boolean => {
  const normalized = normalizeRole(raw);
  if (normalized === 'asesor' || normalized === 'coordinador' || normalized === 'lider') return true;
  const up = String(raw ?? '').toUpperCase();
  return (
    up.includes('ASESOR') || up.includes('VENDEDOR') ||
    up.includes('COORDINAD') || up.includes('LIDER') || up.includes('SUPERVISOR')
  );
};

export async function GET(req: Request) {
  try {
    const supabase = supabaseAdmin();
    const { searchParams } = new URL(req.url);

    const start = searchParams.get("start");
    const end   = searchParams.get("end");
    const site  = searchParams.get("site_id");
    const q     = (searchParams.get("q") || "").toLowerCase();

    if (!start || !end) {
      return NextResponse.json({ error: "missing_date_range" }, { status: 400 });
    }

    const startUtc = toUtcBoundary(start, false);
    const endUtc   = toUtcBoundary(end, true);

    // ── attendance
    const attRes = await withSupabaseRetry(async () => {
      let query = supabase
        .from("attendance")
        .select("id, created_at, type, person_id, site_id")
        .gte("created_at", startUtc)
        .lte("created_at", endUtc)
        .order("created_at", { ascending: true });
      if (site) query = query.eq("site_id", site);
      return await query;
    }) as RetryResult<AttendanceRow[]>;

    if (attRes.error) {
      console.error("[summary] attendance error:", attRes.error);
      return NextResponse.json({ error: attRes.error.message }, { status: 500 });
    }
    const attRows: AttendanceRow[] = attRes.data ?? [];

    // ── people (catálogo)
    const pplRes = await withSupabaseRetry(async () => {
      let query = supabase
        .from('people')
        .select('id, full_name, local, site_id, role, fenix_role, active')
        .eq('active', true);
      if (site) query = query.eq('site_id', site);
      if (q) query = query.ilike('full_name', `%${q}%`);
      return await query;
    }) as RetryResult<PersonRow[]>;

    if (pplRes.error) {
      console.error("[summary] people error:", pplRes.error);
      return NextResponse.json({ error: "people_join_failed" }, { status: 500 });
    }
    const people = (pplRes.data ?? []) as PersonRow[];

    // ── conteo de marcas por persona en el rango
    const marksByPerson = new Map<string, number>();
    for (const mark of attRows) {
      marksByPerson.set(mark.person_id, (marksByPerson.get(mark.person_id) ?? 0) + 1);
    }

    // ── SOLO roles permitidos que SÍ tienen marcas en el rango
    const peopleFiltered = people.filter((p) => {
      const rawRole = p.fenix_role || p.role;
      if (!isAllowedRole(rawRole)) return false;
      if (!marksByPerson.get(p.id)) return false; // sin marcas ⇒ fuera
      if (p.active === false) return false;

      if (site) {
        const assignedMatches = p.site_id === site;
        const hasMarksInSite = attRows.some(r => r.person_id === p.id && r.site_id === site);
        if (!assignedMatches && !hasMarksInSite) return false;
      }
      if (q && !(p.full_name || '').toLowerCase().includes(q)) return false;
      return true;
    });

    const pMap = new Map<string, { name: string; local: string | null; site_id: string | null; role: string | null }>(
      peopleFiltered.map((p) => [
        p.id,
        { name: p.full_name || "", local: p.local, site_id: p.site_id, role: p.fenix_role ?? p.role },
      ])
    );

    // ── sites (guardar NOMBRE CANÓNICO para evitar duplicados/variantes)
    const siteIds = Array.from(
      new Set<string>([
        ...attRows.map(r => r.site_id || '').filter(Boolean) as string[],
        ...peopleFiltered.map(p => p.site_id || '').filter(Boolean) as string[],
      ])
    );
    let siteNameById = new Map<string, string>();
    if (siteIds.length) {
      const siteRes = await withSupabaseRetry(async () =>
        await supabase.from("sites").select("id, name").in("id", siteIds)
      ) as RetryResult<SiteRow[]>;

      if (siteRes.error) {
        console.error("[summary] sites error:", siteRes.error);
        return NextResponse.json({ error: "sites_join_failed" }, { status: 500 });
      }
      siteNameById = new Map<string, string>(
        (siteRes.data ?? []).map((s) => [s.id, canonicalSite(s.name) ?? "Sin sucursal"])
      );
    }

    // ── días hábiles (sin domingos)
    const startAnchor = new Date(`${start}T12:00:00.000Z`);
    const endAnchor   = new Date(`${end}T12:00:00.000Z`);
    const days: string[] = [];
    for (let t = startAnchor.getTime(); t <= endAnchor.getTime(); t += 86400000) {
      const d = new Date(t);
      if (!isSundayLocal(d)) days.push(dayKeyLocal(d));
    }

    // ── agrupar marcas por persona/día (solo personas filtradas)
    const byPersonDay = new Map<string, Map<string, AttendanceRow[]>>();
    for (const r of attRows) {
      if (!pMap.has(r.person_id)) continue; // fuera no-permitidos
      const d = new Date(r.created_at);
      if (isSundayLocal(d)) continue;
      const key = dayKeyLocal(d);
      if (!byPersonDay.has(r.person_id)) byPersonDay.set(r.person_id, new Map());
      const m = byPersonDay.get(r.person_id)!;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(r);
    }

    const EXPECTED_MIN = 10 * 60;
    const SCHED_START  = mm("08:30");
    const SCHED_END    = mm("18:30");

    const rows: any[] = [];

    for (const [pid, meta] of pMap.entries()) {
      const { name: pname, local, site_id } = meta;

      const assignedSiteName = site_id ? (siteNameById.get(site_id) ?? local ?? null) : local;

      let personWorked = 0, personLate = 0, personEarly = 0, personExpected = 0;

      const perDayMarks = byPersonDay.get(pid) || new Map<string, AttendanceRow[]>();
      for (const d of days) {
        const marks = (perDayMarks.get(d) || []).sort((a, b) => a.created_at.localeCompare(b.created_at));
        const present = marks.length > 0;

        // site predominante del día
        let siteName: string | null = assignedSiteName ?? null;
        let siteOfDayId: string | null = site_id ?? null;

        if (present) {
          const counts = new Map<string, { count: number; display: string; id: string | null }>();
          for (const m of marks) {
            const rawName = m.site_id ? (siteNameById.get(m.site_id) ?? null) : null;
            const canon   = canonicalSite(rawName);
            if (!canon) continue;
            const display = rawName || assignedSiteName || 'Sin sucursal';
            const current = counts.get(canon);
            if (current) current.count += 1;
            else counts.set(canon, { count: 1, display, id: m.site_id ?? null });
          }
          if (counts.size) {
            const top = Array.from(counts.values()).sort((a, b) => b.count - a.count)[0];
            siteName = top.display;
            siteOfDayId = top.id ?? siteOfDayId;
          }
        }
        if (!siteName) siteName = assignedSiteName || 'Sin sucursal';

        // tiempos
        const firstAny = marks[0] ?? null;
        const lastAny  = marks.length ? marks[marks.length - 1] : null;
        const inTyped  = marks.find(m => normType(m.type) === "in") ?? null;
        const outTyped = [...marks].reverse().find(m => normType(m.type) === "out") ?? null;

        const firstIn = (inTyped ?? firstAny)?.created_at || null;
        const lastOut = (outTyped ?? lastAny)?.created_at || null;

        let worked = 0, late = 0, early = 0;
        if (firstIn && lastOut) worked = Math.max(0, toLocalMinutes(lastOut) - toLocalMinutes(firstIn));
        if (firstIn) {
          const fi = toLocalMinutes(firstIn);
          if (fi > SCHED_START) late = fi - SCHED_START;
        }
        if (lastOut) {
          const lo = toLocalMinutes(lastOut);
          if (lo < SCHED_END) early = SCHED_END - lo;
        }

        personWorked   += worked;
        personLate     += late;
        personEarly    += early;
        personExpected += EXPECTED_MIN;

        rows.push({
          row_type: "day",
          site_id: siteOfDayId,
          site_name: siteName,
          person_id: pid,
          person_name: pname,
          date: d,
          first_in: firstIn,
          last_out: lastOut,
          lunch_in: null,
          lunch_out: null,
          lunch_minutes: null,
          worked_minutes: worked,
          expected_minutes: EXPECTED_MIN,
          late_minutes: late,
          early_leave_minutes: early,
          present,
          compliance_pct: EXPECTED_MIN ? Math.max(0, Math.min(100, Math.round((worked / EXPECTED_MIN) * 100))) : 0,
        });
      }

      rows.push({
        row_type: "person_total",
        site_id: site_id ?? null,
        site_name: assignedSiteName ?? "Sin sucursal",
        person_id: pid,
        person_name: pname,
        worked_minutes: personWorked,
        expected_minutes: personExpected,
        late_minutes: personLate,
        early_leave_minutes: personEarly,
        compliance_pct: personExpected ? Math.round((personWorked / personExpected) * 100) : 0,
      });
    }

    rows.sort((a: any, b: any) => {
      const s = (a.site_name || "").localeCompare(b.site_name || "");
      if (s !== 0) return s;
      const p = (a.person_name || "").localeCompare(b.person_name || "");
      if (p !== 0) return p;
      if (a.row_type !== b.row_type) return a.row_type === "person_total" ? 1 : -1;
      return (a.date || "").localeCompare(b.date || "");
    });

    return NextResponse.json({ data: rows });
  } catch (e: any) {
    if (isSupabaseTransientError(e)) {
      console.error('[summary] Supabase temporalmente no disponible:', e.message);
      return NextResponse.json({ error: 'supabase_unavailable' }, { status: 503 });
    }
    console.error('[summary] fatal:', e);
    return NextResponse.json({ error: e?.message || 'server_error' }, { status: 500 });
  }
}
