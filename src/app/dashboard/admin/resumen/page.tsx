'use client';

import React, { useEffect, useMemo, useState } from 'react';

/* ============================================================================
   TIPOS
   ============================================================================ */
type Row = {
  person_id: string;
  person_name: string;
  date: string;                // YYYY-MM-DD (día local)
  first_in: string | null;
  last_out: string | null;
  worked_minutes: number | null;
  expected_minutes: number | null;
  late_minutes: number | null;
  early_leave_minutes: number | null;
  lunch_in?: string | null;
  lunch_out?: string | null;
  lunch_minutes?: number | null;
  present: boolean;
  compliance_pct: number | null;
};

type Site = { id: string; name: string };
type AttendanceMark = {
  id: string;
  created_at: string;
  type?: string | null;
  lat?: number | null;
  lng?: number | null;
  accuracy_m?: number | null;
  device_id?: string | null;
  selfie_path?: string | null;
  person?: { id: string; full_name?: string | null; role?: string | null; local?: string | null } | null;
  site?: { id: string; name?: string | null } | null;
};

/* ============================================================================
   HELPERS
   ============================================================================ */
const isFiniteNum = (v: any): v is number => typeof v === 'number' && Number.isFinite(v);

const mmToHhMm = (m: number) => {
  const total = Math.max(0, Math.round(m));
  const h = Math.floor(total / 60);
  const mm = total % 60;
  return `${h}h ${mm}m`;
};
const mmOrDash = (m: any) => (!isFiniteNum(m) || m <= 0 ? '—' : mmToHhMm(m));

const fmtDT = (s: string | null) => {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('es-BO', {
    dateStyle: 'short',
    timeStyle: 'short',
    hour12: true,
  }).format(d);
};

const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

/* ============================================================================
   COMPONENTES UI
   ============================================================================ */
const Kpi = ({ title, value, accent }: { title: string; value: string; accent?: string }) => (
  <div className="relative">
    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10 rounded-lg"></div>
    <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-lg p-4 shadow-2xl">
      <div className="text-xs font-medium text-white/70 mb-1">{title}</div>
      <div className={`text-lg font-bold ${accent ? '' : 'text-white'}`} style={accent ? { color: accent } : {}}>
        {value}
      </div>
    </div>
  </div>
);

/* ============================================================================
   PÁGINA
   ============================================================================ */
