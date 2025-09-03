'use client';
import React, { useEffect, useMemo, useState } from 'react';

type Row = {
  id: string;
  created_at: string;
  type: 'in'|'out';
  lat: number;
  lng: number;
  accuracy_m: number;
  device_id: string;
  selfie_path?: string | null;
  person?: { id: string; full_name: string; role?: string|null; local?: string|null };
  site?:   { id: string; name: string };
};

type Site = { id: string; name: string };

const fetcher = (u: string) => fetch(u, { cache: 'no-store' }).then(r => r.json());

function fmtDate(dt: string) {
  const d = new Date(dt);
  return d.toLocaleString();
}

function toCSV(rows: Row[]) {
  const head = [
    "FechaHora","Tipo","Persona","Sucursal","Lat","Lng","Precision(m)","Device","SelfiePath"
  ].join(',');
  const body = rows.map(r => ([
    new Date(r.created_at).toISOString(),
    r.type,
    `"${(r.person?.full_name || '').replaceAll('"','""')}"`,
    `"${(r.site?.name || '').replaceAll('"','""')}"`,
    String(r.lat ?? ''),
    String(r.lng ?? ''),
    String(r.accuracy_m ?? ''),
    `"${(r.device_id || '').replaceAll('"','""')}"`,
    `"${(r.selfie_path || '').replaceAll('"','""')}"`
  ].join(',')));
  return [head, ...body].join('\n');
}

export default function AdminAsistenciaPage() {
  // Filtros
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const [start, setStart] = useState(firstDay.toISOString().slice(0,10));
  const [end, setEnd]     = useState(today.toISOString().slice(0,10));
  const [q, setQ]         = useState('');
  const [siteId, setSiteId] = useState<string>('');

  // Datos
  const [sites, setSites] = useState<Site[]>([]);
  const [rows, setRows]   = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string|null>(null);

  const loadSites = async () => {
    const res = await fetch('/api/sites', { cache: 'no-store' });
    const j = await res.json();
    if (!res.ok) throw new Error(j?.error || 'sites_fetch_failed');
    setSites(j.data as Site[]);
  };

  const load = async () => {
    setLoading(true); setErr(null);
    try {
      const params = new URLSearchParams();
      if (start) params.set('start', start);
      if (end)   params.set('end', end);
      if (q)     params.set('q', q);
      if (siteId) params.set('site_id', siteId);
      const res = await fetch(`/api/attendance?${params.toString()}`, { cache: 'no-store' });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || 'attendance_fetch_failed');
      setRows(j.data as Row[]);
    } catch (e: any) {
      setErr(e?.message || 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSites(); }, []);
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [start, end, siteId]);

  const kpis = useMemo(() => {
    const total = rows.length;
    const ins   = rows.filter(r => r.type === 'in').length;
    const outs  = rows.filter(r => r.type === 'out').length;
    const avgAcc = rows.length ? Math.round(rows.reduce((a,r)=>a+(r.accuracy_m||0),0) / rows.length) : 0;
    return { total, ins, outs, avgAcc };
  }, [rows]);

  const exportCSV = () => {
    const csv = toCSV(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `reporte_asistencia_${start}_a_${end}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ minHeight:'100dvh', background:'#0b1220', color:'#e5e7eb', fontFamily:'-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif' }}>
      <div style={{ maxWidth: 1200, margin:'0 auto', padding:'24px 20px' }}>
        <h1 style={{ marginBottom: 16, fontSize: 24, fontWeight: 800 }}>Dashboard de Asistencia</h1>

        {/* Filtros */}
        <div style={{
          display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px,1fr))', gap:12,
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
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px,1fr))', gap:12, marginBottom:16 }}>
          <div style={{ background:'rgba(17,24,39,0.6)', border:'1px solid #223047', borderRadius:12, padding:14 }}>
            <div style={{ fontSize:12, opacity:.8 }}>Total marcas</div>
            <div style={{ fontSize:24, fontWeight:800 }}>{kpis.total}</div>
          </div>
          <div style={{ background:'rgba(17,24,39,0.6)', border:'1px solid #223047', borderRadius:12, padding:14 }}>
            <div style={{ fontSize:12, opacity:.8 }}>Entradas</div>
            <div style={{ fontSize:24, fontWeight:800 }}>{kpis.ins}</div>
          </div>
          <div style={{ background:'rgba(17,24,39,0.6)', border:'1px solid #223047', borderRadius:12, padding:14 }}>
            <div style={{ fontSize:12, opacity:.8 }}>Salidas</div>
            <div style={{ fontSize:24, fontWeight:800 }}>{kpis.outs}</div>
          </div>
          <div style={{ background:'rgba(17,24,39,0.6)', border:'1px solid #223047', borderRadius:12, padding:14 }}>
            <div style={{ fontSize:12, opacity:.8 }}>Precisión promedio</div>
            <div style={{ fontSize:24, fontWeight:800 }}>±{kpis.avgAcc} m</div>
          </div>
        </div>

        {/* Tabla */}
        <div style={{ overflowX:'auto', border:'1px solid #223047', borderRadius:12 }}>
          <table style={{ width:'100%', borderCollapse:'collapse', minWidth: 900 }}>
            <thead>
              <tr style={{ background:'rgba(17,24,39,0.6)' }}>
                {['Fecha/Hora','Persona','Sucursal','Tipo','Precisión','Lat','Lng','Device','Selfie'].map(h =>
                  <th key={h} style={{ textAlign:'left', padding:'10px 12px', borderBottom:'1px solid #223047', fontWeight:700 }}>{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ padding:16, opacity:.8 }}>Cargando...</td></tr>
              ) : err ? (
                <tr><td colSpan={9} style={{ padding:16, color:'#ef4444' }}>Error: {err}</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={9} style={{ padding:16, opacity:.8 }}>Sin resultados</td></tr>
              ) : rows.map(r => (
                <tr key={r.id} style={{ borderBottom:'1px solid #223047' }}>
                  <td style={{ padding:'10px 12px' }}>{fmtDate(r.created_at)}</td>
                  <td style={{ padding:'10px 12px' }}>{r.person?.full_name || '-'}</td>
                  <td style={{ padding:'10px 12px' }}>{r.site?.name || '-'}</td>
                  <td style={{ padding:'10px 12px', fontWeight:700, color: r.type==='in' ? '#10b981' : '#f87171' }}>
                    {r.type === 'in' ? 'Entrada' : 'Salida'}
                  </td>
                  <td style={{ padding:'10px 12px' }}>±{Math.round(r.accuracy_m || 0)} m</td>
                  <td style={{ padding:'10px 12px' }}>{r.lat?.toFixed(6)}</td>
                  <td style={{ padding:'10px 12px' }}>{r.lng?.toFixed(6)}</td>
                  <td style={{ padding:'10px 12px', opacity:.8 }}>{r.device_id}</td>
                  <td style={{ padding:'10px 12px', opacity:.8 }}>{r.selfie_path ? r.selfie_path : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop:10, fontSize:12, opacity:.7 }}>
          * Selfies quedan en bucket <b>attendance-selfies</b> (mostrar miniaturas requiere signed URL; lo agregamos si lo necesitas).
        </div>
      </div>
    </div>
  );
}