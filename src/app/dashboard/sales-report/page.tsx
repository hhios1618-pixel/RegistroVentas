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
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div 
        className="relative max-w-4xl max-h-[90vh] bg-white rounded-lg p-2"
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.8 }}
      >
        <img src={src} alt="Vista ampliada" className="max-w-full max-h-[88vh] object-contain rounded" />
        <button 
          onClick={onClose} 
          className="absolute -top-3 -right-3 bg-white rounded-full p-2 shadow-lg hover:bg-gray-200 transition-colors"
        >
          <XIcon className="w-5 h-5 text-gray-700" />
        </button>
      </motion.div>
    </motion.div>
  );
};

// --- Definición de Tipos ---
interface SaleRecord {
  order_id: string;
  order_no: number | null; // Añadido para el número de pedido
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

// Paleta de colores
const COLORS = {
  primary: '#0078D4',
  secondary: '#107C10',
  accent: '#FF8C00',
  warning: '#F7630C',
  danger: '#D13438',
  success: '#107C10',
  info: '#00BCF2',
  purple: '#8764B8',
  teal: '#00B7C3',
  gradients: {
    blue: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    green: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    orange: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    purple: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    teal: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    dark: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  }
};

const CHART_COLORS = ['#0078D4', '#107C10', '#FF8C00', '#8764B8', '#00B7C3', '#F7630C', '#D13438'];

// --- Componentes de UI ---
const StatCard: React.FC<StatCardProps> = ({ title, value, icon, gradient, trend, subtitle, sparklineData }) => (
  <motion.div
    className="relative overflow-hidden bg-white rounded-2xl shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300"
    style={{ background: gradient }}
    whileHover={{ scale: 1.02, y: -4 }}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, ease: 'easeOut' }}
  >
    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
    <div className="relative p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
          <div className="text-white text-2xl">{icon}</div>
        </div>
        {trend !== undefined && (
          <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-semibold ${
            trend > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {trend > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-white/80 text-sm font-medium">{title}</p>
        <p className="text-white text-3xl font-bold tracking-tight">{value}</p>
        {subtitle && <p className="text-white/70 text-xs">{subtitle}</p>}
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
    className="bg-white rounded-xl p-6 shadow-lg border border-gray-100"
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.4 }}
  >
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-semibold text-gray-600">{title}</h3>
      <Target size={16} className="text-gray-400" />
    </div>
    <div className="space-y-3">
      <div className="flex items-baseline space-x-2">
        <span className="text-2xl font-bold text-gray-900">{value}</span>
        <span className="text-sm text-gray-500">/ {target}</span>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Progreso</span>
          <span className="font-semibold" style={{ color }}>{percentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
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
  </motion.div>
);

const ChartContainer: React.FC<ChartContainerProps> = ({ title, children, actions, className = '', fixedHeight = true }) => (
  <motion.div 
    className={`bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden ${className}`}
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, ease: 'easeOut' }}
  >
    <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-800 flex items-center space-x-2">
          <BarChart3 size={20} className="text-blue-600" />
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
    className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 mb-8"
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
  >
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center space-x-3">
        <Filter className="text-blue-600" size={24} />
        <h2 className="text-xl font-bold text-gray-800">Filtros Avanzados</h2>
      </div>
      <button
        onClick={onClearFilters}
        className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
      >
        Limpiar Filtros
      </button>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-gray-700">Fecha Inicio</label>
        <input
          type="date"
          name="startDate"
          value={filters.startDate}
          onChange={onFilterChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
        />
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-gray-700">Fecha Fin</label>
        <input
          type="date"
          name="endDate"
          value={filters.endDate}
          onChange={onFilterChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
        />
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-gray-700">Sucursal</label>
        <select
          name="branch"
          value={filters.branch}
          onChange={onFilterChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
        >
          <option value="">Todas las Sucursales</option>
          {uniqueBranches.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-gray-700">Rol</label>
        <select
          name="sellerRole"
          value={filters.sellerRole}
          onChange={onFilterChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
        >
          <option value="">Todos los Roles</option>
          {uniqueRoles.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
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
        const response = await fetch('/api/sales-report');
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
        .map(([date, revenue]) => ({ date: new Date(date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }), revenue }))
        .slice(-30),
      conversionMetrics: {
        avgItemsPerOrder: totalOrd > 0 ? totalItems / totalOrd : 0,
        avgRevenuePerItem: totalItems > 0 ? totalRev / totalItems : 0
      },
      performanceByHour: Object.entries(hourlySales)
        .map(([hour, revenue]) => ({ hour: `${hour}:00`, revenue }))
        .sort((a, b) => parseInt(a.hour) - parseInt(b.hour))
    };
  }, [filteredSales]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const clearFilters = () => {
    setFilters({ startDate: '', endDate: '', branch: '', sellerRole: '' });
    setSearchTerm('');
  };

  const exportToExcel = () => {
    const summaryData = [
      { Metrica: 'Ingresos Totales', Valor: totalRevenue },
      { Metrica: 'Items Vendidos', Valor: totalItemsSold },
      { Metrica: 'Órdenes Totales', Valor: totalOrders },
      { Metrica: 'Valor Promedio por Orden', Valor: averageOrderValue },
      { Metrica: 'Ingreso Promedio por Item', Valor: conversionMetrics.avgRevenuePerItem },
    ];
    
    const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
    const transactionsWorksheet = XLSX.utils.json_to_sheet(filteredSales.map(sale => ({
      'Nº Pedido': sale.order_no,
      'Fecha': new Date(sale.order_date).toLocaleString(),
      'Sucursal': sale.branch,
      'Vendedor': sale.seller_full_name,
      'Rol': sale.seller_role,
      'Producto': sale.product_name,
      'Cantidad': sale.quantity,
      'Subtotal': sale.subtotal,
    })));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Resumen');
    XLSX.utils.book_append_sheet(workbook, transactionsWorksheet, 'Detalle');

    XLSX.writeFile(workbook, `Dashboard_Ventas_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl font-semibold text-gray-700">Cargando Dashboard Inteligente...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center">
        <motion.div
          className="text-center p-8 bg-white rounded-2xl shadow-xl"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Zap className="text-red-600" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error en el Dashboard</h2>
          <p className="text-gray-600">{error}</p>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <AnimatePresence>
          {modalImageSrc && <ImageModal src={modalImageSrc} onClose={() => setModalImageSrc(null)} />}
        </AnimatePresence>
        
        <motion.header 
          className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl">
                  <Activity className="text-white" size={28} />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                    Dashboard Inteligente de Ventas
                  </h1>
                  <p className="text-gray-600 mt-1">Análisis avanzado y métricas en tiempo real</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <motion.button
                  onClick={exportToExcel}
                  disabled={filteredSales.length === 0}
                  className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Download size={20} />
                  <span>Exportar Datos</span>
                </motion.button>
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
              trend={12.5}
              subtitle="vs. período anterior"
            />
            <StatCard
              title="Órdenes Procesadas"
              value={totalOrders.toLocaleString()}
              icon={<ShoppingCart size={24} />}
              gradient={COLORS.gradients.green}
              trend={8.3}
              subtitle={`${totalItemsSold} items vendidos`}
            />
            <StatCard
              title="Valor Promedio/Orden"
              value={`$${averageOrderValue.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`}
              icon={<Target size={24} />}
              gradient={COLORS.gradients.orange}
              trend={-2.1}
              subtitle="Ticket promedio"
            />
            <StatCard
              title="Eficiencia de Ventas"
              value={`${conversionMetrics.avgItemsPerOrder.toFixed(1)}`}
              icon={<Award size={24} />}
              gradient={COLORS.gradients.purple}
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" fontSize={12} stroke="#666" />
                  <YAxis fontSize={12} stroke="#666" tickFormatter={(value) => `$${(value/1000).toFixed(0)}K`} />
                  <Tooltip 
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Ingresos']}
                    labelStyle={{ color: '#333' }}
                    contentStyle={{ backgroundColor: 'white', border: '1px solid #e0e0e0', borderRadius: '8px' }}
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
                    contentStyle={{ backgroundColor: 'white', border: '1px solid #e0e0e0', borderRadius: '8px' }}
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
                    contentStyle={{ backgroundColor: 'white', border: '1px solid #e0e0e0', borderRadius: '8px' }}
                  />
                </Treemap>
              </ResponsiveContainer>
            </ChartContainer>

            <ChartContainer title="Ventas por Hora del Día">
              <ResponsiveContainer>
                <LineChart data={performanceByHour}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="hour" fontSize={12} stroke="#666" />
                  <YAxis fontSize={12} stroke="#666" tickFormatter={(value) => `$${(value/1000).toFixed(0)}K`} />
                  <Tooltip 
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Ingresos']}
                    contentStyle={{ backgroundColor: 'white', border: '1px solid #e0e0e0', borderRadius: '8px' }}
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
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" fontSize={12} stroke="#666" />
                <YAxis yAxisId="left" fontSize={12} stroke="#666" tickFormatter={(value) => `$${(value/1000).toFixed(0)}K`} />
                <YAxis yAxisId="right" orientation="right" fontSize={12} stroke="#666" tickFormatter={(value) => `${value.toFixed(0)}%`} />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    name === 'total' ? `$${value.toLocaleString()}` : `${value.toFixed(1)}%`,
                    name === 'total' ? 'Ingresos' : 'Participación'
                  ]}
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e0e0e0', borderRadius: '8px' }}
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
                    className="bg-white rounded-xl p-3 transition-all duration-300 shadow-sm hover:shadow-lg border border-gray-200/80"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.05 }}
                  >
                    <div className="flex items-center justify-between space-x-3">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <span className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-white font-bold text-xs ${
                          index === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-500' :
                          index === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-500' :
                          index === 2 ? 'bg-gradient-to-br from-orange-400 to-amber-600' :
                          'bg-gradient-to-br from-blue-500 to-indigo-600'
                        }`}>
                          {index + 1}
                        </span>
                        <p className="text-sm font-semibold text-gray-800 truncate" title={displayName}>
                          {displayName}
                        </p>
                      </div>
                      <div className="flex items-center space-x-4 text-right">
                        <div className="hidden sm:block">
                          <p className="text-xs text-gray-500">Órdenes</p>
                          <p className="text-sm font-medium text-gray-800">{performer.orders}</p>
                        </div>
                        <div className="hidden md:block">
                          <p className="text-xs text-gray-500">Promedio</p>
                          <p className="text-sm font-medium text-gray-800">${performer.avgOrderValue.toFixed(0)}</p>
                        </div>
                        <div className="w-24">
                          <p className="text-xs text-gray-500">Total Ingresos</p>
                          <p className="text-base font-bold text-blue-700">${performer.revenue.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </ChartContainer>

          <motion.div 
            className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <Eye className="text-blue-600" size={24} />
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">Detalle de Transacciones</h3>
                    <p className="text-sm text-gray-600">
                      Mostrando {filteredSales.length} de {allSales.length} transacciones
                    </p>
                  </div>
                </div>
                <div className="relative w-full max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por Nº Pedido, producto..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    {['Nº Pedido', 'Venta', 'Entrega', 'Vendedor', 'Producto', 'Tipo', 'Detalles', 'Subtotal'].map(header => (
                      <th key={header} className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <AnimatePresence>
                    {filteredSales.slice(0, 100).map((sale, index) => (
                      <motion.tr
                        key={`${sale.order_id}-${sale.product_name}-${index}`}
                        className="hover:bg-blue-50/50 transition-colors"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3, delay: index * 0.02 }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-blue-600">
                            #{sale.order_no || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {new Date(sale.order_date).toLocaleDateString('es-ES')}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(sale.order_date).toLocaleTimeString('es-ES', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {sale.delivery_date ? (
                            <div className="text-sm font-medium text-gray-700">
                              {new Date(sale.delivery_date).toLocaleDateString('es-ES')}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">Pendiente</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs font-bold">
                                {((sale.seller_full_name || 'N/A').split(' ').map(n => n[0])).join('')}
                              </span>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {sale.seller_full_name || 'N/A'}
                              </div>
                              <div className="text-xs text-gray-500">{sale.seller_role || 'Sin rol'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 font-medium">{sale.product_name}</div>
                          <div className="text-xs text-gray-500">{sale.branch || 'Sin sucursal'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap space-y-1">
                          {sale.sale_type && (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              sale.sale_type === 'Por Mayor' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {sale.sale_type}
                            </span>
                          )}
                          {sale.order_type && (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              sale.order_type === 'Encomienda' ? 'bg-orange-100 text-orange-800' : 'bg-sky-100 text-sky-800'
                            }`}>
                              {sale.order_type}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <span className="inline-flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full text-sm font-semibold text-gray-700">
                              {sale.quantity}
                            </span>
                            <button 
                              onClick={() => setModalImageSrc(sale.product_image_url)} 
                              disabled={!sale.product_image_url} 
                              className="p-2 rounded-full hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              title="Ver foto del producto"
                            >
                              <ImageIcon className="w-5 h-5 text-gray-600" />
                            </button>
                            <button 
                              onClick={() => setModalImageSrc(sale.payment_proof_url)} 
                              disabled={!sale.payment_proof_url}
                              className="p-2 rounded-full hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              title="Ver comprobante de pago"
                            >
                              <CreditCard className="w-5 h-5 text-gray-600" />
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="text-lg font-bold text-gray-900">
                            ${sale.subtotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
            {filteredSales.length > 100 && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                <p className="text-sm text-gray-600 text-center">
                  Mostrando las primeras 100 transacciones. Usa los filtros para refinar los resultados.
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </>
  );
}