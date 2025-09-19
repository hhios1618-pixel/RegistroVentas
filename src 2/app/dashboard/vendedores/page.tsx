'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, ComposedChart
} from 'recharts';
import {
  Activity, Download, Filter, Search, DollarSign, ShoppingCart,
  Target, Award, Building, Users, ChevronUp, ChevronDown, ChevronsUpDown
} from 'lucide-react';

// ---------------- TIPOS ----------------
interface SellerSummary {
  seller_name: string;
  branch: string;
  total_sales: number;
  orders_count: number;
  ad_spend: number;
  roas: number | null;
}
type SortKey = keyof Omit<SellerSummary, 'seller_name' | 'branch'>;

// ---------------- PALETA ----------------
const COLORS = {
  primary: '#3B82F6',
  secondary: '#10B981',
  accent: '#F59E0B',
  warning: '#EF4444',
  gradients: {
    blue: 'from-blue-500/20 to-cyan-500/20',
    green: 'from-green-500/20 to-emerald-500/20',
    orange: 'from-orange-500/20 to-yellow-500/20',
    purple: 'from-purple-500/20 to-pink-500/20'
  }
};

// ---------------- UI: StatCard ----------------
const StatCard: React.FC<{
  title: string; value: string | number; icon: React.ReactNode;
  gradient: string; border: string; subtitle?: string; trend?: number;
}> = ({ title, value, icon, gradient, border, subtitle, trend }) => (
  <motion.div
    className="relative overflow-hidden"
    whileHover={{ scale: 1.02, y: -4 }}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, ease: 'easeOut' }}
  >
    <div className={`absolute inset-0 bg-gradient-to-br ${gradient} rounded-lg`}></div>
    <div className={`relative backdrop-blur-xl bg-white/5 border ${border} rounded-lg p-6 shadow-2xl`}>
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
          <div className="text-white text-2xl">{icon}</div>
        </div>
        {typeof trend === 'number' && (
          <div className={`px-2 py-1 rounded-full text-xs font-semibold backdrop-blur-sm border
            ${trend >= 0 ? 'bg-green-500/20 text-green-300 border-green-500/30' : 'bg-red-500/20 text-red-300 border-red-500/30'}`}>
            {trend >= 0 ? '+' : ''}{trend.toFixed(1)}%
          </div>
        )}
      </div>
      <p className="text-white/70 text-sm font-medium">{title}</p>
      <p className="text-white text-3xl font-bold tracking-tight">{value}</p>
      {subtitle && <p className="text-white/60 text-xs mt-1">{subtitle}</p>}
    </div>
  </motion.div>
);

// ---------------- UI: ChartContainer ----------------
const ChartContainer: React.FC<{ title: string; children: React.ReactNode; className?: string; fixedHeight?: boolean; }> =
({ title, children, className = '', fixedHeight = true }) => (
  <motion.div
    className={`relative ${className}`}
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, ease: 'easeOut' }}
  >
    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10 rounded-lg"></div>
    <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-lg shadow-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-white/10">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Activity size={20} className="text-blue-400" />
          {title}
        </h3>
      </div>
      <div className="p-6">
        <div className={`w-full ${fixedHeight ? 'h-[400px]' : ''}`}>
          {children}
        </div>
      </div>
    </div>
  </motion.div>
);

