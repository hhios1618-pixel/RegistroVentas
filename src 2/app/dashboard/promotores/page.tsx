'use client';
import { useEffect, useMemo, useState } from 'react';

type Grouping = 'day'|'week'|'month';

type SalesRow = {
  id: string;
  created_at: string;
  sale_date: string;
  promoter_name: string;
  origin: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  customer_name: string | null;
  customer_phone: string | null;
};

type Resp = {
  ok: boolean;
  mode: 'mine';
  promoter: string;
  range: { from: string; to: string };
  kpis: { registros: number; items: number; totalBs: number };
  rows: SalesRow[];
};

const fmtBs = (n:number)=>`Bs ${n.toLocaleString('es-BO',{minimumFractionDigits:2, maximumFractionDigits:2})}`;
const fmtInt = (n:number)=>n.toLocaleString('es-BO');
const iso = (d:Date)=>d.toISOString().slice(0,10);
const startOfMonth = (d=new Date())=>new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth   = (d=new Date())=>new Date(d.getFullYear(), d.getMonth()+1, 0);

// Semana ISO simple
const weekNum = (date:Date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((d.getTime()-yearStart.getTime())/86400000)+1)/7);
};
const weekRange = (date:Date) => {
  const d = new Date(date);
  const wday = d.getDay() || 7; // 1..7
  const monday = new Date(d); monday.setDate(d.getDate() - (wday-1));
  const sunday = new Date(monday); sunday.setDate(monday.getDate()+6);
  return {
    start: monday.toLocaleDateString('es-BO',{day:'2-digit',month:'2-digit'}),
    end:   sunday.toLocaleDateString('es-BO',{day:'2-digit',month:'2-digit'})
  };
};

// ✅ parser de fecha local (sin desfase UTC)
const parseLocalISO = (s:string) => {
  const [y,m,d] = s.split('-').map(n=>parseInt(n,10));
  return new Date(y, (m-1), d);
};

