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
      // NOTA: no metemos 'q' aquí para no perder mapeo por persona (igual filtra en UI)
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
        // nos quedamos con el primer nombre no vacío que encontremos
        if (!map.has(pid)) map.set(pid, sname);
      }
    }
    return map;
  }, [marks]);

  // Agrupar rows (summary) por sucursal → persona → días.
  // Si una persona no aparece en personToSiteName, cae en "Sin sucursal".
  const grouped = useMemo(() => {
    // filtro por q (nombre) aquí para que aplique a todas las vistas
    const filterQ = (r: Row) => {
      if (!q) return true;
      return (r.person_name || '').toLowerCase().includes(q.toLowerCase());
    };

    // sucursal → personId → info
    const bySite = new Map<
      string,
      {
        people: Map<
          string,
          {
            person_name: string;
            days: Row[];
            // Subtotales persona
            exp: number;
            wrk: number;
            late: number;
            early: number;
            lunch: number;
            comp: number; // %
          }
        >;
        // Subtotales sucursal
        exp: number;
        wrk: number;
        late: number;
        early: number;
        lunch: number;
        comp: number; // %
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

    // Calculamos subtotales (persona y sucursal)
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

    // Orden por nombre de sitio y por nombre de persona
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
          // FIX #1 (NUEVO): Corregido el ordenamiento por fecha para manejar valores nulos.
          // El ordenamiento por nombre aquí es redundante, ya que todos los días son de la misma persona.
          days: p.days.sort((a, b) => (a.date || '').localeCompare(b.date || '')),
        }))
        .sort((a, b) => (a.person_name || '').localeCompare(b.person_name || ''));

      ordered.push({
        siteName,
        siteTotals: { exp: siteBucket.exp, wrk: siteBucket.wrk, late: siteBucket.late, early: siteBucket.early, lunch: siteBucket.lunch, comp: siteBucket.comp },
        people: peopleArr,
      });
    }

    // Empujar “Sin sucursal” al final
    ordered.sort((a, b) => {
      if (a.siteName === 'Sin sucursal') return 1;
      if (b.siteName === 'Sin sucursal') return -1;
      return a.siteName.localeCompare(b.siteName);
    });

    return ordered;
  }, [rows, personToSiteName, q]);

  // KPIs generales (en base a grouped)
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

  // Export CSV (por sucursal o por persona)
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
          r.date || '', // Asegurar que la fecha no sea nula
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
        r.date || '', // Asegurar que la fecha no sea nula
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

  // estilos base (usa tu Tailwind; estos son inline mínimos para cohesión)
  const card = { background: 'rgba(17,24,39,0.55)', border: '1px solid #223047', borderRadius: 14 } as React.CSSProperties;
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid #223047',
    background: 'rgba(3,7,18,.35)',
    color: '#e5e7eb',
    outline: 'none',
    fontSize: 14,
  };
  const btn = (bg: string, extra?: React.CSSProperties): React.CSSProperties => ({
    padding: '10px 14px',
    borderRadius: 10,
    border: '1px solid #2a3b55',
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: 14,
    background: bg,
    color: '#e5e7eb',
    ...extra,
  });

  return (
    <div
      style={{
        minHeight: '100dvh',
        background:
          'radial-gradient(1200px 400px at -10% -10%, rgba(99,102,241,.12), transparent), radial-gradient(1200px 400px at 110% -10%, rgba(168,85,247,.12), transparent), linear-gradient(135deg,#0b1220,#0f172a 40%, #0a1022)',
        color: '#e5e7eb',
        fontFamily: '-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif',
      }}
    >
      {/* HEADER */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          backdropFilter: 'blur(10px)',
          background: 'rgba(10,16,34,.65)',
          borderBottom: '1px solid rgba(148,163,184,.12)',
        }}
      >
        <div style={{ maxWidth: 'min(1800px, 96vw)', margin: '0 auto', padding: '14px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                display: 'grid',
                placeItems: 'center',
                fontWeight: 800,
                color: '#fff',
              }}
            >
              R
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 20 }}>Resumen de Asistencia (Gerencial)</div>
              <div style={{ color: '#94a3b8', fontSize: 12 }}>L–S 08:30–18:30 (10h) — TZ America/La_Paz — Sin domingos</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 'min(1800px, 96vw)', margin: '0 auto', padding: '18px 12px 28px' }}>
        {/* FILTROS */}
        <div
          style={{
            ...card,
            display: 'grid',
            gridTemplateColumns: 'repeat(12, 1fr)',
            gap: 10,
            padding: 12,
            marginBottom: 16,
          }}
        >
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ fontSize: 12, opacity: 0.8 }}>Desde</label>
            <input type="date" value={start} onChange={(e) => setStart(e.currentTarget.value)} style={inputStyle} />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ fontSize: 12, opacity: 0.8 }}>Hasta</label>
            <input type="date" value={end} onChange={(e) => setEnd(e.currentTarget.value)} style={inputStyle} />
          </div>
          <div style={{ gridColumn: 'span 3' }}>
            <label style={{ fontSize: 12, opacity: 0.8 }}>Sucursal (filtro opcional)</label>
            <select value={siteIdFilter} onChange={(e) => setSiteIdFilter(e.currentTarget.value)} style={inputStyle}>
              <option value="">Todas</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ gridColumn: 'span 3' }}>
            <label style={{ fontSize: 12, opacity: 0.8 }}>Persona</label>
            <input
              placeholder="Buscar nombre…"
              value={q}
              onChange={(e) => setQ(e.currentTarget.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              style={inputStyle}
            />
          </div>
          <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'end', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={load} style={btn('#133a55')}>Aplicar</button>
            <button onClick={expandAllSites} style={btn('#0b5e2e')}>Expandir todo</button>
            <button onClick={collapseAllSites} style={btn('#5e0b0b')}>Contraer todo</button>
          </div>
        </div>

        {/* KPIs GLOBALES */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 16 }}>
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
          <div style={{ ...card, padding: 16, marginTop: 12 }}>Cargando…</div>
        ) : err ? (
          <div style={{ ...card, padding: 16, marginTop: 12, color: '#ef4444' }}>Error: {err}</div>
        ) : grouped.length === 0 ? (
          <div style={{ ...card, padding: 16, marginTop: 12, opacity: 0.85 }}>Sin resultados</div>
        ) : (
          <div style={{ display: 'grid', gap: 14 }}>
            {grouped.map((g) => {
              const open = !!openSites[g.siteName];
              return (
                <div key={g.siteName} style={{ ...card, padding: 14 }}>
                  {/* CABECERA SUCURSAL */}
                  <div
                    onClick={() => toggleSite(g.siteName)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)',
                        display: 'grid', placeItems: 'center', fontWeight: 800
                      }}>
                        {g.siteName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 800 }}>{g.siteName} <span style={{ opacity: .7, fontWeight: 600 }}>({g.people.length} personas)</span></div>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>
                          Esperadas: <b>{mmOrDash(g.siteTotals.exp)}</b> ·
                          Trabajadas: <b>{mmOrDash(g.siteTotals.wrk)}</b> ·
                          Cumpl.: <b style={{ color: g.siteTotals.comp >= 100 ? '#10b981' : g.siteTotals.comp >= 80 ? '#eab308' : '#f87171' }}>{g.siteTotals.comp}%</b> ·
                          Atraso: <b>{mmOrDash(g.siteTotals.late)}</b> ·
                          Salida ant.: <b>{mmOrDash(g.siteTotals.early)}</b>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button onClick={(e) => { e.stopPropagation(); exportCSVForSite(g.siteName); }} style={btn('#0b5e2e')}>Exportar CSV</button>
                      <div style={{
                        width: 30, height: 30, borderRadius: 8, border: '1px solid #2a3b55',
                        display: 'grid', placeItems: 'center', fontWeight: 800
                      }}>{open ? '–' : '+'}</div>
                    </div>
                  </div>

                  {/* LISTA PERSONAS */}
                  {open && (
                    <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                      {g.people.map((p) => {
                        const key = `${g.siteName}::${p.person_id}`;
                        const openP = !!openPersons[key];
                        const compColor = p.totals.comp >= 100 ? '#10b981' : p.totals.comp >= 80 ? '#eab308' : '#f87171';

                        return (
                          <div key={key} style={{ border: '1px solid #223047', borderRadius: 12 }}>
                            {/* CABECERA PERSONA */}
                            <div
                              onClick={() => togglePerson(g.siteName, p.person_id)}
                              style={{
                                padding: '10px 12px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                cursor: 'pointer',
                                background: 'rgba(2,6,23,.22)',
                                borderTopLeftRadius: 12,
                                borderTopRightRadius: 12,
                              }}
                            >
                              <div>
                                <div style={{ fontWeight: 700 }}>{p.person_name || 'Sin Nombre'}</div>
                                <div style={{ fontSize: 12, color: '#94a3b8' }}>
                                  Esperadas: <b>{mmOrDash(p.totals.exp)}</b> ·
                                  Trabajadas: <b>{mmOrDash(p.totals.wrk)}</b> ·
                                  Cumpl.: <b style={{ color: compColor }}>{p.totals.comp}%</b> ·
                                  Atraso: <b>{mmOrDash(p.totals.late)}</b> ·
                                  Salida ant.: <b>{mmOrDash(p.totals.early)}</b>
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <button
                                  onClick={(e) => { e.stopPropagation(); exportCSVForPerson(g.siteName, p.person_name, p.days); }}
                                  style={btn('#133a55')}
                                >
                                  CSV
                                </button>
                                <div style={{
                                  width: 26, height: 26, borderRadius: 8, border: '1px solid #2a3b55',
                                  display: 'grid', placeItems: 'center', fontWeight: 800
                                }}>{openP ? '–' : '+'}</div>
                              </div>
                            </div>

                            {/* DÍAS PERSONA */}
                            {openP && (
                              <div style={{ padding: 10 }}>
                                <div style={{ overflowX: 'auto' }}>
                                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
                                    <thead>
                                      <tr style={{ background: 'rgba(17,24,39,0.6)' }}>
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
                                          <th key={h} style={thStyle}>{h}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {p.days.length === 0 ? (
                                        <tr>
                                          <td colSpan={12} style={{ padding: 12, opacity: .8 }}>Sin marcas</td>
                                        </tr>
                                      ) : (
                                        p.days.map((r, i) => (
                                          <tr key={`${r.person_id}-${r.date}`} style={{ borderBottom: '1px solid #223047', background: i % 2 ? 'rgba(2,6,23,.14)' : 'transparent' }}>
                                            <td style={tdStyle}>{r.date}</td>
                                            <td style={tdStyle}>{fmtDT(r.first_in)}</td>
                                            <td style={tdStyle}>{fmtDT(r.lunch_in ?? null)}</td>
                                            <td style={tdStyle}>{fmtDT(r.lunch_out ?? null)}</td>
                                            <td style={tdStyle}>{fmtDT(r.last_out)}</td>
                                            <td style={{ ...tdStyle, color: isFiniteNum(r.lunch_minutes) && r.lunch_minutes > 0 ? '#22c55e' : undefined }}>
                                              {mmOrDash(r.lunch_minutes)}
                                            </td>
                                            <td style={tdStyle}>{mmOrDash(r.worked_minutes)}</td>
                                            <td style={tdStyle}>{mmOrDash(r.expected_minutes)}</td>
                                            <td style={{ ...tdStyle, fontWeight: 700, color: isFiniteNum(r.compliance_pct) && (r.compliance_pct as number) >= 100 ? '#10b981' : (r.compliance_pct || 0) >= 80 ? '#eab308' : '#f87171' }}>
                                              {isFiniteNum(r.compliance_pct) ? r.compliance_pct : 0}%
                                            </td>
                                            <td style={{ ...tdStyle, color: isFiniteNum(r.late_minutes) && r.late_minutes > 0 ? '#f87171' : undefined }}>
                                              {mmOrDash(r.late_minutes)}
                                            </td>
                                            <td style={{ ...tdStyle, color: isFiniteNum(r.early_leave_minutes) && r.early_leave_minutes > 0 ? '#f59e0b' : undefined }}>
                                              {mmOrDash(r.early_leave_minutes)}
                                            </td>
                                            <td style={tdStyle}>{r.present ? '✅' : '—'}</td>
                                          </tr>
                                        ))
                                      )}
                                      {/* Subtotal persona (fila fuerte) */}
                                      <tr style={{ background: 'rgba(17,24,39,0.6)' }}>
                                        <td style={{ ...tdStyle, fontWeight: 800 }} colSpan={5}>Subtotal {p.person_name || 'Sin Nombre'}</td>
                                        <td style={{ ...tdStyle, fontWeight: 800 }}>{mmOrDash(p.totals.lunch)}</td>
                                        <td style={{ ...tdStyle, fontWeight: 800 }}>{mmOrDash(p.totals.wrk)}</td>
                                        <td style={{ ...tdStyle, fontWeight: 800 }}>{mmOrDash(p.totals.exp)}</td>
                                        <td style={{ ...tdStyle, fontWeight: 800, color: compColor }}>{p.totals.comp}%</td>
                                        <td style={{ ...tdStyle, fontWeight: 800 }}>{mmOrDash(p.totals.late)}</td>
                                        <td style={{ ...tdStyle, fontWeight: 800 }}>{mmOrDash(p.totals.early)}</td>
                                        <td style={tdStyle}></td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {/* Subtotal sucursal (tarjeta compacta) */}
                      <div style={{ marginTop: 6, padding: 10, border: '1px dashed #334155', borderRadius: 10 }}>
                        <div style={{ fontWeight: 800, marginBottom: 4 }}>Total {g.siteName}</div>
                        <div style={{ fontSize: 13, color: '#94a3b8' }}>
                          Esperadas: <b>{mmOrDash(g.siteTotals.exp)}</b> · Trabajadas: <b>{mmOrDash(g.siteTotals.wrk)}</b> ·
                          Cumpl.: <b style={{ color: compColor(g.siteTotals.comp) }}>{g.siteTotals.comp}%</b> ·
                          Atraso: <b>{mmOrDash(g.siteTotals.late)}</b> · Salida ant.: <b>{mmOrDash(g.siteTotals.early)}</b> ·
                          Colación: <b>{mmOrDash(g.siteTotals.lunch)}</b>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
          * Cálculo con TZ <b>America/La_Paz</b>, excluye <b>domingos</b>, turno fijo <b>08:30–18:30</b> (10h). Si existen colaciones, se descuentan de las horas trabajadas.
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   UI helpers
   ============================================================================ */
function Kpi({ title, value, accent }: { title: string; value: string; accent?: string }) {
  return (
    <div style={{ background: 'rgba(17,24,39,0.55)', border: '1px solid #223047', borderRadius: 14, padding: 14 }}>
      <div style={{ fontSize: 12, opacity: 0.8 }}>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: accent }}>{value}</div>
    </div>
  );
}
const compColor = (v: number) => (v >= 100 ? '#10b981' : v >= 80 ? '#eab308' : '#f87171');

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '12px 14px',
  borderBottom: '1px solid #223047',
  fontWeight: 800,
  position: 'sticky',
  top: 0,
  zIndex: 1,
  fontSize: 14,
};
const tdStyle: React.CSSProperties = {
  padding: '12px 14px',
  fontSize: 14,
};