// ---------------- UI: Filtros ----------------
const FiltersBar: React.FC<{
  branches: string[];
  selectedBranch: string;
  onBranchChange: (b: string) => void;
  searchTerm: string;
  onSearch: (s: string) => void;
  onClear: () => void;
}> = ({ branches, selectedBranch, onBranchChange, searchTerm, onSearch, onClear }) => (
  <motion.div
    className="relative mb-8"
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
  >
    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10 rounded-lg"></div>
    <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-lg p-6 shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Filter className="text-blue-400" size={24} />
          <h2 className="text-xl font-bold text-white">Filtros</h2>
        </div>
        <button
          onClick={onClear}
          className="px-4 py-2 text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors backdrop-blur-sm border border-white/20"
        >
          Limpiar
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-white/70">Sucursal</label>
          <select
            value={selectedBranch}
            onChange={(e) => onBranchChange(e.target.value)}
            className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all"
          >
            <option value="" className="bg-black">Todas</option>
            {branches.map(b => <option className="bg-black" key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="block text-sm font-semibold text-white/70">Buscar Asesor/Promotor</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
            <input
              type="text"
              placeholder="Escribe un nombre…"
              value={searchTerm}
              onChange={(e) => onSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all"
            />
          </div>
        </div>
      </div>
    </div>
  </motion.div>
);

// ---------------- Tabla Ordenable (dark) ----------------
const SellerSortableTable: React.FC<{ sellers: SellerSummary[] }> = ({ sellers }) => {
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>({
    key: 'total_sales', direction: 'desc'
  });

  const sortedSellers = useMemo(() => {
    const data = [...sellers];
    if (sortConfig) {
      data.sort((a, b) => {
        const aValue = (a[sortConfig.key] ?? -1) as number;
        const bValue = (b[sortConfig.key] ?? -1) as number;
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return data;
  }, [sellers, sortConfig]);

  const requestSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') direction = 'asc';
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (!sortConfig || sortConfig.key !== k) return <ChevronsUpDown className="w-4 h-4 text-white/40 ml-2" />;
    return sortConfig.direction === 'desc'
      ? <ChevronDown className="w-4 h-4 text-blue-300 ml-2" />
      : <ChevronUp className="w-4 h-4 text-blue-300 ml-2" />;
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead className="bg-white/5">
          <tr className="border-b border-white/10">
            <th className="px-6 py-3 text-left text-xs font-bold text-white/70 uppercase">Asesor/Promotor</th>
            <th className="px-6 py-3 text-left text-xs font-bold text-white/70 uppercase">
              <button onClick={() => requestSort('orders_count')} className="flex items-center">Pedidos <SortIcon k="orders_count" /></button>
            </th>
            <th className="px-6 py-3 text-left text-xs font-bold text-white/70 uppercase">
              <button onClick={() => requestSort('total_sales')} className="flex items-center">Ventas Totales <SortIcon k="total_sales" /></button>
            </th>
            <th className="px-6 py-3 text-left text-xs font-bold text-white/70 uppercase">
              <button onClick={() => requestSort('ad_spend')} className="flex items-center">Gasto Ads <SortIcon k="ad_spend" /></button>
            </th>
            <th className="px-6 py-3 text-left text-xs font-bold text-white/70 uppercase">
              <button onClick={() => requestSort('roas')} className="flex items-center">ROAS <SortIcon k="roas" /></button>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {sortedSellers.map((seller) => (
            <tr key={`${seller.seller_name}-${seller.branch}`} className="hover:bg-white/5 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-semibold text-white">{seller.seller_name}</div>
                <div className="text-xs text-white/60">{seller.branch || 'Sin Sucursal'}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-white/80">{seller.orders_count}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-bold text-blue-300">Bs {seller.total_sales.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-rose-300">Bs {seller.ad_spend.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full backdrop-blur-sm border
                  ${seller.roas === null ? 'bg-white/10 text-white/80 border-white/20'
                    : seller.roas >= 3 ? 'bg-green-500/20 text-green-300 border-green-500/30'
                    : seller.roas >= 1 ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                    : 'bg-red-500/20 text-red-300 border-red-500/30'}`}>
                  {seller.roas !== null ? `${seller.roas.toFixed(2)}x` : 'N/A'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ---------------- PAGE ----------------
export default function VendedoresReportPageRedesigned() {
  const [summaryData, setSummaryData] = useState<SellerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [branchFilter, setBranchFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch
  useEffect(() => {
    const fetchSellerData = async () => {
      setLoading(true); setError(null);
      try {
        const response = await fetch('/endpoints/vendedores/reporte');
        if (!response.ok) {
          let msg = 'No se pudieron cargar los datos';
          try { const e = await response.json(); msg = e.error || msg; } catch {}
          throw new Error(msg);
        }
        const data: SellerSummary[] = await response.json();
        setSummaryData(data);
      } catch (err: any) {
        setError(err.message || 'Error inesperado');
      } finally {
        setLoading(false);
      }
    };
    fetchSellerData();
  }, []);

  // Filtros
  const filteredData = useMemo(() => {
    let data = [...summaryData];
    if (branchFilter) data = data.filter(d => (d.branch || '') === branchFilter);
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      data = data.filter(d => d.seller_name.toLowerCase().includes(t));
    }
    return data;
  }, [summaryData, branchFilter, searchTerm]);

  // KPIs y datasets para charts
  const {
    branches, totalsByBranch, totalRevenue, totalOrders, totalAdSpend, avgROAS, avgOrderValue, topSellers, trendMock
  } = useMemo(() => {
    const branchesSet = new Set<string>();
    const byBranch: { [b: string]: { revenue: number; orders: number; ad: number } } = {};
    let revenue = 0, orders = 0, ad = 0;
    const sellersAgg: { [name: string]: { revenue: number; orders: number } } = {};

    filteredData.forEach(r => {
      const b = r.branch || 'Sin Sucursal';
      branchesSet.add(b);
      byBranch[b] = byBranch[b] || { revenue: 0, orders: 0, ad: 0 };
      byBranch[b].revenue += r.total_sales;
      byBranch[b].orders += r.orders_count;
      byBranch[b].ad += r.ad_spend;

      revenue += r.total_sales;
      orders += r.orders_count;
      ad += r.ad_spend;

      sellersAgg[r.seller_name] = sellersAgg[r.seller_name] || { revenue: 0, orders: 0 };
      sellersAgg[r.seller_name].revenue += r.total_sales;
      sellersAgg[r.seller_name].orders += r.orders_count;
    });

    const top = Object.entries(sellersAgg)
      .map(([name, v]) => ({ name, revenue: v.revenue, orders: v.orders, aov: v.revenue / (v.orders || 1) }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const byBranchArray = Object.entries(byBranch)
      .map(([name, v]) => ({ name, revenue: v.revenue, ad_spend: v.ad, orders: v.orders, roas: v.ad > 0 ? v.revenue / v.ad : null }))
      .sort((a, b) => b.revenue - a.revenue);

    const avgROASVal = ad > 0 ? revenue / ad : null;
    const aov = orders > 0 ? revenue / orders : 0;

    // mock de tendencia (usa revenue por branch como base – si necesitas real: agrega fechas al endpoint)
    const trend = byBranchArray.map((x, i) => ({
      label: x.name,
      revenue: x.revenue
    }));

    return {
      branches: Array.from(branchesSet).sort(),
      totalsByBranch: byBranchArray,
      totalRevenue: revenue,
      totalOrders: orders,
      totalAdSpend: ad,
      avgROAS: avgROASVal,
      avgOrderValue: aov,
      topSellers: top,
      trendMock: trend
    };
  }, [filteredData]);

  // Orden fijo de grupos
  const groupedByBranch = useMemo(() => {
    const groups: Record<string, SellerSummary[]> = {};
    filteredData.forEach(s => {
      const b = s.branch || 'Sin Asignar';
      if (!groups[b]) groups[b] = [];
      groups[b].push(s);
    });
    const order = ['Santa Cruz', 'Cochabamba', 'La Paz', 'El Alto', 'Sucre', 'Promotores', 'Sin Asignar'];
    return Object.entries(groups).sort(([a], [b]) => {
      const ia = order.indexOf(a), ib = order.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  }, [filteredData]);

  const clearFilters = useCallback(() => { setBranchFilter(''); setSearchTerm(''); }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div className="text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 backdrop-blur-xl border border-blue-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Activity className="text-blue-400 animate-pulse" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Cargando Reporte de Vendedores</h2>
          <p className="text-white/60">Preparando análisis…</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div className="text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="w-16 h-16 bg-gradient-to-r from-red-500/20 to-orange-500/20 backdrop-blur-xl border border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Activity className="text-red-400" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Error</h2>
          <p className="text-white/60">{error}</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <motion.header
        className="relative"
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-white/10"></div>
        <div className="relative backdrop-blur-xl bg-white/5 border-b border-white/10 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-r from-blue-500/30 to-purple-500/30 backdrop-blur-sm border border-blue-500/30 rounded-xl">
                  <Activity className="text-white" size={28} />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">Reporte Inteligente de Vendedores</h1>
                  <p className="text-white/60 mt-1">Ventas, pedidos, ads y ROAS por asesor/promotor</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    // Export simple CSV (sin dependencia externa)
                    const headers = ['seller_name','branch','total_sales','orders_count','ad_spend','roas'];
                    const rows = filteredData.map(d => [
                      `"${d.seller_name.replace(/"/g,'""')}"`,
                      `"${(d.branch || '').replace(/"/g,'""')}"`,
                      d.total_sales, d.orders_count, d.ad_spend, d.roas ?? ''
                    ].join(','));
                    const csv = [headers.join(','), ...rows].join('\n');
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `vendedores_${new Date().toISOString().slice(0,10)}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  disabled={filteredData.length === 0}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500/30 to-blue-600/30 backdrop-blur-sm border border-blue-500/30 text-white font-semibold rounded-xl shadow-lg hover:from-blue-500/40 hover:to-blue-600/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <Download size={20} />
                  Exportar CSV
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Filtros */}
        <FiltersBar
          branches={Array.from(new Set(summaryData.map(d => d.branch || 'Sin Sucursal'))).sort()}
          selectedBranch={branchFilter}
          onBranchChange={setBranchFilter}
          searchTerm={searchTerm}
          onSearch={setSearchTerm}
          onClear={clearFilters}
        />

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Ingresos Totales"
            value={`Bs ${totalRevenue.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`}
            icon={<DollarSign size={24} />}
            gradient={COLORS.gradients.blue}
            border="border-blue-500/30"
            subtitle="Suma de ventas por asesor"
          />
          <StatCard
            title="Órdenes"
            value={totalOrders.toLocaleString('es-ES')}
            icon={<ShoppingCart size={24} />}
            gradient={COLORS.gradients.green}
            border="border-green-500/30"
            subtitle="Total pedidos asociados"
          />
          <StatCard
            title="Gasto en Ads"
            value={`Bs ${totalAdSpend.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`}
            icon={<Target size={24} />}
            gradient={COLORS.gradients.orange}
            border="border-orange-500/30"
            subtitle="Inversión imputada a vendedores"
          />
          <StatCard
            title="ROAS Promedio"
            value={avgROAS !== null ? `${avgROAS.toFixed(2)}x` : 'N/A'}
            icon={<Award size={24} />}
            gradient={COLORS.gradients.purple}
            border="border-purple-500/30"
            subtitle="Ingresos / Ads"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <ChartContainer title="Tendencia (proxy por sucursal)">
            <ResponsiveContainer>
              <AreaChart data={trendMock}>
                <defs>
                  <linearGradient id="lgRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="label" fontSize={12} stroke="#9CA3AF" />
                <YAxis fontSize={12} stroke="#9CA3AF" tickFormatter={(v) => `Bs ${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(v: number) => [`Bs ${v.toLocaleString('es-ES')}`, 'Ingresos']}
                  contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff' }}
                />
                <Area type="monotone" dataKey="revenue" stroke={COLORS.primary} fill="url(#lgRev)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>

          <ChartContainer title="Ingresos vs Ads por Sucursal" className="lg:col-span-2">
            <ResponsiveContainer>
              <ComposedChart data={totalsByBranch}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" fontSize={12} stroke="#9CA3AF" />
                <YAxis yAxisId="left" fontSize={12} stroke="#9CA3AF" tickFormatter={(v) => `Bs ${(v/1000).toFixed(0)}k`} />
                <YAxis yAxisId="right" orientation="right" fontSize={12} stroke="#9CA3AF" tickFormatter={(v) => `${v.toFixed(1)}x`} />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    if (name === 'roas') return [`${value.toFixed(2)}x`, 'ROAS'];
                    if (name === 'ad_spend') return [`Bs ${value.toLocaleString('es-ES')}`, 'Ads'];
                    return [`Bs ${value.toLocaleString('es-ES')}`, 'Ingresos'];
                  }}
                  contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff' }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="revenue" name="Ingresos" fill={COLORS.primary} radius={[4,4,0,0]} />
                <Bar yAxisId="left" dataKey="ad_spend" name="Ads" fill={COLORS.accent} radius={[4,4,0,0]} />
                <Line yAxisId="right" type="monotone" dataKey="roas" name="ROAS" stroke="#10B981" strokeWidth={3} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        {/* Top vendedores */}
        <ChartContainer title="Top 5 Vendedores (por ingresos)" fixedHeight={false}>
          <div className="space-y-2">
            {topSellers.map((v, i) => (
              <motion.div
                key={`${v.name}-${i}`}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3 hover:bg-white/10 transition-colors"
                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.05 }}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-6 h-6 flex items-center justify-center rounded-full text-white text-xs font-bold
                      ${i===0?'bg-yellow-500/30 border border-yellow-500/40':
                        i===1?'bg-gray-400/30 border border-gray-400/40':
                        i===2?'bg-orange-500/30 border border-orange-500/40':'bg-white/10 border border-white/20'}`}>
                      {i+1}
                    </span>
                    <p className="text-sm font-semibold text-white truncate" title={v.name}>{v.name}</p>
                  </div>
                  <div className="flex items-center gap-6 text-right">
                    <div className="hidden md:block">
                      <p className="text-xs text-white/60">Órdenes</p>
                      <p className="text-sm font-medium text-white">{v.orders}</p>
                    </div>
                    <div className="hidden sm:block">
                      <p className="text-xs text-white/60">Promedio</p>
                      <p className="text-sm font-medium text-white">Bs {v.aov.toFixed(0)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/60">Ingresos</p>
                      <p className="text-base font-bold text-blue-300">Bs {v.revenue.toLocaleString('es-ES')}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </ChartContainer>

        {/* Grupos por sucursal con tabla ordenable */}
        <div className="space-y-8">
          {groupedByBranch.map(([branchName, sellersInBranch]) => (
            <motion.div
              key={branchName}
              className="relative"
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10 rounded-2xl"></div>
              <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/10">
                  <h3 className="text-xl font-bold text-white flex items-center gap-3">
                    {branchName === 'Promotores'
                      ? <Users size={22} className="text-purple-300" />
                      : <Building size={22} className="text-blue-300" />}
                    <span>{branchName}</span>
                    <span className="text-sm font-medium text-white/70 bg-white/10 px-2 py-1 rounded-full border border-white/20">
                      {sellersInBranch.length} Personas
                    </span>
                  </h3>
                </div>
                <div className="p-4">
                  <SellerSortableTable sellers={sellersInBranch} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}