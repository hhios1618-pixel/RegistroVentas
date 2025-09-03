'use client';
import React, { useEffect, useMemo, useState } from 'react';

type Row = {
  person_id: string;
  person_name: string;
  date: string; // YYYY-MM-DD
  first_in: string | null;
  last_out: string | null;
  worked_minutes: number;
  expected_minutes: number; // 600
  late_minutes: number;
  early_leave_minutes: number;
  present: boolean;
  compliance_pct: number; // 0..100
};

type Site = { id: string; name: string };

const mmToHhMm = (m: number) => {
  const h = Math.floor(m / 60);
  const mm = Math.round(m % 60);
  return `${h}h ${mm}m`;
};

export default function AsistenciaResumenPage() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

  const [start, setStart] = useState(firstDay.toISOString().slice(0,10));
  const [end, setEnd]     = useState(today.toISOString().slice(0,10));
  const [siteId, setSiteId] = useState<string>('');
  const [q, setQ] = useState('');

  const [sites, setSites] = useState<Site[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string|null>(null);

  useEffect(() => {
    (async () => {
      const r = await fetch('/api/sites', { cache: 'no-store' });
      const j = await r.json();
      if (r.ok) setSites(j.data || []);
    })();
  }, []);

  const load = async () => {
    setLoading(true); setErr(null);
    try {
      const params = new URLSearchParams();
      params.set('start', start);
      params.set('end', end);
      if (siteId) params.set('site_id', siteId);
      if (q) params.set('q', q);
      const r = await fetch(`/api/attendance/summary?${params.toString()}`, { cache:'no-store' });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'summary_fetch_failed');
      setRows(j.data || []);
    } catch (e: any) {
      setErr(e?.message || 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [start, end, siteId]);

  // KPIs globales
  const kpis = useMemo(() => {
    if (!rows.length) return { exp:0, wrk:0, late:0, early:0, comp:0 };
    const exp  = rows.reduce((a,r)=>a+(r.expected_minutes||0),0);
    const wrk  = rows.reduce((a,r)=>a+(r.worked_minutes||0),0);
    const late = rows.reduce((a,r)=>a+(r.late_minutes||0),0);
    const early= rows.reduce((a,r)=>a+(r.early_leave_minutes||0),0);
    const comp = exp ? Math.round((wrk/exp)*100) : 0;
    return { exp, wrk, late, early, comp };
  }, [rows]);

  // Agrupa por persona
  const perPerson = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const r of rows) {
      if (!map.has(r.person_id)) map.set(r.person_id, []);
      map.get(r.person_id)!.push(r);
    }
    // ordenar por fecha dentro de cada persona
    for (const [k, list] of map) list.sort((a,b)=>a.date.localeCompare(b.date));
    return map;
  }, [rows]);

  const exportCSV = () => {
    const head = 'Persona,Fecha,Primer In,Último Out,Trabajado(min),Esperado(min),Cumplimiento(%),Atraso(min),Salida Anticipada(min)';
    const body = rows.map(r => [
      `"${r.person_name.replaceAll('"','""')}"`,
      r.date,
      r.first_in ? new Date(r.first_in).toLocaleString() : '',
      r.last_out ? new Date(r.last_out).toLocaleString() : '',
      r.worked_minutes,
      r.expected_minutes,
      r.compliance_pct,
      r.late_minutes,
      r.early_leave_minutes,
    ].join(','));
    const csv = [head, ...body].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `resumen_asistencia_${start}_a_${end}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ minHeight:'100dvh', background:'#0b1220', color:'#e5e7eb', fontFamily:'-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif' }}>
      <div style={{ maxWidth: 1200, margin:'0 auto', padding:'24px 20px' }}>
        <h1 style={{ marginBottom: 16, fontSize: 24, fontWeight: 800 }}>Resumen de Cumplimiento (L–S 08:30–18:30)</h1>

        {/* Filtros */}
        <div style={{
          display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px,1fr))', gap:12,
          background:'rgba(17,24,39,0.6)', border:'1px solid #223047', borderRadius:12, padding:12, marginBottom:16
        }}>
          <div>
            <label style={{ fontSize:12, opacity:.8 }}>Desde</label>
            <input type="date" value={start} onChange={e=>setStart(e.currentTarget.value)}
              style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid #223047', background:'transparent', color:'#e5e7eb' }} />
          </div>
          <div>
            <label style={{ fontSize:12, opacity:.8 }}>Hasta</label>
            <input type="date" value={end} onChange={e=>setEnd(e.currentTarget.value)}
              style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid #223047', background:'transparent', color:'#e5e7eb' }} />
          </div>
          <div>
            <label style={{ fontSize:12, opacity:.8 }}>Sucursal</label>
            <select value={siteId} onChange={e=>setSiteId(e.currentTarget.value)}
              style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid #223047', background:'transparent', color:'#e5e7eb' }}>
              <option value="">Todas</option>
              {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize:12, opacity:.8 }}>Persona</label>
            <input placeholder="Buscar nombre..." value={q} onChange={e=>setQ(e.currentTarget.value)} onKeyDown={(e)=>{ if(e.key==='Enter') load(); }}
              style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid #223047', background:'transparent', color:'#e5e7eb' }} />
          </div>
          <div style={{ display:'flex', alignItems:'end', gap:8 }}>
            <button onClick={load}
              style={{ padding:'10px 14px', borderRadius:10, border:'1px solid #2a3b55', background:'#133a55', color:'#e5e7eb', fontWeight:700 }}>
              Aplicar filtros
            </button>
            <button onClick={exportCSV}
              style={{ padding:'10px 14px', borderRadius:10, border:'1px solid #2a3b55', background:'#0b5e2e', color:'#e5e7eb', fontWeight:700 }}>
              Exportar CSV
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px,1fr))', gap:12, marginBottom:16 }}>
          <div style={{ background:'rgba(17,24,39,0.6)', border:'1px solid #223047', borderRadius:12, padding:14 }}>
            <div style={{ fontSize:12, opacity:.8 }}>Horas esperadas</div>
            <div style={{ fontSize:22, fontWeight:800 }}>{mmToHhMm(kpis.exp)}</div>
          </div>
          <div style={{ background:'rgba(17,24,39,0.6)', border:'1px solid #223047', borderRadius:12, padding:14 }}>
            <div style={{ fontSize:12, opacity:.8 }}>Horas trabajadas</div>
            <div style={{ fontSize:22, fontWeight:800 }}>{mmToHhMm(kpis.wrk)}</div>
          </div>
          <div style={{ background:'rgba(17,24,39,0.6)', border:'1px solid #223047', borderRadius:12, padding:14 }}>
            <div style={{ fontSize:12, opacity:.8 }}>% Cumplimiento</div>
            <div style={{ fontSize:22, fontWeight:800 }}>{kpis.comp}%</div>
          </div>
          <div style={{ background:'rgba(17,24,39,0.6)', border:'1px solid #223047', borderRadius:12, padding:14 }}>
            <div style={{ fontSize:12, opacity:.8 }}>Atrasos totales</div>
            <div style={{ fontSize:22, fontWeight:800 }}>{mmToHhMm(kpis.late)}</div>
          </div>
          <div style={{ background:'rgba(17,24,39,0.6)', border:'1px solid #223047', borderRadius:12, padding:14 }}>
            <div style={{ fontSize:12, opacity:.8 }}>Salidas anticipadas</div>
            <div style={{ fontSize:22, fontWeight:800 }}>{mmToHhMm(kpis.early)}</div>
          </div>
        </div>

        {/* Tabla por persona/día */}
        <div style={{ overflowX:'auto', border:'1px solid #223047', borderRadius:12 }}>
          <table style={{ width:'100%', borderCollapse:'collapse', minWidth: 1000 }}>
            <thead>
              <tr style={{ background:'rgba(17,24,39,0.6)' }}>
                {['Persona','Fecha','Primer In','Último Out','Trabajado','Esperado','%','Atraso','Salida Ant.','Presente'].map(h =>
                  <th key={h} style={{ textAlign:'left', padding:'10px 12px', borderBottom:'1px solid #223047', fontWeight:700 }}>{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} style={{ padding:16, opacity:.8 }}>Cargando...</td></tr>
              ) : err ? (
                <tr><td colSpan={10} style={{ padding:16, color:'#ef4444' }}>Error: {err}</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={10} style={{ padding:16, opacity:.8 }}>Sin resultados</td></tr>
              ) : rows.map(r => (
                <tr key={`${r.person_id}-${r.date}`} style={{ borderBottom:'1px solid #223047' }}>
                  <td style={{ padding:'10px 12px' }}>{r.person_name}</td>
                  <td style={{ padding:'10px 12px' }}>{r.date}</td>
                  <td style={{ padding:'10px 12px' }}>{r.first_in ? new Date(r.first_in).toLocaleString() : '-'}</td>
                  <td style={{ padding:'10px 12px' }}>{r.last_out ? new Date(r.last_out).toLocaleString() : '-'}</td>
                  <td style={{ padding:'10px 12px' }}>{mmToHhMm(r.worked_minutes)}</td>
                  <td style={{ padding:'10px 12px' }}>{mmToHhMm(r.expected_minutes)}</td>
                  <td style={{ padding:'10px 12px', fontWeight:700, color: r.compliance_pct >= 100 ? '#10b981' : r.compliance_pct >= 80 ? '#eab308' : '#f87171' }}>
                    {r.compliance_pct}%
                  </td>
                  <td style={{ padding:'10px 12px', color: r.late_minutes>0 ? '#f87171' : undefined }}>{mmToHhMm(r.late_minutes)}</td>
                  <td style={{ padding:'10px 12px', color: r.early_leave_minutes>0 ? '#f59e0b' : undefined }}>{mmToHhMm(r.early_leave_minutes)}</td>
                  <td style={{ padding:'10px 12px' }}>{r.present ? '✅' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop:10, fontSize:12, opacity:.7 }}>
          * El cálculo usa TZ <b>America/La_Paz</b>, excluye <b>domingos</b>, y asume turno fijo <b>08:30–18:30</b> (10h).
        </div>
      </div>
    </div>
  );
}