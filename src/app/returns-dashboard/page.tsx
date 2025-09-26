'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import {
  TrendingDown, DollarSign, Package, BarChart3, Download, Filter,
  Eye, Zap, Search, CornerDownLeft, MessageSquareWarning,
  CreditCard, X as XIcon
} from 'lucide-react';

// ==================
// Paleta/estilo común (dark)
// ==================
const COLORS = {
  primary: '#EF4444',      // rojo
  secondary: '#F97316',    // naranja
  accent: '#F59E0B',       // ámbar
  grid: '#374151',         // slate-700
  axis: '#9CA3AF',         // slate-400
};

const fmtMoney = (n: number) => `Bs ${n.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`;

// ==================
// Modal de imagen
// ==================
const ImageModal = ({ src, onClose }: { src: string | null; onClose: () => void }) => {
  if (!src) return null;
  return (
    <motion.div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <motion.div
        className="relative max-w-4xl max-h-[90vh] bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg p-2"
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
      >
        <img src={src} alt="Vista ampliada" className="max-w-full max-h-[86vh] object-contain rounded" />
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full p-2 shadow-lg hover:bg-white/30 transition-colors text-white"
        >
          <XIcon className="w-5 h-5" />
        </button>
      </motion.div>
    </motion.div>
  );
};

// ==================
// Tipos
// ==================
interface ReturnRecord {
  return_id: number;
  order_no: number;
  return_date: string;
  branch: string;
  seller_name: string;
  customer_name: string;
  product_name: string;
  quantity: number;
  return_amount: number;
  reason: string;
  return_method: string;
  return_proof_url: string | null;
}

// ==================
// UI Reutilizable (dark)
// ==================
const StatCard: React.FC<{
  title: string; value: string | number; icon: React.ReactNode; gradient: string;
}> = ({ title, value, icon, gradient }) => (
  <motion.div
    className="relative overflow-hidden rounded-2xl"
    whileHover={{ scale: 1.02, y: -4 }}
    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
  >
    <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
    <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl">
      <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 w-fit mb-4">
        <div className="text-white text-2xl">{icon}</div>
      </div>
      <p className="text-white/70 text-sm font-medium">{title}</p>
      <p className="text-white text-3xl font-bold">{value}</p>
    </div>
  </motion.div>
);

const ChartContainer: React.FC<{
  title: string; children: React.ReactNode; className?: string; fixedHeight?: boolean;
}> = ({ title, children, className = '', fixedHeight = true }) => (
  <motion.div
    className={`relative ${className}`}
    initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: 'easeOut' }}
  >
    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10 rounded-2xl" />
    <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-white/10">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <BarChart3 size={20} className="text-red-400" /> {title}
        </h3>
      </div>
      <div className="p-6">
        <div className={`w-full ${fixedHeight ? 'h-[400px]' : ''}`}>{children}</div>
      </div>
    </div>
  </motion.div>
);

const AdvancedFilters: React.FC<{
  filters: any;
  onFilterChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  uniqueBranches: string[];
  onClearFilters: () => void;
}> = ({ filters, onFilterChange, uniqueBranches, onClearFilters }) => (
  <motion.div
    className="relative mb-8"
    initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
  >
    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10 rounded-2xl" />
    <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-3">
          <Filter className="text-red-400" /> Filtros de Devoluciones
        </h2>
        <button
          onClick={onClearFilters}
          className="px-4 py-2 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 rounded-lg border border-white/20 transition-colors"
        >
          Limpiar Filtros
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <input
          type="date" name="startDate" value={filters.startDate} onChange={onFilterChange}
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-400/40"
        />
        <input
          type="date" name="endDate" value={filters.endDate} onChange={onFilterChange}
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-400/40"
        />
        <select
          name="branch" value={filters.branch} onChange={onFilterChange}
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-400/40"
        >
          <option className="bg-black" value="">Todas las Sucursales</option>
          {uniqueBranches.map((b) => <option className="bg-black" key={b} value={b}>{b}</option>)}
        </select>
      </div>
    </div>
  </motion.div>
);

