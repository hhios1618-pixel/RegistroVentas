import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabaseClient";

type Mark = {
  id: string;
  created_at: string;
  type?: string | null;
  person_id: string;
  site_id?: string | null;
};

export async function GET(req: Request) {
  const supabase = supabaseService();
  const { searchParams } = new URL(req.url);

  const start = searchParams.get("start");
  const end   = searchParams.get("end");
  const site  = searchParams.get("site_id");
  const q     = (searchParams.get("q") || "").toLowerCase();

  if (!start || !end) {
    return NextResponse.json({ error: "missing_date_range" }, { status: 400 });
  }

  /* ================= Helpers de fecha/TZ ================= */
  const TZ = "America/La_Paz";
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

  /* ================= Normalización de sitio ================= */
  const norm = (s?: string | null) =>
    (s || "")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().trim();

  const canonicalSite = (raw?: string | null): string | null => {
    const n = norm(raw);
    if (!n) return null;
    if (
      n.includes("magdalena 2140") ||
      n.includes("santa cruz")
    ) return "Santa Cruz";
    if (
      n.includes("calle santa lucia") ||
      n === "sucre" ||
      n.includes("sucre")
    ) return "Sucre";
    if (n === "la paz" || n.includes("la paz")) return "La Paz";
    if (n === "el alto" || n.includes("el alto")) return "El Alto";
    return raw ? raw : null;
  };

  /* ================= Pull de datos ================= */
  // Marcas
  let qAtt = supabase
    .from("attendance")
    .select("id, created_at, type, person_id, site_id")
    .gte("created_at", `${start}T00:00:00.000Z`)
    .lte("created_at", `${end}T23:59:59.999Z`)
    .order("created_at", { ascending: true });
  if (site) qAtt = qAtt.eq("site_id", site);
  const { data: attRows, error: attErr } = await qAtt;
  if (attErr) {
    console.error("[summary] attendance error:", attErr);
    return NextResponse.json({ error: attErr.message }, { status: 500 });
  }

  // Personas (incluye local asignado)
  const personIds = Array.from(new Set((attRows ?? []).map(r => r.person_id).filter(Boolean)));
  const { data: people, error: pErr } = await supabase
    .from("people")
    .select("id, full_name, local")
    .or(personIds.length ? `id.in.(${personIds.join(",")})` : "id.not.is.null");
  if (pErr) {
    console.error("[summary] people error:", pErr);
    return NextResponse.json({ error: "people_join_failed" }, { status: 500 });
  }
  // Si hay filtro de nombre, lo aplicamos
  const peopleFiltered = q
    ? (people ?? []).filter(p => (p.full_name || "").toLowerCase().includes(q))
    : (people ?? []);

  const pMap = new Map<string, { name: string; local: string | null }>(
    peopleFiltered.map(p => [p.id as string, { name: (p.full_name || "") as string, local: (p.local ?? null) as any }])
  );

  // Mapa de sites id->name (para cuando las marcas traen site_id)
  const siteIds = Array.from(new Set((attRows ?? []).map(r => r.site_id).filter(Boolean))) as string[];
  let siteNameById = new Map<string, string>();
  if (siteIds.length) {
    const { data: sites, error: sErr } = await supabase
      .from("sites")
      .select("id, name")
      .in("id", siteIds);
    if (sErr) {
      console.error("[summary] sites error:", sErr);
      return NextResponse.json({ error: "sites_join_failed" }, { status: 500 });
    }
    siteNameById = new Map<string, string>((sites ?? []).map(s => [s.id as string, canonicalSite(s.name) ?? (s.name || "Sin sucursal")]));
  }

  /* ================= Días del rango (excluye domingos) ================= */
  const startAnchor = new Date(`${start}T12:00:00.000Z`);
  const endAnchor   = new Date(`${end}T12:00:00.000Z`);
  const days: string[] = [];
  for (let t = startAnchor.getTime(); t <= endAnchor.getTime(); t += 86400000) {
    const d = new Date(t);
    if (!isSundayLocal(d)) days.push(dayKeyLocal(d));
  }

  /* ================= Agrupar marcas por persona/día ================= */
  const normType = (t?: string | null) => {
    const v = (t || "").toLowerCase().trim();
    if (v === "in" || v === "entrada") return "in";
    if (v === "out" || v === "salida") return "out";
    return "";
  };

  const byPersonDay = new Map<string, Map<string, Mark[]>>();
  for (const r of attRows ?? []) {
    if (!pMap.has(r.person_id)) continue; // respeta filtro por nombre
    const d = new Date(r.created_at);
    if (isSundayLocal(d)) continue;
    const key = dayKeyLocal(d);
    if (!byPersonDay.has(r.person_id)) byPersonDay.set(r.person_id, new Map());
    const m = byPersonDay.get(r.person_id)!;
    if (!m.has(key)) m.set(key, []);
    m.get(key)!.push({
      id: r.id,
      created_at: r.created_at,
      type: normType(r.type),
      person_id: r.person_id,
      site_id: r.site_id ?? null
    });
  }

  /* ================= Cálculo filas día y subtotales por persona ================= */
  const EXPECTED_MIN = 10 * 60;         // 08:30–18:30
  const SCHED_START  = mm("08:30");
  const SCHED_END    = mm("18:30");

  const rows: any[] = [];

  for (const [pid, { name: pname, local }] of pMap.entries()) {
    // sucursal asignada (para días SIN marcas)
    const assignedSiteName = canonicalSite(local);

    let personWorked = 0, personLate = 0, personEarly = 0, personExpected = 0;

    const perDayMarks = byPersonDay.get(pid) || new Map<string, Mark[]>();
    for (const d of days) {
      const marks = (perDayMarks.get(d) || []).sort((a,b) => a.created_at.localeCompare(b.created_at));
      const present = marks.length > 0;

      // site del día: si hay marcas, el más frecuente; si no hay, usar asignado
      let siteName: string | null = assignedSiteName ?? null;
      if (present) {
        const counts = new Map<string, number>();
        for (const m of marks) {
          const sname = m.site_id ? (siteNameById.get(m.site_id) ?? null) : null;
          const canon = canonicalSite(sname);
          if (!canon) continue;
          counts.set(canon, (counts.get(canon) ?? 0) + 1);
        }
        if (counts.size) {
          siteName = Array.from(counts.entries()).sort((a,b)=>b[1]-a[1])[0][0];
        }
      }
      if (!siteName) siteName = "Sin sucursal";

      // primera/última
      const firstAny = marks[0] ?? null;
      const lastAny  = marks.length ? marks[marks.length - 1] : null;
      const inTyped  = marks.find(m => m.type === "in") ?? null;
      const outTyped = [...marks].reverse().find(m => m.type === "out") ?? null;

      const firstIn   = (inTyped ?? firstAny)?.created_at || null;
      const lastOut   = (outTyped ?? lastAny)?.created_at || null;

      let worked = 0, late = 0, early = 0;
      if (firstIn && lastOut) {
        worked = Math.max(0, toLocalMinutes(lastOut) - toLocalMinutes(firstIn));
      }
      if (firstIn) {
        const fi = toLocalMinutes(firstIn);
        if (fi > SCHED_START) late = fi - SCHED_START;
      }
      if (lastOut) {
        const lo = toLocalMinutes(lastOut);
        if (lo < SCHED_END) early = SCHED_END - lo;
      }

      // sumar al subtotal persona (solo días hábiles del rango)
      personWorked   += worked;
      personLate     += late;
      personEarly    += early;
      personExpected += EXPECTED_MIN;

      rows.push({
        row_type: "day",
        site_name: siteName,     // 👈 clave para agrupar en el front
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

    // Subtotal por persona (en su sucursal asignada; si no tiene, cae en “Sin sucursal”)
    rows.push({
      row_type: "person_total",
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

  // Orden consistente: por site_name, luego persona, luego fecha
  rows.sort((a, b) => {
    const s = (a.site_name || "").localeCompare(b.site_name || "");
    if (s !== 0) return s;
    const p = (a.person_name || "").localeCompare(b.person_name || "");
    if (p !== 0) return p;
    if (a.row_type !== b.row_type) return a.row_type === "person_total" ? 1 : -1;
    return (a.date || "").localeCompare(b.date || "");
  });

  return NextResponse.json({ data: rows });
}