import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabaseClient";

type Mark = { created_at: string; type?: string | null; person_id: string };

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

  // === TZ helpers ===
  const TZ = "America/La_Paz";

  const dayKeyLocal = (d: Date) => {
    const y = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric" }).format(d);
    const m = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, month: "2-digit" }).format(d);
    const da = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, day: "2-digit" }).format(d);
    return `${y}-${m}-${da}`;
  };
  const isSundayLocal = (d: Date) =>
    new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" })
      .format(d)
      .startsWith("Sun");

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

  // === 1) Attendance plano en rango UTC (incluyente) ===
  let qAtt = supabase
    .from("attendance")
    .select("id, created_at, type, person_id, site_id")
    .gte("created_at", `${start}T00:00:00.000Z`)
    .lte("created_at", `${end}T23:59:59.999Z`)
    .order("created_at", { ascending: true });
  if (site) qAtt = qAtt.eq("site_id", site);

  const { data: attRows, error } = await qAtt;
  if (error) {
    console.error("[summary] attendance error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // === 2) Personas (nombres) ===
  const personIds = Array.from(new Set((attRows ?? []).map(r => r.person_id).filter(Boolean)));
  const { data: people, error: pErr } = await supabase
    .from("people")
    .select("id, full_name")
    .in("id", personIds);
  if (pErr) {
    console.error("[summary] people error:", pErr);
    return NextResponse.json({ error: "people_join_failed" }, { status: 500 });
  }
  const pMap = new Map<string,string>((people ?? []).map(p => [p.id as string, (p.full_name || "") as string]));

  // === 3) Lista de días L–S anclada a 12:00 UTC (evita corrimientos por TZ) ===
  const startAnchor = new Date(`${start}T12:00:00.000Z`);
  const endAnchor   = new Date(`${end}T12:00:00.000Z`);
  const days: string[] = [];
  for (let t = startAnchor.getTime(); t <= endAnchor.getTime(); t += 86400000) {
    const d = new Date(t);
    if (!isSundayLocal(d)) days.push(dayKeyLocal(d));
  }

  // === 4) Agrupar por persona/día (día local) ===
  const normType = (t?: string | null) => {
    const v = (t || "").toLowerCase().trim();
    if (v === "in" || v === "entrada") return "in";
    if (v === "out" || v === "salida") return "out";
    return "";
  };
  const byPersonDay = new Map<string, Map<string, Mark[]>>();

  for (const r of attRows ?? []) {
    const pid = r.person_id;
    if (!pid) continue;
    const d = new Date(r.created_at);
    if (isSundayLocal(d)) continue; // excluye domingo real local
    const key = dayKeyLocal(d);
    if (!byPersonDay.has(pid)) byPersonDay.set(pid, new Map());
    const m = byPersonDay.get(pid)!;
    if (!m.has(key)) m.set(key, []);
    m.get(key)!.push({ created_at: r.created_at, type: normType(r.type), person_id: pid });
  }

  // === 5) Cálculo por persona/día ===
  const EXPECTED_MIN = 10 * 60;         // 08:30–18:30 = 600
  const SCHED_START  = mm("08:30");
  const SCHED_END    = mm("18:30");

  const nameFilter = q
    ? new Set(Array.from(pMap.entries()).filter(([_, n]) => (n || "").toLowerCase().includes(q)).map(([id]) => id))
    : null;

  const persons = Array.from(new Set([...personIds, ...(nameFilter ? Array.from(nameFilter) : [])]));
  const out: any[] = [];

  for (const pid of persons) {
    const pname = pMap.get(pid) || "(sin nombre)";
    if (q && !pname.toLowerCase().includes(q)) continue;

    const perDay = byPersonDay.get(pid) || new Map<string, Mark[]>();

    for (const d of days) {
      const marks = (perDay.get(d) || []).sort((a,b) => a.created_at.localeCompare(b.created_at));
      const present = marks.length > 0;

      // robusto: usamos la primera y última marca del día por timestamp;
      // si hay 'in'/'out' explícitos, los privilegiamos, pero no dependemos de ellos.
      const firstAny = marks[0]?.created_at || null;
      const lastAny  = marks[marks.length - 1]?.created_at || null;
      const inTyped  = marks.find(m => m.type === "in")?.created_at || null;
      const outTyped = marks.slice().reverse().find(m => m.type === "out")?.created_at || null;

      const firstIn = inTyped || firstAny;
      const lastOut = outTyped || lastAny;

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

      out.push({
        person_id: pid,
        person_name: pname,
        date: d,
        first_in: firstIn,
        last_out: lastOut,
        worked_minutes: worked,
        expected_minutes: EXPECTED_MIN,
        late_minutes: late,
        early_leave_minutes: early,
        present,
        compliance_pct: EXPECTED_MIN ? Math.max(0, Math.min(100, Math.round((worked / EXPECTED_MIN) * 100))) : 0,
      });
    }
  }

  out.sort((a,b) => (a.person_name.localeCompare(b.person_name)) || (a.date.localeCompare(b.date)));
  return NextResponse.json({ data: out });
}