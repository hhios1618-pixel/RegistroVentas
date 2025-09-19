'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LabelList
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import { 
  TrendingUp, TrendingDown, DollarSign, Package, ShoppingCart, 
  BarChart3, Download, Calendar, Filter, Users, Target, 
  ArrowUpRight, ArrowDownRight, Eye, Zap, Award, Clock,
  PieChart as PieChartIcon, Activity, Briefcase, Star,
  ImageIcon, CreditCard, X as XIcon, Search, Sparkles, CheckSquare
} from 'lucide-react';

// === TIPOS Y DATOS ===
type PeriodOption = 'Este Mes' | 'Mes Pasado' | 'Este Año';

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

interface MonthlySummary {
  summary_date: string;
  branch: string;
  total_revenue: number;
  cantidad_productos: number;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'orange' | 'purple';
  comparison?: { value: number; label: string };
  subtitle?: string;
  children?: React.ReactNode;
}

interface ChartContainerProps {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

const APPLE_COLORS = {
  blue: '#3b82f6', green: '#22c55e', orange: '#f97316', purple: '#8b5cf6',
  red: '#ef4444', teal: '#14b8a6', yellow: '#eab308', pink: '#ec4899',
};

const CHART_COLORS = [
  APPLE_COLORS.blue, APPLE_COLORS.green, APPLE_COLORS.orange, APPLE_COLORS.purple,
  APPLE_COLORS.teal, APPLE_COLORS.red, APPLE_COLORS.yellow, APPLE_COLORS.pink,
];

// === UTILIDADES DE FECHA ===
const getDateRange = (period: PeriodOption): [Date, Date] => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  switch (period) {
    case 'Este Mes':
      return [new Date(year, month, 1), new Date(year, month + 1, 0, 23, 59, 59)];
    case 'Mes Pasado':
      return [new Date(year, month - 1, 1), new Date(year, month, 0, 23, 59, 59)];
    case 'Este Año':
      return [new Date(year, 0, 1), new Date(year, 11, 31, 23, 59, 59)];
    default:
      return [new Date(year, month, 1), new Date(year, month + 1, 0, 23, 59, 59)];
  }
};

// === COMPONENTES DE UI ===
const SegmentedControl: React.FC<{
  options: string[]; value: string; onChange: (value: any) => void;
}> = ({ options, value, onChange }) => (
  <div className="flex w-full space-x-1 rounded-apple bg-white/5 p-1">
    {options.map((option) => (
      <button
        key={option}
        onClick={() => onChange(option)}
        className="relative flex-1 rounded-[8px] px-3 py-1.5 text-apple-footnote font-medium text-apple-gray-300 transition-colors hover:bg-white/10"
      >
        {value === option && (
          <motion.div
            layoutId="active-period-pill"
            className="absolute inset-0 bg-apple-gray-600 rounded-[8px]"
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />
        )}
        <span className="relative z-10">{option}</span>
      </button>
    ))}
  </div>
);

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, comparison, subtitle, children }) => {
    const colorClasses = {
        blue: 'from-apple-blue-500/20 to-apple-blue-600/10 border-apple-blue-500/30 text-apple-blue-400',
        green: 'from-apple-green-500/20 to-apple-green-600/10 border-apple-green-500/30 text-apple-green-400',
        orange: 'from-apple-orange-500/20 to-apple-orange-600/10 border-apple-orange-500/30 text-apple-orange-400',
        purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400',
    };

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="glass-card hover:shadow-apple-lg transition-all duration-300 flex flex-col"
    >
      <div className="flex items-start justify-between">
        <div className={`p-3 bg-gradient-to-br ${colorClasses[color]} rounded-apple border`}>
          <div className="text-xl">{icon}</div>
        </div>
      </div>
      
      <div className="mt-4 space-y-2 flex-1">
        <p className="apple-caption text-apple-gray-400">{title}</p>
        <p className="apple-h2 text-white">{value}</p>
        {subtitle && <p className="apple-caption text-apple-gray-500">{subtitle}</p>}
      </div>
      
      {comparison && (
        <div className="mt-4 flex items-center gap-2 text-apple-footnote font-medium">
          <div className={`flex items-center gap-1 ${comparison.value >= 0 ? 'text-apple-green-400' : 'text-apple-red-400'}`}>
            {comparison.value >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            <span>{Math.abs(comparison.value).toFixed(1)}%</span>
          </div>
          <span className="text-apple-gray-500">{comparison.label}</span>
        </div>
      )}

      {children && (
        <div className="mt-4 pt-4 border-t border-white/10">
          {children}
        </div>
      )}
    </motion.div>
  );
};