export default function MisVentasPromotor() {
  const [from, setFrom] = useState(iso(startOfMonth()));
  const [to, setTo]     = useState(iso(endOfMonth()));
  const [groupBy, setGroupBy] = useState<Grouping>('week');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Resp|null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ from, to }).toString();
      const r = await fetch(`/endpoints/my/promoter-sales?${qs}`, { cache:'no-store' });
      const j: Resp = await r.json();
      if (!j.ok) throw new Error('fetch_error');
      setData(j);
    } catch {
      setData({ ok:true, mode:'mine', promoter:'', range:{from, to}, kpis:{registros:0,items:0,totalBs:0}, rows:[] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(()=>{ load(); /* eslint-disable-next-line */ },[]);

  const grouped = useMemo(()=>{
    const rows = data?.rows || [];
    const g: Record<string,{ key:string; label:string; items:number; total:number }> = {};
    for (const r of rows) {
      const d = new Date(r.sale_date || r.created_at);
      let key='', label='';
      if (groupBy==='day') {
        key = (r.sale_date || r.created_at).slice(0,10);
        label = d.toLocaleDateString('es-BO',{weekday:'short', day:'2-digit', month:'2-digit'});
      } else if (groupBy==='week') {
        const wn = weekNum(d);
        const wr = weekRange(d);
        key = `${d.getFullYear()}-W${wn}`;
        label = `Sem ${wn} (${wr.start} – ${wr.end})`;
      } else {
        key = `${d.getFullYear()}-${d.getMonth()+1}`;
        label = d.toLocaleDateString('es-BO',{year:'2-digit', month:'short'});
      }
      if (!g[key]) g[key] = { key, label, items:0, total:0 };
      g[key].items += Number(r.quantity)||0;
      g[key].total += (Number(r.quantity)*Number(r.unit_price))||0;
    }
    return Object.values(g).sort((a,b)=>a.key.localeCompare(b.key));
  }, [data?.rows, groupBy]);

  // ✅ Comisión mensual corregida
  const commission = useMemo(()=>{
    const rows = data?.rows || [];
    const base = parseLocalISO(from || iso(new Date()));  // mes desde fecha local
    const mStart = iso(startOfMonth(base));
    const mEnd   = iso(endOfMonth(base));

    let totalMonth = 0;
    for (const r of rows) {
      const dstr = (r.sale_date || r.created_at).slice(0,10);
      if (dstr >= mStart && dstr <= mEnd) {
        totalMonth += (Number(r.quantity)||0) * (Number(r.unit_price)||0);
      }
    }
    const rate = 0.15;
    return {
      periodLabel: `${new Date(mStart).toLocaleDateString('es-BO',{day:'2-digit',month:'short'})} – ${new Date(mEnd).toLocaleDateString('es-BO',{day:'2-digit',month:'short',year:'numeric'})}`,
      totalMonth,
      rate,
      commission: totalMonth * rate
    };
  }, [data?.rows, from]);

  return (
    <div className="min-h-screen text-[#C9D1D9]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Mis ventas</h1>
          <p className="text-xs text-[#8B949E]">
            Promotor: <span className="text-white font-medium">{data?.promoter || '—'}</span>
          </p>
        </div>
        <a href="/dashboard/promotores/registro" className="px-3 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-sm">
          + Registrar venta
        </a>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-end mb-4">
        <div>
          <label className="block text-xs text-[#8B949E] mb-1">Desde</label>
          <input type="date" value={from} onChange={e=>setFrom(e.target.value)}
                 className="bg-[#0D1117] border border-[#30363D] rounded px-2 py-1 text-sm"/>
        </div>
        <div>
          <label className="block text-xs text-[#8B949E] mb-1">Hasta</label>
          <input type="date" value={to} onChange={e=>setTo(e.target.value)}
                 className="bg-[#0D1117] border border-[#30363D] rounded px-2 py-1 text-sm"/>
        </div>
        <div>
          <label className="block text-xs text-[#8B949E] mb-1">Agrupar por</label>
          <select value={groupBy} onChange={e=>setGroupBy(e.target.value as Grouping)}
                  className="bg-[#0D1117] border border-[#30363D] rounded px-2 py-1 text-sm">
            <option value="day">Día</option>
            <option value="week">Semana</option>
            <option value="month">Mes</option>
          </select>
        </div>
        <button onClick={load} disabled={loading}
                className="ml-2 px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-sm">
          {loading ? 'Cargando…' : 'Actualizar'}
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <Kpi title="Registros" value={fmtInt(data?.kpis.registros||0)} />
        <Kpi title="Items"     value={fmtInt(data?.kpis.items||0)} />
        <Kpi title="Total (Bs)" value={fmtBs(data?.kpis.totalBs||0)} highlight />
      </div>

      {/* Resumen agrupado */}
      <div className="mb-6 border border-[#30363D] rounded-lg overflow-hidden">
        <div className="px-3 py-2 border-b border-[#30363D] text-sm text-[#8B949E]">
          Resumen por {groupBy==='day'?'día':groupBy==='week'?'semana':'mes'}
        </div>
        {(!data || data.rows.length===0) ? (
          <div className="p-4 text-sm text-[#8B949E]">Sin datos en el rango.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[#8B949E] border-b border-[#30363D]">
                <th className="px-3 py-2">Grupo</th>
                <th className="px-3 py-2 text-right">Items</th>
                <th className="px-3 py-2 text-right">Total Bs</th>
              </tr>
            </thead>
            <tbody>
              {grouped.map(g=>(
                <tr key={g.key} className="border-b border-[#21262D]">
                  <td className="px-3 py-2">{g.label}</td>
                  <td className="px-3 py-2 text-right">{fmtInt(g.items)}</td>
                  <td className="px-3 py-2 text-right text-emerald-400">{fmtBs(g.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Comisión mensual */}
      <div className="mb-6 border border-emerald-700/40 bg-emerald-500/5 rounded-lg overflow-hidden shadow-lg">
        <div className="px-4 py-3 border-b border-emerald-700/40 flex justify-between items-center">
          <span className="text-sm text-emerald-300">Comisión del mes ({commission.periodLabel})</span>
          <span className="text-xs text-[#8B949E]">Esquema 15% plano sobre ventas del mes calendario.</span>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-xs text-[#8B949E] mb-1">Ventas del mes</div>
            <div className="text-lg font-bold text-white">{fmtBs(commission.totalMonth)}</div>
          </div>
          <div>
            <div className="text-xs text-[#8B949E] mb-1">Porcentaje</div>
            <div className="text-lg font-bold text-emerald-400">{(commission.rate*100).toFixed(0)}%</div>
          </div>
          <div>
            <div className="text-xs text-[#8B949E] mb-1">Comisión estimada</div>
            <div className="text-lg font-bold text-emerald-400">{fmtBs(commission.commission)}</div>
          </div>
        </div>
      </div>

      {/* Detalle */}
      <div className="border border-[#30363D] rounded-lg overflow-hidden">
        <div className="px-3 py-2 border-b border-[#30363D] text-sm text-[#8B949E]">
          Detalle de transacciones ({fmtInt(data?.rows.length||0)} registros)
        </div>
        {(!data || data.rows.length===0) ? (
          <div className="p-4 text-sm text-[#8B949E]">—</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
              <tr className="text-left text-[#8B949E] border-b border-[#30363D]">
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2">Producto</th>
                <th className="px-3 py-2">Origen</th>
                <th className="px-3 py-2 text-right">Cant.</th>
                <th className="px-3 py-2 text-right">P. Unit.</th>
                <th className="px-3 py-2">Cliente</th>
                <th className="px-3 py-2 text-right">Total</th>
              </tr>
              </thead>
              <tbody>
              {data.rows.slice(0,200).map(r=>{
                const total = Number(r.quantity)*Number(r.unit_price);
                return (
                  <tr key={r.id} className="border-b border-[#21262D]">
                    <td className="px-3 py-2">{(r.sale_date||r.created_at).slice(0,10)}</td>
                    <td className="px-3 py-2">{r.product_name}</td>
                    <td className="px-3 py-2 uppercase text-[#8B949E]">{r.origin}</td>
                    <td className="px-3 py-2 text-right">{fmtInt(Number(r.quantity)||0)}</td>
                    <td className="px-3 py-2 text-right">{fmtBs(Number(r.unit_price)||0)}</td>
                    <td className="px-3 py-2">{r.customer_name || '—'}</td>
                    <td className="px-3 py-2 text-right text-emerald-400">{fmtBs(total)}</td>
                  </tr>
                );
              })}
              </tbody>
            </table>
            {data.rows.length>200 && (
              <div className="px-3 py-2 text-center text-xs text-[#8B949E] border-t border-[#30363D]">
                Mostrando 200 de {fmtInt(data.rows.length)}.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({ title, value, highlight=false }:{title:string; value:string; highlight?:boolean}) {
  return (
    <div className={`rounded-lg border ${highlight ? 'border-emerald-700/40 bg-emerald-500/10' : 'border-[#30363D] bg-[#161B22]'}`}>
      <div className="px-4 py-3">
        <div className="text-xs text-[#8B949E] mb-1">{title}</div>
        <div className={`text-lg font-bold ${highlight ? 'text-emerald-400' : 'text-white'}`}>{value}</div>
      </div>
    </div>
  );
}