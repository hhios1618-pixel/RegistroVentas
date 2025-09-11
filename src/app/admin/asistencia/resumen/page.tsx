'use client';
import React, { useEffect, useMemo, useState } from 'react';

type Row = {
  person_id: string;
  person_name: string;
  date: string;             // YYYY-MM-DD
  first_in: string | null;
  last_out: string | null;

  // Colación
  lunch_in: string | null;
  lunch_out: string | null;
  lunch_minutes: number | null; // puede venir null/undefined

  worked_minutes: number | null;
  expected_minutes: number | null;
  late_minutes: number | null;
  early_leave_minutes: number | null;
  present: boolean;
  compliance_pct: number | null;
};

type Site = { id: string; name: string };

/* ===== Helpers robustos ===== */
const isFiniteNum = (v: any): v is number => typeof v === 'number' && Number.isFinite(v);

const mmToHhMm = (m: number) => {
  const total = Math.max(0, Math.round(m));
  const h = Math.floor(total / 60);
  const mm = total % 60;
  return `${h}h ${mm}m`;
};

// Muestra “—” si no hay valor o es 0/negativo
const mmOrDash = (m: any) => (!isFiniteNum(m) || m <= 0 ? '—' : mmToHhMm(m));

// Formatea fecha/hora; si viene null/invalid, “—”
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

export default function AsistenciaResumenPage() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

  const [start, setStart] = useState(firstDay.toISOString().slice(0, 10));
  const [end, setEnd] = useState(today.toISOString().slice(0, 10));
  const [siteId, setSiteId] = useState<string>('');
  const [q, setQ] = useState('');

  const [sites, setSites] = useState<Site[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const r = await fetch('/endpoints/sites', { cache: 'no-store' });
      const j = await r.json();
      if (r.ok) setSites(j.data || []);
    })();
  }, []);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const params = new URLSearchParams();
      params.set('start', start);
      params.set('end', end);
      if (siteId) params.set('site_id', siteId);
      if (q) params.set('q', q);

      const r = await fetch(`/endpoints/attendance/summary?${params.toString()}`, { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'summary_fetch_failed');
      setRows(j.data || []);
    } catch (e: any) {
      setErr(e?.message || 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, end, siteId]);

  /* ===== KPIs ===== */
  const kpis = useMemo(() => {
    const safeSum = (sel: (r: Row) => number | null) =>
      rows.reduce((a, r) => (isFiniteNum(sel(r)) ? a + (sel(r) as number) : a), 0);

    const exp = safeSum((r) => r.expected_minutes);
    const wrk = safeSum((r) => r.worked_minutes);
    const late = safeSum((r) => r.late_minutes);
    const early = safeSum((r) => r.early_leave_minutes);
    const lunch = safeSum((r) => r.lunch_minutes);
    const comp = exp ? Math.round((wrk / exp) * 100) : 0;

    return { exp, wrk, late, early, lunch, comp };
  }, [rows]);

  /* ===== Export CSV ===== */
  const exportCSV = () => {
    const head = [
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

    const body = rows.map((r) =>
      [
        `"${r.person_name.replaceAll('"', '""')}"`,
        r.date,
        fmtDT(r.first_in) === '—' ? '' : fmtDT(r.first_in),
        fmtDT(r.lunch_in) === '—' ? '' : fmtDT(r.lunch_in),
        fmtDT(r.lunch_out) === '—' ? '' : fmtDT(r.lunch_out),
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
    a.download = `resumen_asistencia_${start}_a_${end}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  /* ===== UI ===== */
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
      {/* Header */}
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
              <div style={{ fontWeight: 800, fontSize: 20 }}>Dashboard de Asistencia</div>
              <div style={{ color: '#94a3b8', fontSize: 12 }}>L–S 08:30–18:30 (con colación)</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 'min(1800px, 96vw)', margin: '0 auto', padding: '18px 12px 28px' }}>
        {/* Filtros */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(12, 1fr)',
            gap: 10,
            background: 'rgba(17,24,39,0.55)',
            border: '1px solid #223047',
            borderRadius: 14,
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
            <label style={{ fontSize: 12, opacity: 0.8 }}>Sucursal</label>
            <select value={siteId} onChange={(e) => setSiteId(e.currentTarget.value)} style={inputStyle}>
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
          <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'end', gap: 8 }}>
            <button onClick={load} style={btn('primary')}>
              Aplicar filtros
            </button>
            <button onClick={exportCSV} style={btn('success')}>
              Exportar CSV
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 16 }}>
          <Kpi title="Horas esperadas" value={mmOrDash(kpis.exp)} />
          <Kpi title="Horas trabajadas" value={mmOrDash(kpis.wrk)} />
          <Kpi
            title="% Cumplimiento"
            value={`${isFiniteNum(kpis.comp) ? kpis.comp : 0}%`}
            accent={kpis.comp >= 100 ? '#10b981' : kpis.comp >= 80 ? '#eab308' : '#f87171'}
          />
          <Kpi title="Atrasos totales" value={mmOrDash(kpis.late)} />
          <Kpi title="Salidas anticipadas" value={mmOrDash(kpis.early)} />
          <Kpi title="Tiempo en colación" value={mmOrDash(kpis.lunch)} />
        </div>

        {/* Tabla full width */}
        <div style={{ border: '1px solid #223047', borderRadius: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(17,24,39,0.6)' }}>
                {[
                  'Persona',
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
                  <th key={h} style={thStyle}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={13} style={{ padding: 16, opacity: 0.8 }}>
                    Cargando…
                  </td>
                </tr>
              ) : err ? (
                <tr>
                  <td colSpan={13} style={{ padding: 16, color: '#ef4444' }}>
                    Error: {err}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={13} style={{ padding: 16, opacity: 0.8 }}>
                    Sin resultados
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => (
                  <tr key={`${r.person_id}-${r.date}`} style={{ borderBottom: '1px solid #223047', background: i % 2 ? 'rgba(2,6,23,.22)' : 'transparent' }}>
                    <td style={tdStyle}>{r.person_name}</td>
                    <td style={tdStyle}>{r.date}</td>
                    <td style={tdStyle}>{fmtDT(r.first_in)}</td>
                    <td style={tdStyle}>{fmtDT(r.lunch_in)}</td>
                    <td style={tdStyle}>{fmtDT(r.lunch_out)}</td>
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
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
          * Cálculo con TZ <b>America/La_Paz</b>, excluye <b>domingos</b>, turno fijo <b>08:30–18:30</b> (10h). La colación se descuenta del
          trabajado y se muestra explícitamente.
        </div>
      </div>
    </div>
  );
}

/* ===== UI bits ===== */
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

function btn(kind: 'primary' | 'success' = 'primary'): React.CSSProperties {
  const base: React.CSSProperties = {
    padding: '10px 14px',
    borderRadius: 10,
    border: '1px solid #2a3b55',
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: 14,
  };
  if (kind === 'primary') return { ...base, background: '#133a55', color: '#e5e7eb' };
  return { ...base, background: '#0b5e2e', color: '#e5e7eb' };
}

function Kpi({ title, value, accent }: { title: string; value: string; accent?: string }) {
  return (
    <div style={{ background: 'rgba(17,24,39,0.55)', border: '1px solid #223047', borderRadius: 14, padding: 14 }}>
      <div style={{ fontSize: 12, opacity: 0.8 }}>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: accent }}>{value}</div>
    </div>
  );
}

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