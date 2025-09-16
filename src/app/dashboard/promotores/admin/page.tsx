'use client';

import { useEffect, useMemo, useState } from 'react';

/* =========================================================================
   Helpers
   ========================================================================= */
const fmtBs = (n: number) =>
  `Bs ${n.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtInt = (n: number) => n.toLocaleString('es-BO');

const iso = (d: Date) => d.toISOString().slice(0, 10);
const startOfMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth() + 1, 0);

// Función para obtener el número de semana
const getWeekNumber = (date: Date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

// Función para obtener el rango de fechas de una semana
const getWeekRange = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Lunes como primer día
  const monday = new Date(d.setDate(diff));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  return {
    start: monday.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit' }),
    end: sunday.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit' }),
    year: monday.getFullYear()
  };
};

/* =========================================================================
   Tipos de respuesta de nuestros endpoints
   ========================================================================= */
type SalesRow = {
  id: string;
  created_at: string;
  sale_date: string;
  promoter_name: string;
  origin: 'cochabamba' | 'lapaz' | 'elalto' | 'santacruz' | 'sucre' | 'encomienda' | 'tienda';
  product_name: string;
  quantity: number;
  unit_price: number;
  customer_name: string | null;
  customer_phone: string | null;
  warehouse_origin?: string | null;
  district?: string | null;
};

type SummaryResp = {
  range: { from: string; to: string };
  rows: {
    sale_date: string;
    promoter_name: string;
    items: number;
    total_bs: number;
    cochabamba: number;
    lapaz: number;
    elalto: number;
    santacruz: number;
    sucre: number;
    encomienda: number;
    tienda: number;
  }[];
};

type SalesResp = {
  rows: SalesRow[];
  summary: { promoter: string; items: number; total_bs: number }[];
  totalRows: number;
  totalItems: number;
  totalBs: number;
};

type GroupingType = 'day' | 'week' | 'month' | 'promoter' | 'origin';

/* =========================================================================
   Página
   ========================================================================= */
export default function PromotoresResumenPage() {
  const [from, setFrom] = useState(iso(startOfMonth()));
  const [to, setTo] = useState(iso(endOfMonth()));
  const [q, setQ] = useState('');
  const [groupBy, setGroupBy] = useState<GroupingType>('week');
  const [selectedPromoter, setSelectedPromoter] = useState('');
  const [selectedOrigin, setSelectedOrigin] = useState('');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<SummaryResp['rows']>([]);
  const [rows, setRows] = useState<SalesRow[]>([]);

  const load = async () => {
    setLoading(true);

    const qs = new URLSearchParams({ from, to });
    const qs2 = new URLSearchParams({ from, to, q });

    const [r1, r2] = await Promise.allSettled([
      fetch(`/endpoints/promoters/summary?${qs.toString()}`, { cache: 'no-store' }),
      fetch(`/endpoints/promoters/sales?${qs2.toString()}`, { cache: 'no-store' }),
    ]);

    if (r1.status === 'fulfilled' && r1.value.ok) {
      const json: SummaryResp = await r1.value.json();
      setSummary(json.rows || []);
    } else {
      setSummary([]);
    }

    if (r2.status === 'fulfilled' && r2.value.ok) {
      const json: SalesResp = await r2.value.json();
      setRows(json.rows || []);
    } else {
      setRows([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filtros únicos para dropdowns
  const uniquePromoters = useMemo(() => {
    const promoters = [...new Set(rows.map(r => r.promoter_name).filter(Boolean))];
    return promoters.sort();
  }, [rows]);

  const uniqueOrigins = useMemo(() => {
    const origins = [...new Set(rows.map(r => r.origin))];
    return origins.sort();
  }, [rows]);

  // Datos filtrados
  const filteredRows = useMemo(() => {
    let filtered = rows;

    if (selectedPromoter) {
      filtered = filtered.filter(r => r.promoter_name === selectedPromoter);
    }

    if (selectedOrigin) {
      filtered = filtered.filter(r => r.origin === selectedOrigin);
    }

    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      filtered = filtered.filter((r) =>
        (r.promoter_name || '').toLowerCase().includes(needle) ||
        (r.customer_name || '').toLowerCase().includes(needle) ||
        (r.customer_phone || '').toLowerCase().includes(needle) ||
        (r.product_name || '').toLowerCase().includes(needle) ||
        (r.origin || '').toLowerCase().includes(needle)
      );
    }

    return filtered;
  }, [rows, selectedPromoter, selectedOrigin, q]);

  /* ---------------- KPIs ---------------- */
  const kpis = useMemo(() => {
    const totalLines = filteredRows.length;
    const items = filteredRows.reduce((s, r) => s + (Number(r.quantity) || 0), 0);
    const totalBs = filteredRows.reduce((s, r) => s + (Number(r.quantity) * Number(r.unit_price)), 0);

    const byOrigin: Record<string, number> = {};
    for (const r of filteredRows) {
      byOrigin[r.origin] = (byOrigin[r.origin] || 0) + (r.quantity * r.unit_price);
    }

    return { totalLines, items, totalBs, byOrigin };
  }, [filteredRows]);

  /* --------- Agrupaciones inteligentes --------- */
  const groupedData = useMemo(() => {
    const groups: Record<string, {
      key: string;
      label: string;
      items: number;
      totalBs: number;
      rows: SalesRow[];
      promoters: Set<string>;
      origins: Set<string>;
    }> = {};

    for (const row of filteredRows) {
      let groupKey = '';
      let groupLabel = '';

      const saleDate = new Date(row.sale_date || row.created_at);

      switch (groupBy) {
        case 'day':
          groupKey = row.sale_date || row.created_at.split('T')[0];
          groupLabel = saleDate.toLocaleDateString('es-BO', { 
            weekday: 'short', 
            day: '2-digit', 
            month: '2-digit',
            year: '2-digit'
          });
          break;
        case 'week':
          const weekNum = getWeekNumber(saleDate);
          const weekRange = getWeekRange(saleDate);
          groupKey = `${saleDate.getFullYear()}-W${weekNum}`;
          groupLabel = `Sem ${weekNum} (${weekRange.start} - ${weekRange.end})`;
          break;
        case 'month':
          groupKey = `${saleDate.getFullYear()}-${saleDate.getMonth() + 1}`;
          groupLabel = saleDate.toLocaleDateString('es-BO', { year: '2-digit', month: 'short' });
          break;
        case 'promoter':
          groupKey = row.promoter_name || 'Sin promotor';
          groupLabel = row.promoter_name || 'Sin promotor';
          break;
        case 'origin':
          groupKey = row.origin;
          groupLabel = row.origin.toUpperCase();
          break;
      }

      if (!groups[groupKey]) {
        groups[groupKey] = {
          key: groupKey,
          label: groupLabel,
          items: 0,
          totalBs: 0,
          rows: [],
          promoters: new Set(),
          origins: new Set()
        };
      }

      const group = groups[groupKey];
      group.items += row.quantity;
      group.totalBs += row.quantity * row.unit_price;
      group.rows.push(row);
      group.promoters.add(row.promoter_name || 'Sin promotor');
      group.origins.add(row.origin);
    }

    return Object.values(groups).sort((a, b) => {
      if (groupBy === 'promoter' || groupBy === 'origin') {
        return b.totalBs - a.totalBs; // Por valor descendente
      }
      return a.key.localeCompare(b.key); // Por fecha/tiempo ascendente
    });
  }, [filteredRows, groupBy]);

  /* --------- Top promotores (top 10) --------- */
  const topPromoters = useMemo(() => {
    const map: Record<string, { items: number; bs: number }> = {};
    for (const r of filteredRows) {
      const k = r.promoter_name || '—';
      if (!map[k]) map[k] = { items: 0, bs: 0 };
      map[k].items += r.quantity;
      map[k].bs += r.quantity * r.unit_price;
    }
    const arr = Object.entries(map).map(([promoter, v]) => ({ promoter, ...v }));
    arr.sort((a, b) => b.bs - a.bs);
    return arr.slice(0, 10);
  }, [filteredRows]);

  /* ---------------- UI ---------------- */
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header glassmorphism */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-white/10"></div>
        <div className="relative backdrop-blur-xl bg-white/5 border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div>
                <h1 className="text-xl font-semibold text-white">
                  Dashboard Promotores
                </h1>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-white/20 to-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center border border-white/20">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Panel de filtros glassmorphism */}
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-white/10 rounded-lg"></div>
          <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-lg shadow-2xl">
            <div className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1">Desde</label>
                  <input
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="w-full text-xs bg-white/10 backdrop-blur-sm border border-white/20 rounded-md px-2 py-1.5 text-white placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1">Hasta</label>
                  <input
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="w-full text-xs bg-white/10 backdrop-blur-sm border border-white/20 rounded-md px-2 py-1.5 text-white placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1">Agrupar</label>
                  <select
                    value={groupBy}
                    onChange={(e) => setGroupBy(e.target.value as GroupingType)}
                    className="w-full text-xs bg-white/10 backdrop-blur-sm border border-white/20 rounded-md px-2 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30"
                  >
                    <option value="day" className="bg-black">Día</option>
                    <option value="week" className="bg-black">Semana</option>
                    <option value="month" className="bg-black">Mes</option>
                    <option value="promoter" className="bg-black">Promotor</option>
                    <option value="origin" className="bg-black">Origen</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1">Promotor</label>
                  <select
                    value={selectedPromoter}
                    onChange={(e) => setSelectedPromoter(e.target.value)}
                    className="w-full text-xs bg-white/10 backdrop-blur-sm border border-white/20 rounded-md px-2 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30"
                  >
                    <option value="" className="bg-black">Todos</option>
                    {uniquePromoters.map(promoter => (
                      <option key={promoter} value={promoter} className="bg-black">{promoter}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1">Origen</label>
                  <select
                    value={selectedOrigin}
                    onChange={(e) => setSelectedOrigin(e.target.value)}
                    className="w-full text-xs bg-white/10 backdrop-blur-sm border border-white/20 rounded-md px-2 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30"
                  >
                    <option value="" className="bg-black">Todos</option>
                    {uniqueOrigins.map(origin => (
                      <option key={origin} value={origin} className="bg-black">{origin.toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={load}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-white/20 to-white/10 hover:from-white/30 hover:to-white/20 disabled:from-white/5 disabled:to-white/5 backdrop-blur-sm border border-white/20 text-white text-xs font-medium px-3 py-1.5 rounded-md transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-white/30"
                  >
                    {loading ? 'Cargando...' : 'Actualizar'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/70 mb-1">Búsqueda</label>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar por cliente, promotor, origen, producto..."
                  className="w-full text-xs bg-white/10 backdrop-blur-sm border border-white/20 rounded-md px-2 py-1.5 text-white placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30"
                />
              </div>
            </div>
          </div>
        </div>

        {/* KPIs glassmorphism */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard 
            title="Total Registros" 
            value={fmtInt(kpis.totalLines)} 
            gradient="from-blue-500/20 to-cyan-500/20"
            border="border-blue-500/30"
          />
          <KpiCard 
            title="Items Vendidos" 
            value={fmtInt(kpis.items)} 
            gradient="from-green-500/20 to-emerald-500/20"
            border="border-green-500/30"
          />
          <KpiCard 
            title="Ingresos Totales" 
            value={fmtBs(kpis.totalBs)} 
            gradient="from-yellow-500/20 to-orange-500/20"
            border="border-yellow-500/30"
            emphasize
          />
          <OriginCard byOrigin={kpis.byOrigin} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna izquierda - Top Promotores glassmorphism */}
          <div className="lg:col-span-1">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10 rounded-lg"></div>
              <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-lg shadow-2xl">
                <div className="p-4 border-b border-white/10">
                  <h3 className="text-sm font-semibold text-white">Top 10 Promotores</h3>
                </div>
                
                <div className="p-4">
                  {topPromoters.length === 0 ? (
                    <EmptyState />
                  ) : (
                    <div className="space-y-2">
                      {topPromoters.map((p, i) => {
                        const pct = p.bs > 0 ? (p.bs / (topPromoters[0].bs || 1)) * 100 : 0;
                        
                        return (
                          <div key={p.promoter} className="flex items-center justify-between p-2 rounded-md hover:bg-white/5 transition-colors duration-150 border border-white/5">
                            <div className="flex items-center space-x-2 min-w-0 flex-1">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium backdrop-blur-sm border ${
                                i === 0 ? 'bg-gradient-to-r from-yellow-500/30 to-orange-500/30 border-yellow-500/50 text-yellow-200' :
                                i === 1 ? 'bg-gradient-to-r from-gray-400/30 to-gray-500/30 border-gray-400/50 text-gray-200' :
                                i === 2 ? 'bg-gradient-to-r from-orange-500/30 to-red-500/30 border-orange-500/50 text-orange-200' :
                                'bg-white/10 border-white/20 text-white/70'
                              }`}>
                                {i + 1}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-medium text-white truncate">{p.promoter}</div>
                                <div className="text-xs text-white/60">{fmtInt(p.items)} items</div>
                              </div>
                            </div>
                            
                            <div className="text-right ml-2">
                              <div className="text-xs font-semibold text-white">{fmtBs(p.bs)}</div>
                              <div className="w-16 h-1 bg-white/20 rounded-full mt-1 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-1000 ${
                                    i === 0 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' :
                                    i === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-500' :
                                    i === 2 ? 'bg-gradient-to-r from-orange-500 to-red-500' :
                                    'bg-gradient-to-r from-white/40 to-white/60'
                                  }`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Columna derecha - Datos agrupados glassmorphism */}
          <div className="lg:col-span-2">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10 rounded-lg"></div>
              <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-lg shadow-2xl">
                <div className="p-4 border-b border-white/10">
                  <h3 className="text-sm font-semibold text-white">
                    Datos por {groupBy === 'day' ? 'Día' : groupBy === 'week' ? 'Semana' : groupBy === 'month' ? 'Mes' : groupBy === 'promoter' ? 'Promotor' : 'Origen'}
                  </h3>
                </div>
                
                <div className="overflow-x-auto">
                  {loading ? (
                    <div className="p-8 text-center">
                      <div className="inline-flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span className="text-xs text-white/70">Cargando...</span>
                      </div>
                    </div>
                  ) : groupedData.length === 0 ? (
                    <div className="p-8">
                      <EmptyState />
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left text-xs font-medium text-white/70 px-4 py-2">
                            {groupBy === 'day' ? 'Día' : groupBy === 'week' ? 'Semana' : groupBy === 'month' ? 'Mes' : groupBy === 'promoter' ? 'Promotor' : 'Origen'}
                          </th>
                          <th className="text-right text-xs font-medium text-white/70 px-4 py-2">Items</th>
                          <th className="text-right text-xs font-medium text-white/70 px-4 py-2">Total Bs</th>
                          <th className="text-center text-xs font-medium text-white/70 px-4 py-2">Prom.</th>
                          <th className="text-center text-xs font-medium text-white/70 px-4 py-2">Orig.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupedData.map((group, i) => (
                          <tr key={group.key} className="border-b border-white/5 hover:bg-white/5 transition-colors duration-150">
                            <td className="px-4 py-2">
                              <div className="text-xs font-medium text-white">{group.label}</div>
                            </td>
                            <td className="px-4 py-2 text-right text-xs font-mono text-white/80">
                              {fmtInt(group.items)}
                            </td>
                            <td className="px-4 py-2 text-right text-xs font-mono font-semibold text-green-400">
                              {fmtBs(group.totalBs)}
                            </td>
                            <td className="px-4 py-2 text-center">
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                {group.promoters.size}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-center">
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                {group.origins.size}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabla de detalle glassmorphism */}
        <div className="mt-6 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10 rounded-lg"></div>
          <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-lg shadow-2xl">
            <div className="p-4 border-b border-white/10">
              <h3 className="text-sm font-semibold text-white">
                Detalle de Transacciones ({fmtInt(filteredRows.length)} registros)
              </h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left text-xs font-medium text-white/70 px-3 py-2">Fecha</th>
                    <th className="text-left text-xs font-medium text-white/70 px-3 py-2">Promotor</th>
                    <th className="text-left text-xs font-medium text-white/70 px-3 py-2">Origen</th>
                    <th className="text-left text-xs font-medium text-white/70 px-3 py-2">Producto</th>
                    <th className="text-right text-xs font-medium text-white/70 px-3 py-2">Cant.</th>
                    <th className="text-right text-xs font-medium text-white/70 px-3 py-2">P. Unit.</th>
                    <th className="text-right text-xs font-medium text-white/70 px-3 py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && <SkeletonRows />}
                  {!loading && filteredRows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center">
                        <EmptyState />
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    filteredRows.slice(0, 50).map((r) => {
                      const total = r.quantity * r.unit_price;
                      return (
                        <tr key={r.id} className="border-b border-white/5 hover:bg-white/5 transition-colors duration-150">
                          <td className="px-3 py-2 text-xs text-white/70">
                            {new Date(r.sale_date || r.created_at).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit' })}
                          </td>
                          <td className="px-3 py-2 text-xs font-medium text-blue-300">{r.promoter_name}</td>
                          <td className="px-3 py-2">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase">
                              {r.origin}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-xs text-white/80 truncate max-w-xs" title={r.product_name}>
                            {r.product_name}
                          </td>
                          <td className="px-3 py-2 text-right text-xs font-mono text-white/80">{fmtInt(r.quantity)}</td>
                          <td className="px-3 py-2 text-right text-xs font-mono text-white/70">{fmtBs(r.unit_price)}</td>
                          <td className="px-3 py-2 text-right text-xs font-mono font-semibold text-green-400">{fmtBs(total)}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
              
              {!loading && filteredRows.length > 50 && (
                <div className="p-3 text-center border-t border-white/10">
                  <p className="text-xs text-white/60">
                    Mostrando los primeros 50 registros de {fmtInt(filteredRows.length)} total.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ 
  title, 
  value, 
  gradient,
  border,
  emphasize = false 
}: { 
  title: string; 
  value: string; 
  gradient: string;
  border: string;
  emphasize?: boolean;
}) {
  return (
    <div className="relative">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} rounded-lg`}></div>
      <div className={`relative backdrop-blur-xl bg-white/5 border ${border} rounded-lg p-4 shadow-2xl ${emphasize ? 'ring-1 ring-white/20' : ''}`}>
        <div className="text-xs font-medium text-white/70 mb-1">{title}</div>
        <div className={`text-lg font-bold text-white ${emphasize ? 'text-xl' : ''}`}>
          {value}
        </div>
      </div>
    </div>
  );
}