export default function AsistenciaResumenPage() {
  // Rango por defecto: mes actual
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const [start, setStart] = useState(firstDay.toISOString().slice(0, 10));
  const [end, setEnd] = useState(today.toISOString().slice(0, 10));
  const [siteIdFilter, setSiteIdFilter] = useState<string>(''); // opcional
  const [q, setQ] = useState('');

  const [sites, setSites] = useState<Site[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [marks, setMarks] = useState<AttendanceMark[]>([]); // solo para mapear persona→sucursal
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Estado de acordeones (sucursales y personas)
  const [openSites, setOpenSites] = useState<Record<string, boolean>>({});
  const [openPersons, setOpenPersons] = useState<Record<string, boolean>>({}); // key = siteName::personId

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/endpoints/sites', { cache: 'no-store' });
        const j = await r.json();
        if (r.ok) setSites(j.data || []);
      } catch {}
    })();
  }, []);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      // 1) SUMMARY (por persona y día)
      const p1 = new URLSearchParams();
      p1.set('start', start);
      p1.set('end', end);
      if (siteIdFilter) p1.set('site_id', siteIdFilter);
      if (q) p1.set('q', q);

      const r1 = await fetch(`/endpoints/attendance/summary?${p1.toString()}`, { cache: 'no-store' });
      const j1 = await r1.json();
      if (!r1.ok) throw new Error(j1?.error || 'summary_fetch_failed');

      // 2) ATTENDANCE crudo para mapear persona → sucursal (según marks)
      const p2 = new URLSearchParams();
      p2.set('start', start);
      p2.set('end', end);
      if (siteIdFilter) p2.set('site_id', siteIdFilter);
      const r2 = await fetch(`/endpoints/attendance?${p2.toString()}`, { cache: 'no-store' });
      const j2 = await r2.json();
      if (!r2.ok) throw new Error(j2?.error || 'attendance_fetch_failed');

      setRows(Array.isArray(j1.data) ? j1.data : []);
      setMarks(Array.isArray(j2.data) ? j2.data : []);
    } catch (e: any) {
      setErr(e?.message || 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, end, siteIdFilter]);

  // Mapa persona → sucursal (derivado de ATTENDANCE en el rango)
  const personToSiteName = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of marks) {
      const pid = m.person?.id;
      const sname = (m.site?.name || '').trim();
      if (pid && sname) {
        if (!map.has(pid)) map.set(pid, sname);
      }
    }
    return map;
  }, [marks]);

  // Agrupar rows (summary) por sucursal → persona → días.
  const grouped = useMemo(() => {
    const filterQ = (r: Row) => {
      if (!q) return true;
      return (r.person_name || '').toLowerCase().includes(q.toLowerCase());
    };

    const bySite = new Map<
      string,
      {
        people: Map<
          string,
          {
            person_name: string;
            days: Row[];
            exp: number;
            wrk: number;
            late: number;
            early: number;
            lunch: number;
            comp: number;
          }
        >;
        exp: number;
        wrk: number;
        late: number;
        early: number;
        lunch: number;
        comp: number;
      }
    >();

    for (const r of rows) {
      if (!filterQ(r)) continue;

      const siteName = personToSiteName.get(r.person_id) || 'Sin sucursal';
      if (!bySite.has(siteName)) {
        bySite.set(siteName, {
          people: new Map(),
          exp: 0, wrk: 0, late: 0, early: 0, lunch: 0, comp: 0,
        });
      }
      const siteBucket = bySite.get(siteName)!;

      if (!siteBucket.people.has(r.person_id)) {
        siteBucket.people.set(r.person_id, {
          person_name: r.person_name,
          days: [],
          exp: 0, wrk: 0, late: 0, early: 0, lunch: 0, comp: 0,
        });
      }
      const personBucket = siteBucket.people.get(r.person_id)!;
      personBucket.days.push(r);
    }

    // Calculamos subtotales
    for (const [, siteBucket] of bySite) {
      for (const [, p] of siteBucket.people) {
        const exp = sum(p.days.map((d) => (isFiniteNum(d.expected_minutes) ? (d.expected_minutes as number) : 0)));
        const wrk = sum(p.days.map((d) => (isFiniteNum(d.worked_minutes) ? (d.worked_minutes as number) : 0)));
        const late = sum(p.days.map((d) => (isFiniteNum(d.late_minutes) ? (d.late_minutes as number) : 0)));
        const early = sum(p.days.map((d) => (isFiniteNum(d.early_leave_minutes) ? (d.early_leave_minutes as number) : 0)));
        const lunch = sum(p.days.map((d) => (isFiniteNum(d.lunch_minutes) ? (d.lunch_minutes as number) : 0)));
        const comp = exp ? Math.round((wrk / exp) * 100) : 0;

        p.exp = exp; p.wrk = wrk; p.late = late; p.early = early; p.lunch = lunch; p.comp = comp;

        siteBucket.exp += exp;
        siteBucket.wrk += wrk;
        siteBucket.late += late;
        siteBucket.early += early;
        siteBucket.lunch += lunch;
      }
      siteBucket.comp = siteBucket.exp ? Math.round((siteBucket.wrk / siteBucket.exp) * 100) : 0;
    }

    const ordered: {
      siteName: string;
      siteTotals: { exp: number; wrk: number; late: number; early: number; lunch: number; comp: number };
      people: { person_id: string; person_name: string; totals: { exp: number; wrk: number; late: number; early: number; lunch: number; comp: number }; days: Row[] }[];
    }[] = [];

    for (const [siteName, siteBucket] of bySite) {
      const peopleArr = Array.from(siteBucket.people.entries())
        .map(([pid, p]) => ({
          person_id: pid,
          person_name: p.person_name,
          totals: { exp: p.exp, wrk: p.wrk, late: p.late, early: p.early, lunch: p.lunch, comp: p.comp },
          days: p.days.sort((a, b) => (a.date || '').localeCompare(b.date || '')),
        }))
        .sort((a, b) => (a.person_name || '').localeCompare(b.person_name || ''));

      ordered.push({
        siteName,
        siteTotals: { exp: siteBucket.exp, wrk: siteBucket.wrk, late: siteBucket.late, early: siteBucket.early, lunch: siteBucket.lunch, comp: siteBucket.comp },
        people: peopleArr,
      });
    }

    ordered.sort((a, b) => {
      if (a.siteName === 'Sin sucursal') return 1;
      if (b.siteName === 'Sin sucursal') return -1;
      return a.siteName.localeCompare(b.siteName);
    });

    return ordered;
  }, [rows, personToSiteName, q]);

  // KPIs generales
  const globalKpis = useMemo(() => {
    const exp = sum(grouped.map((g) => g.siteTotals.exp));
    const wrk = sum(grouped.map((g) => g.siteTotals.wrk));
    const late = sum(grouped.map((g) => g.siteTotals.late));
    const early = sum(grouped.map((g) => g.siteTotals.early));
    const lunch = sum(grouped.map((g) => g.siteTotals.lunch));
    const comp = exp ? Math.round((wrk / exp) * 100) : 0;
    return { exp, wrk, late, early, lunch, comp };
  }, [grouped]);

  // Expandir / contraer todo
  const expandAllSites = () => {
    const next: Record<string, boolean> = {};
    for (const g of grouped) next[g.siteName] = true;
    setOpenSites(next);
  };
  const collapseAllSites = () => setOpenSites({});
  const toggleSite = (name: string) => setOpenSites((s) => ({ ...s, [name]: !s[name] }));

  const togglePerson = (siteName: string, pid: string) => {
    const key = `${siteName}::${pid}`;
    setOpenPersons((s) => ({ ...s, [key]: !s[key] }));
  };

  // Export CSV
  const exportCSVForSite = (siteName: string) => {
    const site = grouped.find((g) => g.siteName === siteName);
    if (!site) return;

    const head = [
      'Sucursal',
      'Persona',
      'Fecha',
      'Primer In',
      'Lunch In',
      'Lunch Out',
      'Último Out',
      'Colación (min)',
      'Trabajado (min)',
      'Esperado (min)',
      '% Cumplimiento',
      'Atraso (min)',
      'Salida Ant. (min)',
      'Presente',
    ].join(',');

    const body: string[] = [];
    for (const p of site.people) {
      for (const r of p.days) {
        body.push([
          `"${siteName.replaceAll('"', '""')}"`,
          `"${(p.person_name || '').replaceAll('"', '""')}"`,
          r.date || '',
          fmtDT(r.first_in) === '—' ? '' : fmtDT(r.first_in),
          fmtDT(r.lunch_in ?? null) === '—' ? '' : fmtDT(r.lunch_in ?? null),
          fmtDT(r.lunch_out ?? null) === '—' ? '' : fmtDT(r.lunch_out ?? null),
          fmtDT(r.last_out) === '—' ? '' : fmtDT(r.last_out),
          isFiniteNum(r.lunch_minutes) ? r.lunch_minutes : '',
          isFiniteNum(r.worked_minutes) ? r.worked_minutes : '',
          isFiniteNum(r.expected_minutes) ? r.expected_minutes : '',
          isFiniteNum(r.compliance_pct) ? r.compliance_pct : '',
          isFiniteNum(r.late_minutes) ? r.late_minutes : '',
          isFiniteNum(r.early_leave_minutes) ? r.early_leave_minutes : '',
          r.present ? '1' : '0',
        ].join(','));
      }
    }

    const csv = [head, ...body].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `asistencia_${siteName}_${start}_a_${end}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportCSVForPerson = (siteName: string, personName: string, days: Row[]) => {
    const head = [
      'Sucursal',
      'Persona',
      'Fecha',
      'Primer In',
      'Lunch In',
      'Lunch Out',
      'Último Out',
      'Colación (min)',
      'Trabajado (min)',
      'Esperado (min)',
      '% Cumplimiento',
      'Atraso (min)',
      'Salida Ant. (min)',
      'Presente',
    ].join(',');

    const body = days.map((r) =>
      [
        `"${siteName.replaceAll('"', '""')}"`,
        `"${(personName || '').replaceAll('"', '""')}"`,
        r.date || '',
        fmtDT(r.first_in) === '—' ? '' : fmtDT(r.first_in),
        fmtDT(r.lunch_in ?? null) === '—' ? '' : fmtDT(r.lunch_in ?? null),
        fmtDT(r.lunch_out ?? null) === '—' ? '' : fmtDT(r.lunch_out ?? null),
        fmtDT(r.last_out) === '—' ? '' : fmtDT(r.last_out),
        isFiniteNum(r.lunch_minutes) ? r.lunch_minutes : '',
        isFiniteNum(r.worked_minutes) ? r.worked_minutes : '',
        isFiniteNum(r.expected_minutes) ? r.expected_minutes : '',
        isFiniteNum(r.compliance_pct) ? r.compliance_pct : '',
        isFiniteNum(r.late_minutes) ? r.late_minutes : '',
        isFiniteNum(r.early_leave_minutes) ? r.early_leave_minutes : '',
        r.present ? '1' : '0',
      ].join(',')
    );

    const csv = [head, ...body].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safePersonName = (personName || 'persona').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    a.download = `asistencia_${safePersonName}_${start}_a_${end}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const thStyle = "px-3 py-2 text-left text-xs font-bold text-white/70 uppercase tracking-wider";
  const tdStyle = "px-3 py-2 text-sm text-white/80";

  return (
    <div className="min-h-screen bg-black text-white">
      {/* HEADER */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-white/10"></div>
        <div className="relative backdrop-blur-xl bg-white/5 border-b border-white/10 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-r from-blue-500/30 to-purple-500/30 backdrop-blur-sm border border-blue-500/30 flex items-center justify-center font-bold text-white">
                R
              </div>
              <div>
                <div className="text-xl font-bold text-white">Resumen de Asistencia (Gerencial)</div>
                <div className="text-sm text-white/60">L–S 08:30–18:30 (10h) — TZ America/La_Paz — Sin domingos</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* FILTROS */}
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10 rounded-lg"></div>
          <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-lg p-4 shadow-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <div>
                <label className="block text-xs font-medium text-white/70 mb-1">Desde</label>
                <input 
                  type="date" 
                  value={start} 
                  onChange={(e) => setStart(e.currentTarget.value)} 
                  className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-md text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/70 mb-1">Hasta</label>
                <input 
                  type="date" 
                  value={end} 
                  onChange={(e) => setEnd(e.currentTarget.value)} 
                  className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-md text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/70 mb-1">Sucursal</label>
                <select 
                  value={siteIdFilter} 
                  onChange={(e) => setSiteIdFilter(e.currentTarget.value)} 
                  className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all text-sm"
                >
                  <option value="" className="bg-black">Todas</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id} className="bg-black">
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-white/70 mb-1">Persona</label>
                <input
                  placeholder="Buscar nombre…"
                  value={q}
                  onChange={(e) => setQ(e.currentTarget.value)}
                  onKeyDown={(e) => e.key === 'Enter' && load()}
                  className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-md text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all text-sm"
                />
              </div>
              <div className="flex items-end">
                <button 
                  onClick={load} 
                  className="w-full px-4 py-2 bg-gradient-to-r from-blue-500/30 to-blue-600/30 backdrop-blur-sm border border-blue-500/30 text-white font-semibold rounded-md hover:from-blue-500/40 hover:to-blue-600/40 transition-all text-sm"
                >
                  Aplicar
                </button>
              </div>
              <div className="flex items-end gap-2">
                <button 
                  onClick={expandAllSites} 
                  className="flex-1 px-3 py-2 bg-gradient-to-r from-green-500/30 to-green-600/30 backdrop-blur-sm border border-green-500/30 text-white font-medium rounded-md hover:from-green-500/40 hover:to-green-600/40 transition-all text-xs"
                >
                  Expandir
                </button>
                <button 
                  onClick={collapseAllSites} 
                  className="flex-1 px-3 py-2 bg-gradient-to-r from-red-500/30 to-red-600/30 backdrop-blur-sm border border-red-500/30 text-white font-medium rounded-md hover:from-red-500/40 hover:to-red-600/40 transition-all text-xs"
                >
                  Contraer
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* KPIs GLOBALES */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <Kpi title="Horas esperadas" value={mmOrDash(globalKpis.exp)} />
          <Kpi title="Horas trabajadas" value={mmOrDash(globalKpis.wrk)} />
          <Kpi
            title="% Cumplimiento"
            value={`${isFiniteNum(globalKpis.comp) ? globalKpis.comp : 0}%`}
            accent={globalKpis.comp >= 100 ? '#10b981' : globalKpis.comp >= 80 ? '#eab308' : '#f87171'}
          />
          <Kpi title="Atrasos totales" value={mmOrDash(globalKpis.late)} />
          <Kpi title="Salidas anticipadas" value={mmOrDash(globalKpis.early)} />
          <Kpi title="Tiempo en colación" value={mmOrDash(globalKpis.lunch)} />
        </div>

        {/* CONTENIDO */}
        {loading ? (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10 rounded-lg"></div>
            <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-lg p-6 shadow-2xl">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-2"></div>
                <div className="text-white/70">Cargando…</div>
              </div>
            </div>
          </div>
        ) : err ? (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-lg"></div>
            <div className="relative backdrop-blur-xl bg-white/5 border border-red-500/30 rounded-lg p-6 shadow-2xl">
              <div className="text-red-400">Error: {err}</div>
            </div>
          </div>
        ) : grouped.length === 0 ? (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10 rounded-lg"></div>
            <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-lg p-6 shadow-2xl">
              <div className="text-white/70 text-center">Sin resultados</div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map((g) => {
              const open = !!openSites[g.siteName];
              return (
                <div key={g.siteName} className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10 rounded-lg"></div>
                  <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-lg shadow-2xl">
                    {/* CABECERA SUCURSAL */}
                    <div
                      onClick={() => toggleSite(g.siteName)}
                      className="p-4 cursor-pointer hover:bg-white/5 transition-colors rounded-t-lg"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-500/30 to-pink-500/30 backdrop-blur-sm border border-purple-500/30 flex items-center justify-center font-bold text-white">
                            {g.siteName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-lg font-bold text-white">
                              {g.siteName} <span className="text-white/60 font-medium">({g.people.length} personas)</span>
                            </div>
                            <div className="text-sm text-white/60">
                              Esperadas: <span className="font-semibold text-white">{mmOrDash(g.siteTotals.exp)}</span> ·
                              Trabajadas: <span className="font-semibold text-white">{mmOrDash(g.siteTotals.wrk)}</span> ·
                              Cumpl.: <span className="font-semibold" style={{ color: g.siteTotals.comp >= 100 ? '#10b981' : g.siteTotals.comp >= 80 ? '#eab308' : '#f87171' }}>{g.siteTotals.comp}%</span> ·
                              Atraso: <span className="font-semibold text-white">{mmOrDash(g.siteTotals.late)}</span> ·
                              Salida ant.: <span className="font-semibold text-white">{mmOrDash(g.siteTotals.early)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 items-center">
                          <button 
                            onClick={(e) => { e.stopPropagation(); exportCSVForSite(g.siteName); }} 
                            className="px-3 py-1.5 bg-gradient-to-r from-green-500/30 to-green-600/30 backdrop-blur-sm border border-green-500/30 text-white font-medium rounded-md hover:from-green-500/40 hover:to-green-600/40 transition-all text-sm"
                          >
                            Exportar CSV
                          </button>
                          <div className="w-8 h-8 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg flex items-center justify-center font-bold text-white">
                            {open ? '–' : '+'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* LISTA PERSONAS */}
                    {open && (
                      <div className="p-4 pt-0 space-y-3">
                        {g.people.map((p) => {
                          const key = `${g.siteName}::${p.person_id}`;
                          const openP = !!openPersons[key];
                          const compColor = p.totals.comp >= 100 ? '#10b981' : p.totals.comp >= 80 ? '#eab308' : '#f87171';

                          return (
                            <div key={key} className="border border-white/10 rounded-lg overflow-hidden">
                              {/* CABECERA PERSONA */}
                              <div
                                onClick={() => togglePerson(g.siteName, p.person_id)}
                                className="p-3 cursor-pointer hover:bg-white/5 transition-colors bg-white/5"
                              >
                                <div className="flex justify-between items-center">
                                  <div>
                                    <div className="font-semibold text-white">{p.person_name || 'Sin Nombre'}</div>
                                    <div className="text-sm text-white/60">
                                      Esperadas: <span className="font-medium text-white">{mmOrDash(p.totals.exp)}</span> ·
                                      Trabajadas: <span className="font-medium text-white">{mmOrDash(p.totals.wrk)}</span> ·
                                      Cumpl.: <span className="font-medium" style={{ color: compColor }}>{p.totals.comp}%</span> ·
                                      Atraso: <span className="font-medium text-white">{mmOrDash(p.totals.late)}</span> ·
                                      Salida ant.: <span className="font-medium text-white">{mmOrDash(p.totals.early)}</span>
                                    </div>
                                  </div>
                                  <div className="flex gap-2 items-center">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); exportCSVForPerson(g.siteName, p.person_name, p.days); }}
                                      className="px-2 py-1 bg-gradient-to-r from-blue-500/30 to-blue-600/30 backdrop-blur-sm border border-blue-500/30 text-white font-medium rounded text-xs hover:from-blue-500/40 hover:to-blue-600/40 transition-all"
                                    >
                                      CSV
                                    </button>
                                    <div className="w-6 h-6 bg-white/10 backdrop-blur-sm border border-white/20 rounded flex items-center justify-center font-bold text-white text-sm">
                                      {openP ? '–' : '+'}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* DÍAS PERSONA */}
                              {openP && (
                                <div className="p-3 bg-black/20">
                                  <div className="overflow-x-auto">
                                    <table className="w-full border-collapse min-w-[860px]">
                                      <thead>
                                        <tr className="bg-white/5 border-b border-white/10">
                                          {[
                                            'Fecha',
                                            'Primer In',
                                            'Lunch In',
                                            'Lunch Out',
                                            'Último Out',
                                            'Colación',
                                            'Trabajado',
                                            'Esperado',
                                            '%',
                                            'Atraso',
                                            'Salida Ant.',
                                            'Presente',
                                          ].map((h) => (
                                            <th key={h} className={thStyle}>{h}</th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {p.days.length === 0 ? (
                                          <tr>
                                            <td colSpan={12} className="px-3 py-4 text-center text-white/60">Sin marcas</td>
                                          </tr>
                                        ) : (
                                          p.days.map((r, i) => (
                                            <tr key={`${r.person_id}-${r.date}`} className={`border-b border-white/5 hover:bg-white/5 transition-colors ${i % 2 ? 'bg-white/5' : ''}`}>
                                              <td className={tdStyle}>{r.date}</td>
                                              <td className={tdStyle}>{fmtDT(r.first_in)}</td>
                                              <td className={tdStyle}>{fmtDT(r.lunch_in ?? null)}</td>
                                              <td className={tdStyle}>{fmtDT(r.lunch_out ?? null)}</td>
                                              <td className={tdStyle}>{fmtDT(r.last_out)}</td>
                                              <td className={`${tdStyle} ${isFiniteNum(r.lunch_minutes) && r.lunch_minutes > 0 ? 'text-green-400' : ''}`}>
                                                {mmOrDash(r.lunch_minutes)}
                                              </td>
                                              <td className={tdStyle}>{mmOrDash(r.worked_minutes)}</td>
                                              <td className={tdStyle}>{mmOrDash(r.expected_minutes)}</td>
                                              <td className={`${tdStyle} font-bold`} style={{ color: isFiniteNum(r.compliance_pct) && (r.compliance_pct as number) >= 100 ? '#10b981' : (r.compliance_pct || 0) >= 80 ? '#eab308' : '#f87171' }}>
                                                {isFiniteNum(r.compliance_pct) ? r.compliance_pct : 0}%
                                              </td>
                                              <td className={`${tdStyle} ${isFiniteNum(r.late_minutes) && r.late_minutes > 0 ? 'text-red-400' : ''}`}>
                                                {mmOrDash(r.late_minutes)}
                                              </td>
                                              <td className={`${tdStyle} ${isFiniteNum(r.early_leave_minutes) && r.early_leave_minutes > 0 ? 'text-yellow-400' : ''}`}>
                                                {mmOrDash(r.early_leave_minutes)}
                                              </td>
                                              <td className={tdStyle}>{r.present ? '✅' : '—'}</td>
                                            </tr>
                                          ))
                                        )}
                                        {/* Subtotal persona */}
                                        <tr className="bg-white/10 border-t border-white/20">
                                          <td className={`${tdStyle} font-bold`} colSpan={5}>Subtotal {p.person_name || 'Sin Nombre'}</td>
                                          <td className={`${tdStyle} font-bold`}>{mmOrDash(p.totals.lunch)}</td>
                                          <td className={`${tdStyle} font-bold`}>{mmOrDash(p.totals.wrk)}</td>
                                          <td className={`${tdStyle} font-bold`}>{mmOrDash(p.totals.exp)}</td>
                                          <td className={`${tdStyle} font-bold`} style={{ color: compColor }}>{p.totals.comp}%</td>
                                          <td className={`${tdStyle} font-bold`}>{mmOrDash(p.totals.late)}</td>
                                          <td className={`${tdStyle} font-bold`}>{mmOrDash(p.totals.early)}</td>
                                          <td className={tdStyle}></td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {/* Subtotal sucursal */}
                        <div className="mt-2 p-3 border border-dashed border-white/30 rounded-lg bg-white/5">
                          <div className="font-bold text-white mb-1">Total {g.siteName}</div>
                          <div className="text-sm text-white/70">
                            Esperadas: <span className="font-semibold text-white">{mmOrDash(g.siteTotals.exp)}</span> ·
                            Trabajadas: <span className="font-semibold text-white">{mmOrDash(g.siteTotals.wrk)}</span> ·
                            Cumpl.: <span className="font-semibold" style={{ color: g.siteTotals.comp >= 100 ? '#10b981' : g.siteTotals.comp >= 80 ? '#eab308' : '#f87171' }}>{g.siteTotals.comp}%</span> ·
                            Atraso: <span className="font-semibold text-white">{mmOrDash(g.siteTotals.late)}</span> ·
                            Salida ant.: <span className="font-semibold text-white">{mmOrDash(g.siteTotals.early)}</span> ·
                            Colación: <span className="font-semibold text-white">{mmOrDash(g.siteTotals.lunch)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}