// ==================
// Página principal
// ==================
export default function ReturnsDashboardPage() {
  const [allReturns, setAllReturns] = useState<ReturnRecord[]>([]);
  const [filteredReturns, setFilteredReturns] = useState<ReturnRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({ startDate: '', endDate: '', branch: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [modalImageSrc, setModalImageSrc] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllReturns = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/endpoints/returns-report');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'La respuesta de la red no fue exitosa');
        }
        const data = await response.json();
        setAllReturns(data);
        setFilteredReturns(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAllReturns();
  }, []);

  useEffect(() => {
    let returnsData = [...allReturns];
    if (filters.startDate) returnsData = returnsData.filter(r => new Date(r.return_date) >= new Date(filters.startDate));
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      returnsData = returnsData.filter(r => new Date(r.return_date) <= end);
    }
    if (filters.branch) returnsData = returnsData.filter(r => r.branch === filters.branch);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      returnsData = returnsData.filter(ret =>
        ret.order_no.toString().includes(q) ||
        ret.product_name.toLowerCase().includes(q) ||
        ret.reason.toLowerCase().includes(q) ||
        ret.seller_name.toLowerCase().includes(q) ||
        ret.customer_name.toLowerCase().includes(q)
      );
    }
    setFilteredReturns(returnsData);
  }, [allReturns, filters, searchTerm]);

  const stats = useMemo(() => {
    if (allReturns.length === 0) {
      return {
        uniqueBranches: [] as string[],
        totalAmountReturned: 0,
        totalItemsReturned: 0,
        totalReturns: 0,
        averageReturnValue: 0,
        returnsByBranch: [] as Array<{ name: string; total: number }>,
        returnsByReason: [] as Array<{ name: string; count: number }>,
        returnsTrend: [] as Array<{ date: string; amount: number }>,
      };
    }

    const totalReturned = filteredReturns.reduce((acc, r) => acc + r.return_amount, 0);
    const totalItems = filteredReturns.reduce((acc, r) => acc + r.quantity, 0);
    const totalEvents = new Set(filteredReturns.map(r => r.return_id)).size;

    const daily: Record<string, number> = {};
    const branchAgg: Record<string, number> = {};
    const reasonAgg: Record<string, number> = {};

    filteredReturns.forEach(ret => {
      const key = new Date(ret.return_date).toISOString().split('T')[0];
      daily[key] = (daily[key] || 0) + ret.return_amount;
      branchAgg[ret.branch] = (branchAgg[ret.branch] || 0) + ret.return_amount;
      reasonAgg[ret.reason] = (reasonAgg[ret.reason] || 0) + 1;
    });

    return {
      uniqueBranches: Array.from(new Set(allReturns.map(r => r.branch))).sort(),
      totalAmountReturned: totalReturned,
      totalItemsReturned: totalItems,
      totalReturns: totalEvents,
      averageReturnValue: totalEvents > 0 ? totalReturned / totalEvents : 0,
      returnsByBranch: Object.entries(branchAgg).map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total),
      returnsByReason: Object.entries(reasonAgg).map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count).slice(0, 5),
      returnsTrend: Object.entries(daily)
        .map(([date, amount]) => ({
          date: new Date(date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
          amount
        }))
        .slice(-30),
    };
  }, [filteredReturns, allReturns]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const clearFilters = () => {
    setFilters({ startDate: '', endDate: '', branch: '' });
    setSearchTerm('');
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredReturns.map(ret => ({
      'ID Devolución': ret.return_id,
      'Nº Pedido Original': ret.order_no,
      'Fecha Devolución': new Date(ret.return_date).toLocaleString(),
      'Sucursal Devolución': ret.branch,
      'Vendedor Original': ret.seller_name,
      'Cliente': ret.customer_name,
      'Producto': ret.product_name,
      'Cantidad': ret.quantity,
      'Monto Devuelto': ret.return_amount,
      'Método Devolución': ret.return_method,
      'Motivo': ret.reason,
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Devoluciones');
    XLSX.writeFile(workbook, `Reporte_Devoluciones_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-8 text-center">
          <div className="w-12 h-12 rounded-full border-2 border-white/20 border-t-white/70 animate-spin mx-auto mb-4" />
          <p className="text-white/80 font-medium">Cargando devoluciones…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="relative backdrop-blur-xl bg-white/5 border border-red-400/30 rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-red-500/20 border border-red-400/40 rounded-full flex items-center justify-center mx-auto mb-4">
            <Zap className="text-red-300" size={28} />
          </div>
          <h2 className="text-white text-2xl font-bold mb-1">Error al cargar datos</h2>
          <p className="text-white/70">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <AnimatePresence>{modalImageSrc && <ImageModal src={modalImageSrc} onClose={() => setModalImageSrc(null)} />}</AnimatePresence>

      <div className="min-h-screen bg-black text-white">
        {/* Header */}
        <header className="sticky top-0 z-40">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-white/10" />
            <div className="relative backdrop-blur-xl bg-white/5 border-b border-white/10">
              <div className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
                <h1 className="text-3xl font-bold flex items-center gap-3">
                  <CornerDownLeft size={28} className="text-red-400" />
                  Dashboard de Devoluciones
                </h1>
                <button
                  onClick={exportToExcel}
                  disabled={filteredReturns.length === 0}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500/30 to-red-600/30 border border-red-400/40 text-white font-semibold rounded-xl shadow-lg hover:from-red-500/40 hover:to-red-600/40 disabled:opacity-50 transition-all"
                >
                  <Download size={20} /> Exportar
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
          {/* Filtros */}
          <AdvancedFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            uniqueBranches={stats.uniqueBranches}
            onClearFilters={clearFilters}
          />

          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Monto Total Devuelto"
              value={fmtMoney(stats.totalAmountReturned)}
              icon={<DollarSign />}
              gradient="from-red-500/20 to-rose-500/20"
            />
            <StatCard
              title="Total Devoluciones"
              value={stats.totalReturns.toLocaleString('es-ES')}
              icon={<CornerDownLeft />}
              gradient="from-orange-500/20 to-amber-500/20"
            />
            <StatCard
              title="Items Devueltos"
              value={stats.totalItemsReturned.toLocaleString('es-ES')}
              icon={<Package />}
              gradient="from-yellow-500/20 to-amber-500/20"
            />
            <StatCard
              title="Promedio por Devolución"
              value={fmtMoney(stats.averageReturnValue)}
              icon={<TrendingDown />}
              gradient="from-amber-500/20 to-yellow-500/20"
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <ChartContainer title="Tendencia de Devoluciones (30 días)" className="lg:col-span-3">
              <ResponsiveContainer>
                <AreaChart data={stats.returnsTrend}>
                  <defs>
                    <linearGradient id="returnGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8} />
                      <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
                  <XAxis dataKey="date" fontSize={12} stroke={COLORS.axis} />
                  <YAxis fontSize={12} stroke={COLORS.axis} tickFormatter={(v) => `Bs ${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value: number) => [`${fmtMoney(value as number)}`, 'Monto devuelto']}
                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.85)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="amount" stroke={COLORS.primary} fill="url(#returnGradient)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>

            <ChartContainer title="Top 5 Motivos de Devolución" className="lg:col-span-2">
              <ResponsiveContainer>
                <BarChart data={stats.returnsByReason} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12, fill: '#E5E7EB' }} interval={0} />
                  <Tooltip
                    formatter={(value: number) => [value, 'Cantidad']}
                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.85)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff' }}
                  />
                  <Bar dataKey="count" fill={COLORS.secondary} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>

          <ChartContainer title="Monto Devuelto por Sucursal">
            <ResponsiveContainer>
              <BarChart data={stats.returnsByBranch}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
                <XAxis dataKey="name" fontSize={12} stroke={COLORS.axis} />
                <YAxis fontSize={12} stroke={COLORS.axis} tickFormatter={(v) => `Bs ${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: number) => [`${fmtMoney(value as number)}`, 'Total devuelto']}
                  contentStyle={{ backgroundColor: 'rgba(0,0,0,0.85)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff' }}
                />
                <Bar dataKey="total" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>

          {/* Tabla */}
          <ChartContainer title="Detalle de Devoluciones" fixedHeight={false}>
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-white/70">
                Mostrando {filteredReturns.length} de {allReturns.length} registros
              </p>
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                <input
                  type="text"
                  placeholder="Buscar por Nº Pedido, producto, motivo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-400/40"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    {['Nº Pedido Orig.', 'Fecha Dev.', 'Sucursal Dev.', 'Producto', 'Motivo', 'Método Dev.', 'Monto'].map(header => (
                      <th key={header} className="px-6 py-3 text-left text-xs font-bold text-white/70 uppercase tracking-wider">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {filteredReturns.slice(0, 100).map((ret, index) => (
                    <motion.tr
                      key={`${ret.return_id}-${ret.product_name}-${index}`}
                      className="hover:bg-white/5 transition-colors"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-red-300">#{ret.order_no}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-white/90">{new Date(ret.return_date).toLocaleDateString('es-ES')}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-white/90">{ret.branch}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-white">{ret.product_name}</div>
                        <div className="text-xs text-white/60">Cantidad: {ret.quantity}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-white/90" title={ret.reason}>
                          <MessageSquareWarning size={16} className="text-orange-300 flex-shrink-0" />
                          <span className="truncate max-w-[240px]">{ret.reason}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-white/90">{ret.return_method}</span>
                          {ret.return_proof_url && (
                            <button
                              onClick={() => setModalImageSrc(ret.return_proof_url)}
                              className="p-1 rounded-full hover:bg-white/10 border border-white/20"
                              title="Ver comprobante"
                            >
                              <CreditCard className="w-4 h-4 text-white/80" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-lg font-bold text-amber-300">{fmtMoney(ret.return_amount)}</div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>

              {filteredReturns.length > 100 && (
                <div className="text-center py-4 text-sm text-white/60">
                  Mostrando los primeros 100 registros. Usa los filtros para acotar la búsqueda.
                </div>
              )}
            </div>
          </ChartContainer>
        </main>
      </div>
    </>
  );
}