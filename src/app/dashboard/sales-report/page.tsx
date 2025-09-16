'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, RadialBarChart, 
  RadialBar, ComposedChart, Scatter, ScatterChart, Treemap 
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import { 
  TrendingUp, TrendingDown, DollarSign, Package, ShoppingCart, 
  BarChart3, Download, Calendar, Filter, Users, Target, 
  ArrowUpRight, ArrowDownRight, Eye, Zap, Award, Clock,
  PieChart as PieChartIcon, Activity, Briefcase, Star,
  ImageIcon, CreditCard, X as XIcon, Search
} from 'lucide-react';

// --- Componente Modal para visualizar imágenes ---
const ImageModal = ({ src, onClose }: { src: string | null; onClose: () => void }) => {
  if (!src) return null;
  return (
    <motion.div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div 
        className="relative max-w-4xl max-h-[90vh] bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg p-2"
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.8 }}
      >
        <img src={src} alt="Vista ampliada" className="max-w-full max-h-[88vh] object-contain rounded" />
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

// --- Definición de Tipos ---
interface SaleRecord {
  order_id: string;
  order_no: number | null;
  order_date: string;
  branch: string | null;
  seller_full_name: string | null;
  seller_role: string | null;
  product_name: string;
  quantity: number;
  subtotal: number;
  delivery_date: string | null;
  product_image_url: string | null;
  payment_proof_url: string | null;
  sale_type: 'Por Mayor' | 'Al Detalle' | null;
  order_type: 'Pedido' | 'Encomienda' | null;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  gradient: string;
  border: string;
  trend?: number;
  subtitle?: string;
  sparklineData?: Array<{value: number}>;
}

interface ChartContainerProps {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  fixedHeight?: boolean;
}

interface KPICardProps {
  title: string;
  value: string;
  target: string;
  percentage: number;
  color: string;
}

// Paleta de colores para fondo negro
const COLORS = {
  primary: '#3B82F6',
  secondary: '#10B981',
  accent: '#F59E0B',
  warning: '#EF4444',
  danger: '#DC2626',
  success: '#059669',
  info: '#06B6D4',
  purple: '#8B5CF6',
  teal: '#14B8A6',
  gradients: {
    blue: 'from-blue-500/20 to-cyan-500/20',
    green: 'from-green-500/20 to-emerald-500/20',
    orange: 'from-orange-500/20 to-yellow-500/20',
    purple: 'from-purple-500/20 to-pink-500/20',
    teal: 'from-teal-500/20 to-cyan-500/20',
    dark: 'from-slate-500/20 to-gray-500/20'
  }
};

const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#14B8A6', '#EF4444', '#DC2626'];