const ChartContainer: React.FC<ChartContainerProps> = ({ title, children, actions, className = '', icon }) => (
  <motion.div 
    className={`glass-card ${className}`}
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, ease: 'easeOut' }}
  >
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="p-2 bg-apple-blue-500/20 border border-apple-blue-500/30 rounded-apple">
            {icon}
          </div>
        )}
        <h3 className="apple-h3 text-white">{title}</h3>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
    <div className="w-full h-[400px]">
      {children}
    </div>
  </motion.div>
);

// === COMPONENTE PRINCIPAL ===
export default function SalesReportPage() {
  const [allSales, setAllSales] = useState<SaleRecord[]>([]);
  const [historicalSummary, setHistoricalSummary] = useState<MonthlySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodOption>('Este Mes');
  
  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [salesResponse, summaryResponse] = await Promise.all([
          fetch('/endpoints/sales-report'),
          fetch('/endpoints/sales-summary')
        ]);
        if (!salesResponse.ok || !summaryResponse.ok) throw new Error('Error al cargar los datos.');
        
        const salesData = await salesResponse.json();
        const summaryData = await summaryResponse.json();

        setAllSales(salesData);
        setHistoricalSummary(summaryData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, []);

  const dashboardData = useMemo(() => {
    if (allSales.length === 0) return null;

    const [startDate, endDate] = getDateRange(period);
    
    const getComparisonDates = (start: Date, end: Date): [Date, Date] => {
        const diff = end.getTime() - start.getTime();
        return [new Date(start.getTime() - diff), new Date(end.getTime() - diff)];
    };

    const [prevStartDate, prevEndDate] = getComparisonDates(startDate, endDate);
    
    const filterSalesByDate = (sales: SaleRecord[], start: Date, end: Date) => 
        sales.filter(s => {
            const saleDate = new Date(s.order_date);
            return saleDate >= start && saleDate <= end;
        });

    const currentSales = filterSalesByDate(allSales, startDate, endDate);
    const previousSales = filterSalesByDate(allSales, prevStartDate, prevEndDate);

    const calculateMetrics = (sales: SaleRecord[]) => {
        const revenue = sales.reduce((sum, s) => sum + s.subtotal, 0);
        const products = sales.reduce((sum, s) => sum + s.quantity, 0);
        const averageTicket = products > 0 ? revenue / products : 0;
        const salesByBranch = sales.reduce((acc, s) => {
            const branch = s.branch || 'Sin Sucursal';
            acc[branch] = (acc[branch] || 0) + s.subtotal;
            return acc;
        }, {} as Record<string, number>);

        return { revenue, products, averageTicket, salesByBranch };
    };

    const currentMetrics = calculateMetrics(currentSales);
    const previousMetrics = calculateMetrics(previousSales);
    
    const calculateChange = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
    };
    
    // Datos para la tabla de desglose por sucursal
    const branchPerformance = Object.entries(currentMetrics.salesByBranch)
        .map(([name, revenue]) => ({
            name,
            revenue,
            percentage: currentMetrics.revenue > 0 ? (revenue / currentMetrics.revenue) * 100 : 0,
        }))
        .sort((a, b) => b.revenue - a.revenue);
        
    // Datos para el gráfico de tendencia (últimos 12 meses)
    const trendData = historicalSummary
      .map(s => ({...s, summary_date: new Date(s.summary_date)}))
      .sort((a, b) => a.summary_date.getTime() - b.summary_date.getTime())
      .slice(-12)
      .map(s => ({
        name: s.summary_date.toLocaleString('es-BO', { month: 'short', year: '2-digit' }),
        Ingresos: s.total_revenue,
      }));

    return {
        kpis: {
            revenue: currentMetrics.revenue,
            products: currentMetrics.products,
            averageTicket: currentMetrics.averageTicket,
            revenueChange: calculateChange(currentMetrics.revenue, previousMetrics.revenue),
            productsChange: calculateChange(currentMetrics.products, previousMetrics.products),
            avgTicketChange: calculateChange(currentMetrics.averageTicket, previousMetrics.averageTicket),
        },
        branchPerformance,
        trendData,
    };
  }, [allSales, historicalSummary, period]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card text-center">
          <div className="animate-spin w-12 h-12 border-2 border-apple-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="apple-body text-white">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
         <div className="glass-card text-center max-w-md">
           <div className="text-apple-red-400 mb-4"><XIcon size={48} className="mx-auto" /></div>
           <h2 className="apple-h3 mb-2">Error al Cargar Datos</h2>
           <p className="apple-caption text-apple-gray-400 mb-4">{error || 'No se pudieron procesar los datos.'}</p>
           <button onClick={() => window.location.reload()} className="btn-primary">Reintentar</button>
         </div>
      </div>
    );
  }

  const { kpis, branchPerformance, trendData } = dashboardData;

  return (
    <div className="min-h-screen space-y-8">
      {/* === HEADER Y FILTRO PRINCIPAL === */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="glass-card"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-apple-blue-500/20 to-apple-green-500/20 border border-apple-blue-500/30 rounded-apple-lg">
              <BarChart3 size={28} className="text-apple-blue-400" />
            </div>
            <div>
              <h1 className="apple-h1 mb-2">Dashboard Gerencial</h1>
              <p className="apple-body text-apple-gray-300">Análisis de rendimiento financiero y operativo</p>
            </div>
          </div>
          <div className="w-full md:w-80">
             <SegmentedControl
                options={['Este Mes', 'Mes Pasado', 'Este Año']}
                value={period}
                onChange={setPeriod}
             />
          </div>
        </div>
      </motion.header>

      {/* SECCIÓN 1: VISTA GENERAL ESTRATÉGICA */}
      <motion.section>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Ingresos Totales"
            value={`Bs ${kpis.revenue.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`}
            icon={<DollarSign size={20} />}
            color="blue"
            comparison={{ value: kpis.revenueChange, label: 'vs período anterior' }}
          />
          <StatCard
            title="Productos Vendidos"
            value={kpis.products.toLocaleString('es-BO')}
            icon={<Package size={20} />}
            color="green"
            comparison={{ value: kpis.productsChange, label: 'vs período anterior' }}
          />
          <StatCard
            title="Ticket Promedio"
            value={`Bs ${kpis.averageTicket.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`}
            icon={<TrendingUp size={20} />}
            color="orange"
            comparison={{ value: kpis.avgTicketChange, label: 'vs período anterior' }}
          />
           <StatCard
            title="Sucursales Activas"
            value={branchPerformance.length}
            icon={<Briefcase size={20} />}
            color="purple"
            subtitle={`Principal: ${branchPerformance[0]?.name || 'N/A'}`}
          />
        </div>
      </motion.section>

      {/* SECCIÓN 2: ANÁLISIS COMPARATIVO Y TENDENCIAS */}
      <section className="space-y-8">
        <ChartContainer
          title="Tendencia de Ingresos (Últimos 12 Meses)"
          icon={<Activity size={18} className="text-apple-blue-400" />}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData}>
              <defs><linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={APPLE_COLORS.blue} stopOpacity={0.3}/><stop offset="95%" stopColor={APPLE_COLORS.blue} stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="name" stroke="rgba(255,255,255,0.6)" fontSize={12} />
              <YAxis stroke="rgba(255,255,255,0.6)" fontSize={12} tickFormatter={(value) => `Bs ${Number(value)/1000}k`} />
              <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', color: 'white', backdropFilter: 'blur(20px)' }} formatter={(value: any) => [`Bs ${value.toLocaleString('es-BO')}`, 'Ingresos']} />
              <Area type="monotone" dataKey="Ingresos" stroke={APPLE_COLORS.blue} fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </section>

      {/* SECCIÓN 3: DESGLOSE OPERATIVO */}
      <section className="space-y-8">
         <ChartContainer
            title={`Rendimiento por Sucursal (${period})`}
            icon={<Briefcase size={18} className="text-apple-green-400" />}
            className="!h-auto"
        >
          <div className="space-y-4">
            {branchPerformance.map((branch, index) => (
                <div key={branch.name} className="flex items-center gap-4 text-apple-body">
                    <span className="w-4 font-mono text-apple-gray-500">{index + 1}</span>
                    <span className="w-1/3 truncate text-white">{branch.name}</span>
                    <div className="flex-1 bg-white/10 rounded-full h-6 relative">
                        <motion.div
                            className={`h-6 rounded-full bg-gradient-to-r ${index === 0 ? 'from-apple-green-500 to-apple-teal-500' : 'from-apple-blue-600 to-apple-blue-500'}`}
                            style={{ width: `${branch.percentage}%`}}
                            initial={{ width: 0 }}
                            animate={{ width: `${branch.percentage}%`}}
                            transition={{ duration: 0.8, ease: 'easeOut', delay: index * 0.05 }}
                        />
                    </div>
                    <span className="w-32 text-right font-mono text-white">Bs {branch.revenue.toLocaleString('es-BO')}</span>
                    <span className="w-16 text-right font-mono text-apple-gray-400">{branch.percentage.toFixed(1)}%</span>
                </div>
            ))}
          </div>
        </ChartContainer>
      </section>
    </div>
  );
}