function OriginCard({ byOrigin }: { byOrigin: Record<string, number> }) {
  const total = Object.values(byOrigin).reduce((s, v) => s + v, 0);
  const topOrigin = Object.entries(byOrigin).sort(([,a], [,b]) => b - a)[0];

  return (
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg"></div>
      <div className="relative backdrop-blur-xl bg-white/5 border border-purple-500/30 rounded-lg p-4 shadow-2xl">
        <div className="text-xs font-medium text-white/70 mb-1">Origen Principal</div>
        <div className="text-lg font-bold text-white mb-2">
          {topOrigin ? topOrigin[0].toUpperCase() : '—'}
        </div>
        
        <div className="space-y-1">
          {Object.entries(byOrigin)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([origin, value]) => {
              const pct = total > 0 ? (value / total) * 100 : 0;
              return (
                <div key={origin} className="flex items-center justify-between text-xs">
                  <span className="text-white/80 uppercase font-medium">{origin}</span>
                  <span className="text-white/60">{pct.toFixed(1)}%</span>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-b border-white/5">
          {Array.from({ length: 7 }).map((__, j) => (
            <td key={j} className="px-3 py-2">
              <div className="h-3 bg-white/10 rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-8">
      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
        <svg className="w-6 h-6 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2-2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <h4 className="text-sm font-medium text-white mb-1">Sin datos</h4>
      <p className="text-xs text-white/60">No hay registros que coincidan con los filtros</p>
    </div>
  );
}