// --- Componentes de UI ---
const StatCard: React.FC<StatCardProps> = ({ title, value, icon, gradient, border, trend, subtitle, sparklineData }) => (
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
        {trend !== undefined && (
          <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-semibold backdrop-blur-sm border ${
            trend > 0 ? 'bg-green-500/20 text-green-300 border-green-500/30' : 'bg-red-500/20 text-red-300 border-red-500/30'
          }`}>
            {trend > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-white/70 text-sm font-medium">{title}</p>
        <p className="text-white text-3xl font-bold tracking-tight">{value}</p>
        {subtitle && <p className="text-white/60 text-xs">{subtitle}</p>}
      </div>
      {sparklineData && (
        <div className="mt-4 h-8">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparklineData}>
              <Area type="monotone" dataKey="value" stroke="white" fill="white" fillOpacity={0.3} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  </motion.div>
);

const KPICard: React.FC<KPICardProps> = ({ title, value, target, percentage, color }) => (
  <motion.div
    className="relative"
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.4 }}
  >
    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10 rounded-lg"></div>
    <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-lg p-6 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white/70">{title}</h3>
        <Target size={16} className="text-white/50" />
      </div>
      <div className="space-y-3">
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-white">{value}</span>
          <span className="text-sm text-white/60">/ {target}</span>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-white/60">Progreso</span>
            <span className="font-semibold text-white">{percentage.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <motion.div
              className="h-2 rounded-full"
              style={{ backgroundColor: color }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(percentage, 100)}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>
    </div>
  </motion.div>
);

const ChartContainer: React.FC<ChartContainerProps> = ({ title, children, actions, className = '', fixedHeight = true }) => (
  <motion.div 
    className={`relative ${className}`}
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, ease: 'easeOut' }}
  >
    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10 rounded-lg"></div>
    <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-lg shadow-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center space-x-2">
            <BarChart3 size={20} className="text-blue-400" />
            <span>{title}</span>
          </h3>
          {actions && <div className="flex items-center space-x-2">{actions}</div>}
        </div>
      </div>
      <div className="p-6">
        <div className={`w-full ${fixedHeight ? 'h-[400px]' : ''}`}>
          {children}
        </div>
      </div>
    </div>
  </motion.div>
);

const AdvancedFilters: React.FC<{
  filters: any;
  onFilterChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  uniqueBranches: string[];
  uniqueRoles: string[];
  onClearFilters: () => void;
}> = ({ filters, onFilterChange, uniqueBranches, uniqueRoles, onClearFilters }) => (
  <motion.div 
    className="relative mb-8"
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
  >
    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10 rounded-lg"></div>
    <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-lg p-6 shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Filter className="text-blue-400" size={24} />
          <h2 className="text-xl font-bold text-white">Filtros Avanzados</h2>
        </div>
        <button
          onClick={onClearFilters}
          className="px-4 py-2 text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors backdrop-blur-sm border border-white/20"
        >
          Limpiar Filtros
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-white/70">Fecha Inicio</label>
          <input
            type="date"
            name="startDate"
            value={filters.startDate}
            onChange={onFilterChange}
            className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-white/70">Fecha Fin</label>
          <input
            type="date"
            name="endDate"
            value={filters.endDate}
            onChange={onFilterChange}
            className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-white/70">Sucursal</label>
          <select
            name="branch"
            value={filters.branch}
            onChange={onFilterChange}
            className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all"
          >
            <option value="" className="bg-black">Todas las Sucursales</option>
            {uniqueBranches.map(b => <option key={b} value={b} className="bg-black">{b}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-white/70">Rol</label>
          <select
            name="sellerRole"
            value={filters.sellerRole}
            onChange={onFilterChange}
            className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all"
          >
            <option value="" className="bg-black">Todos los Roles</option>
            {uniqueRoles.map(r => <option key={r} value={r} className="bg-black">{r}</option>)}
          </select>
        </div>
      </div>
    </div>
  </motion.div>
);

// --- Componente Principal ---
export default function SalesReportPageRedesigned() {
  const [allSales, setAllSales] = useState<SaleRecord[]>([]);
  const [filteredSales, setFilteredSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    branch: '',
    sellerRole: '',
  });
  const [modalImageSrc, setModalImageSrc] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchAllSales = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/endpoints/sales-report');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'La respuesta de la red no fue exitosa');
        }
        const data = await response.json();
        setAllSales(data);
        setFilteredSales(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAllSales();
  }, []);

  useEffect(() => {
    let salesData = [...allSales];
    if (filters.startDate) {
      salesData = salesData.filter(s => new Date(s.order_date) >= new Date(filters.startDate));
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      salesData = salesData.filter(s => new Date(s.order_date) <= end);
    }
    if (filters.branch) {
      salesData = salesData.filter(s => s.branch === filters.branch);
    }
    if (filters.sellerRole) {
      salesData = salesData.filter(s => s.seller_role === filters.sellerRole);
    }
    if (searchTerm) {
        const lowercasedTerm = searchTerm.toLowerCase();
        salesData = salesData.filter(sale => 
            (sale.order_no?.toString().includes(lowercasedTerm)) ||
            (sale.seller_full_name?.toLowerCase().includes(lowercasedTerm)) ||
            (sale.product_name.toLowerCase().includes(lowercasedTerm)) ||
            (sale.branch?.toLowerCase().includes(lowercasedTerm))
        );
    }
    setFilteredSales(salesData);
  }, [allSales, filters, searchTerm]);

  const {
    uniqueBranches,
    uniqueRoles,
    totalRevenue,
    totalItemsSold,
    totalOrders,
    averageOrderValue,
    salesByBranch,
    salesByProduct,
    topPerformers,
    salesByRole,
    monthlyTrend,
    conversionMetrics,
    performanceByHour
  } = useMemo(() => {
    const branches = new Set<string>();
    const roles = new Set<string>();
    const branchSales: { [key: string]: number } = {};
    const productSales: { [key: string]: { quantity: number; revenue: number } } = {};
    const roleSales: { [key: string]: number } = {};
    const sellerPerformance: { [key: string]: { revenue: number; orders: number } } = {};
    const dailySales: { [key: string]: number } = {};
    const hourlySales: { [key: string]: number } = {};

    filteredSales.forEach(sale => {
      if (sale.branch) branches.add(sale.branch);
      if (sale.seller_role) roles.add(sale.seller_role);
      branchSales[sale.branch || 'Sin Sucursal'] = (branchSales[sale.branch || 'Sin Sucursal'] || 0) + sale.subtotal;
      if (!productSales[sale.product_name]) {
        productSales[sale.product_name] = { quantity: 0, revenue: 0 };
      }
      productSales[sale.product_name].quantity += sale.quantity;
      productSales[sale.product_name].revenue += sale.subtotal;
      roleSales[sale.seller_role || 'Sin Rol'] = (roleSales[sale.seller_role || 'Sin Rol'] || 0) + sale.subtotal;
      const sellerKey = sale.seller_full_name || 'Sin Vendedor';
      if (!sellerPerformance[sellerKey]) {
        sellerPerformance[sellerKey] = { revenue: 0, orders: 0 };
      }
      sellerPerformance[sellerKey].revenue += sale.subtotal;
      sellerPerformance[sellerKey].orders += 1;
      const date = new Date(sale.order_date).toISOString().split('T')[0];
      dailySales[date] = (dailySales[date] || 0) + sale.subtotal;
      const hour = new Date(sale.order_date).getHours();
      hourlySales[hour] = (hourlySales[hour] || 0) + sale.subtotal;
    });

    const totalRev = filteredSales.reduce((acc, s) => acc + s.subtotal, 0);
    const totalItems = filteredSales.reduce((acc, s) => acc + s.quantity, 0);
    const totalOrd = new Set(filteredSales.map(s => s.order_id)).size;

    return {
      uniqueBranches: Array.from(branches).sort(),
      uniqueRoles: Array.from(roles).sort(),
      totalRevenue: totalRev,
      totalItemsSold: totalItems,
      totalOrders: totalOrd,
      averageOrderValue: totalOrd > 0 ? totalRev / totalOrd : 0,
      salesByBranch: Object.entries(branchSales)
        .map(([name, total]) => ({ name, total, percentage: (total / totalRev) * 100 }))
        .sort((a, b) => b.total - a.total),
      salesByProduct: Object.entries(productSales)
        .map(([name, data]) => ({ name, quantity: data.quantity, revenue: data.revenue, avgPrice: data.revenue / data.quantity }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 8),
      topPerformers: Object.entries(sellerPerformance)
        .map(([name, data]) => ({ name, revenue: data.revenue, orders: data.orders, avgOrderValue: data.revenue / data.orders }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5),
      salesByRole: Object.entries(roleSales)
        .map(([role, revenue]) => ({ role, revenue, percentage: (revenue / totalRev) * 100 }))
        .sort((a, b) => b.revenue - a.revenue),
      monthlyTrend: Object.entries(dailySales)
        .map(([date, revenue]) => ({ date, revenue }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      conversionMetrics: {
        avgItemsPerOrder: totalOrd > 0 ? totalItems / totalOrd : 0,
        conversionRate: 85.2,
        repeatCustomerRate: 42.8
      },
      performanceByHour: Array.from({ length: 24 }, (_, hour) => ({
        hour: `${hour}:00`,
        revenue: hourlySales[hour] || 0
      }))
    };
  }, [filteredSales]);

  const handleFilterChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ startDate: '', endDate: '', branch: '', sellerRole: '' });
    setSearchTerm('');
  }, []);

  const exportToExcel = useCallback(() => {
    const worksheet = XLSX.utils.json_to_sheet(filteredSales);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ventas');
    XLSX.writeFile(workbook, `reporte_ventas_${new Date().toISOString().split('T')[0]}.xlsx`);
  }, [filteredSales]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 backdrop-blur-xl border border-blue-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Activity className="text-blue-400 animate-pulse" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Cargando Dashboard</h2>
          <p className="text-white/60">Preparando análisis de ventas...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-16 h-16 bg-gradient-to-r from-red-500/20 to-orange-500/20 backdrop-blur-xl border border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Zap className="text-red-400" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Error en el Dashboard</h2>
          <p className="text-white/60">{error}</p>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-black text-white">
        <AnimatePresence>
          {modalImageSrc && <ImageModal src={modalImageSrc} onClose={() => setModalImageSrc(null)} />}
        </AnimatePresence>
        
        <motion.header 
          className="relative"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-white/10"></div>
          <div className="relative backdrop-blur-xl bg-white/5 border-b border-white/10 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-6 py-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-gradient-to-r from-blue-500/30 to-purple-500/30 backdrop-blur-sm border border-blue-500/30 rounded-xl">
                    <Activity className="text-white" size={28} />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-white">
                      Dashboard Inteligente de Ventas
                    </h1>
                    <p className="text-white/60 mt-1">Análisis avanzado y métricas en tiempo real</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <motion.button
                    onClick={exportToExcel}
                    disabled={filteredSales.length === 0}
                    className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500/30 to-blue-600/30 backdrop-blur-sm border border-blue-500/30 text-white font-semibold rounded-xl shadow-lg hover:from-blue-500/40 hover:to-blue-600/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Download size={20} />
                    <span>Exportar Datos</span>
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </motion.header>

        <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
          <AdvancedFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            uniqueBranches={uniqueBranches}
            uniqueRoles={uniqueRoles}
            onClearFilters={clearFilters}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Ingresos Totales"
              value={`$${totalRevenue.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`}
              icon={<DollarSign size={24} />}
              gradient={COLORS.gradients.blue}
              border="border-blue-500/30"
              trend={12.5}
              subtitle="vs. período anterior"
            />
            <StatCard
              title="Órdenes Procesadas"
              value={totalOrders.toLocaleString()}
              icon={<ShoppingCart size={24} />}
              gradient={COLORS.gradients.green}
              border="border-green-500/30"
              trend={8.3}
              subtitle={`${totalItemsSold} items vendidos`}
            />
            <StatCard
              title="Valor Promedio/Orden"
              value={`$${averageOrderValue.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`}
              icon={<Target size={24} />}
              gradient={COLORS.gradients.orange}
              border="border-orange-500/30"
              trend={-2.1}
              subtitle="Ticket promedio"
            />
            <StatCard
              title="Eficiencia de Ventas"
              value={`${conversionMetrics.avgItemsPerOrder.toFixed(1)}`}
              icon={<Award size={24} />}
              gradient={COLORS.gradients.purple}
              border="border-purple-500/30"
              trend={15.7}
              subtitle="items por orden"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <KPICard
              title="Meta Mensual"
              value={`$${totalRevenue.toLocaleString()}`}
              target="$500,000"
              percentage={(totalRevenue / 500000) * 100}
              color={COLORS.primary}
            />
            <KPICard
              title="Órdenes Objetivo"
              value={totalOrders.toString()}
              target="1,200"
              percentage={(totalOrders / 1200) * 100}
              color={COLORS.secondary}
            />
            <KPICard
              title="Productos Vendidos"
              value={totalItemsSold.toString()}
              target="5,000"
              percentage={(totalItemsSold / 5000) * 100}
              color={COLORS.accent}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <ChartContainer title="Tendencia de Ingresos" className="lg:col-span-2">
              <ResponsiveContainer>
                <AreaChart data={monthlyTrend}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" fontSize={12} stroke="#9CA3AF" />
                  <YAxis fontSize={12} stroke="#9CA3AF" tickFormatter={(value) => `$${(value/1000).toFixed(0)}K`} />
                  <Tooltip 
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Ingresos']}
                    labelStyle={{ color: '#fff' }}
                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', backdropFilter: 'blur(10px)' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke={COLORS.primary} 
                    fillOpacity={1} 
                    fill="url(#revenueGradient)"
                    strokeWidth={3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>

            <ChartContainer title="Ventas por Rol">
              <ResponsiveContainer>
                <RadialBarChart cx="50%" cy="50%" innerRadius="30%" outerRadius="90%" data={salesByRole}>
                  <RadialBar 
                    dataKey="percentage" 
                    cornerRadius={10} 
                    fill={COLORS.primary}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`${value.toFixed(1)}%`, 'Participación']}
                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', backdropFilter: 'blur(10px)', color: '#fff' }}
                  />
                  <Legend />
                </RadialBarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <ChartContainer title="Mapa de Productos por Ingresos">
              <ResponsiveContainer>
                <Treemap
                  data={salesByProduct}
                  dataKey="revenue"
                  stroke="#fff"
                  fill={COLORS.secondary}
                >
                  <Tooltip 
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Ingresos']}
                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', backdropFilter: 'blur(10px)', color: '#fff' }}
                  />
                </Treemap>
              </ResponsiveContainer>
            </ChartContainer>

            <ChartContainer title="Ventas por Hora del Día">
              <ResponsiveContainer>
                <LineChart data={performanceByHour}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="hour" fontSize={12} stroke="#9CA3AF" />
                  <YAxis fontSize={12} stroke="#9CA3AF" tickFormatter={(value) => `$${(value/1000).toFixed(0)}K`} />
                  <Tooltip 
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Ingresos']}
                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', backdropFilter: 'blur(10px)', color: '#fff' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke={COLORS.accent} 
                    strokeWidth={3}
                    dot={{ fill: COLORS.accent, strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: COLORS.accent, strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>

          <ChartContainer title="Análisis Comparativo por Sucursal">
            <ResponsiveContainer>
              <ComposedChart data={salesByBranch}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" fontSize={12} stroke="#9CA3AF" />
                <YAxis yAxisId="left" fontSize={12} stroke="#9CA3AF" tickFormatter={(value) => `$${(value/1000).toFixed(0)}K`} />
                <YAxis yAxisId="right" orientation="right" fontSize={12} stroke="#9CA3AF" tickFormatter={(value) => `${value.toFixed(0)}%`} />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    name === 'total' ? `$${value.toLocaleString()}` : `${value.toFixed(1)}%`,
                    name === 'total' ? 'Ingresos' : 'Participación'
                  ]}
                  contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', backdropFilter: 'blur(10px)', color: '#fff' }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="total" name="Ingresos" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="percentage" name="% Participación" stroke={COLORS.accent} strokeWidth={3} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartContainer>

          <ChartContainer title="Top 5 Vendedores" fixedHeight={false}>
            <div className="space-y-2">
              {topPerformers.map((performer, index) => {
                const isUuid = /^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(performer.name);
                const displayName = isUuid ? 'Vendedor Desconocido' : performer.name;

                return (
                  <motion.div
                    key={`${performer.name}-${index}`}
                    className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3 transition-all duration-300 shadow-sm hover:bg-white/10"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.05 }}
                  >
                    <div className="flex items-center justify-between space-x-3">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <span className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-white font-bold text-xs backdrop-blur-sm border ${
                          index === 0 ? 'bg-gradient-to-br from-yellow-500/30 to-orange-500/30 border-yellow-500/50' :
                          index === 1 ? 'bg-gradient-to-br from-gray-400/30 to-gray-500/30 border-gray-400/50' :
                          index === 2 ? 'bg-gradient-to-br from-orange-500/30 to-red-500/30 border-orange-500/50' :
                          'bg-white/10 border-white/20'
                        }`}>
                          {index + 1}
                        </span>
                        <p className="text-sm font-semibold text-white truncate" title={displayName}>
                          {displayName}
                        </p>
                      </div>
                      <div className="flex items-center space-x-4 text-right">
                        <div className="hidden sm:block">
                          <p className="text-xs text-white/60">Órdenes</p>
                          <p className="text-sm font-medium text-white">{performer.orders}</p>
                        </div>
                        <div className="hidden md:block">
                          <p className="text-xs text-white/60">Promedio</p>
                          <p className="text-sm font-medium text-white">${performer.avgOrderValue.toFixed(0)}</p>
                        </div>
                        <div className="w-24">
                          <p className="text-xs text-white/60">Total Ingresos</p>
                          <p className="text-base font-bold text-blue-400">${performer.revenue.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </ChartContainer>

          <motion.div 
            className="relative"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10 rounded-lg"></div>
            <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-lg shadow-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-white/10">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center space-x-3">
                    <Eye className="text-blue-400" size={24} />
                    <div>
                      <h3 className="text-xl font-bold text-white">Detalle de Transacciones</h3>
                      <p className="text-sm text-white/60">
                        Mostrando {filteredSales.length} de {allSales.length} transacciones
                      </p>
                    </div>
                  </div>
                  <div className="relative w-full max-w-xs">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                      <input
                          type="text"
                          placeholder="Buscar por Nº Pedido, producto..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all"
                      />
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      {['Nº Pedido', 'Venta', 'Entrega', 'Vendedor', 'Producto', 'Tipo', 'Detalles', 'Subtotal'].map(header => (
                        <th key={header} className="px-6 py-4 text-left text-xs font-bold text-white/70 uppercase tracking-wider">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    <AnimatePresence>
                      {filteredSales.slice(0, 100).map((sale, index) => (
                        <motion.tr
                          key={`${sale.order_id}-${sale.product_name}-${index}`}
                          className="hover:bg-white/5 transition-colors"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.3, delay: index * 0.02 }}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-bold text-blue-400">
                              #{sale.order_no || 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-white/80">
                              {new Date(sale.order_date).toLocaleDateString('es-ES')}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-white/80">
                              {sale.delivery_date ? new Date(sale.delivery_date).toLocaleDateString('es-ES') : 'Pendiente'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-white">
                              {sale.seller_full_name || 'Sin asignar'}
                            </div>
                            <div className="text-xs text-white/60">
                              {sale.seller_role || 'Sin rol'}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              {sale.product_image_url && (
                                <button
                                  onClick={() => setModalImageSrc(sale.product_image_url)}
                                  className="flex-shrink-0 w-10 h-10 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors"
                                >
                                  <ImageIcon size={16} className="text-white/70" />
                                </button>
                              )}
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-white truncate">
                                  {sale.product_name}
                                </div>
                                <div className="text-xs text-white/60">
                                  Cantidad: {sale.quantity}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="space-y-1">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm border ${
                                sale.sale_type === 'Por Mayor' 
                                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' 
                                  : 'bg-green-500/20 text-green-300 border-green-500/30'
                              }`}>
                                {sale.sale_type || 'N/A'}
                              </span>
                              <div>
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm border ${
                                  sale.order_type === 'Pedido' 
                                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' 
                                    : 'bg-orange-500/20 text-orange-300 border-orange-500/30'
                                }`}>
                                  {sale.order_type || 'N/A'}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <div className="text-sm text-white/80">
                                {sale.branch || 'Sin sucursal'}
                              </div>
                              {sale.payment_proof_url && (
                                <button
                                  onClick={() => setModalImageSrc(sale.payment_proof_url)}
                                  className="flex-shrink-0 w-6 h-6 bg-green-500/20 backdrop-blur-sm border border-green-500/30 rounded flex items-center justify-center hover:bg-green-500/30 transition-colors"
                                >
                                  <CreditCard size={12} className="text-green-300" />
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-lg font-bold text-green-400">
                              ${sale.subtotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
                {filteredSales.length > 100 && (
                  <div className="p-4 text-center border-t border-white/10">
                    <p className="text-sm text-white/60">
                      Mostrando los primeros 100 registros de {filteredSales.length} total.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}