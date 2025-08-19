'use client';

import { useEffect, useState, type ReactNode } from 'react';
import supabase from '@/lib/supabaseClient';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts';
import { DollarSign, PackageCheck, Package, Clock, AlertCircle, ShoppingBag, Filter, TrendingUp, BarChart3, Calendar } from 'lucide-react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { subDays, format } from 'date-fns';

interface DashboardData {
  kpis: {
    total_revenue: number;
    completed_orders_count: number;
    average_ticket: number;
    pending_revenue: number;
    pending_orders_count: number;
  };
  sales_over_time: { date: string; Ventas: number }[];
  sales_funnel: { stage: string; order_count: number; total_value: number }[];
  sales_by_branch: { name: string; Ventas: number }[];
  top_products: { product_name: string; total_quantity: number; total_revenue: number }[];
}

// Colores profesionales para el funnel
const FUNNEL_COLORS = [
  '#3b82f6', // blue-500
  '#6366f1', // indigo-500  
  '#8b5cf6', // violet-500
  '#a855f7', // purple-500
  '#d946ef', // fuchsia-500
];

// Componente de Funnel personalizado y moderno
const CustomFunnelChart = ({ data }: { data: any[] }) => {
  if (!data || data.length === 0) return <EmptyState message="No hay datos del funnel disponibles." />;
  
  // Calcular el máximo para normalizar las barras
  const maxValue = Math.max(...data.map(item => item.order_count));
  
  // Preparar datos con porcentajes y colores
  const processedData = data.map((item, index) => ({
    ...item,
    percentage: ((item.order_count / maxValue) * 100).toFixed(1),
    color: FUNNEL_COLORS[index % FUNNEL_COLORS.length],
    stage_formatted: typeof item.stage === 'string' 
      ? item.stage.charAt(0).toUpperCase() + item.stage.slice(1) 
      : item.stage
  }));

  return (
    <div className="space-y-6">
      {/* Versión visual moderna del funnel */}
      <div className="space-y-4">
        {processedData.map((item, index) => (
          <div key={index} className="group relative">
            {/* Contenedor principal de la etapa */}
            <div className="flex items-center space-x-4">
              {/* Número de etapa */}
              <div 
                className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg transition-transform duration-300 group-hover:scale-110"
                style={{ backgroundColor: item.color }}
              >
                {index + 1}
              </div>
              
              {/* Barra de progreso visual */}
              <div className="flex-1 relative">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-slate-800 text-lg group-hover:text-slate-900 transition-colors duration-300">
                    {item.stage_formatted}
                  </h4>
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="font-bold text-slate-900">
                      {item.order_count.toLocaleString('es-CL')} pedidos
                    </span>
                    <span className="text-emerald-600 font-semibold">
                      ${item.total_value.toLocaleString('es-CL')}
                    </span>
                  </div>
                </div>
                
                {/* Barra de progreso */}
                <div className="relative h-10 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden group-hover:shadow-lg"
                    style={{ 
                      width: `${item.percentage}%`,
                      background: `linear-gradient(90deg, ${item.color}, ${item.color}dd)`
                    }}
                  >
                    {/* Efecto de brillo animado */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent transform -skew-x-12 animate-pulse"></div>
                  </div>
                  
                  {/* Porcentaje dentro de la barra */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white font-bold text-sm drop-shadow-sm">
                      {item.percentage}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Línea conectora (excepto para el último elemento) */}
            {index < processedData.length - 1 && (
              <div className="ml-6 mt-3 mb-1">
                <div className="w-0.5 h-6 bg-gradient-to-b from-slate-300 to-slate-200"></div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Gráfico de barras complementario */}
      <div className="mt-8 p-6 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl border border-slate-200/50">
        <h4 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
          <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
          Vista Comparativa del Pipeline
        </h4>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={processedData} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
            <XAxis 
              type="number" 
              tickFormatter={(v) => `${v}`}
              tick={{ fontSize: 12, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              dataKey="stage_formatted" 
              type="category" 
              width={90} 
              tick={{ fontSize: 12, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip 
              formatter={(value, name) => [
                `${value} pedidos`,
                'Cantidad'
              ]}
              labelFormatter={(label) => `Etapa: ${label}`}
              contentStyle={{
                backgroundColor: 'white',
                border: 'none',
                borderRadius: '12px',
                boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
              }}
            />
            <Bar dataKey="order_count" radius={[0, 4, 4, 0]}>
              {processedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default function VentasDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([subDays(new Date(), 29), new Date()]);

  useEffect(() => {
    const [startDate, endDate] = dateRange;
    if (!startDate || !endDate) return;

    const loadData = async () => {
      setLoading(true);
      setError(null);
      const params = { start_date: format(startDate, 'yyyy-MM-dd'), end_date: format(endDate, 'yyyy-MM-dd') };
      console.log("Llamando a RPC con parámetros:", params);
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_dashboard_analytics', params);
      if (rpcError) {
        console.error("Error llamando a la función RPC:", rpcError);
        setError("Error al cargar los datos analíticos.");
        setLoading(false);
        return;
      }
      console.log("Datos recibidos de la función RPC:", rpcData);
      setData(rpcData);
      setLoading(false);
    };
    loadData();
  }, [dateRange]);

  const kpis = data?.kpis;

  if (error) return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-red-100">
        <div className="flex items-center text-red-600">
          <AlertCircle className="mr-3 h-6 w-6" />
          <span className="font-medium">{error}</span>
        </div>
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40">
      {/* Header con gradiente y glassmorphism */}
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-white/80 border-b border-white/20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Dashboard Analítico
                </h1>
                <p className="text-slate-500 mt-1 font-medium">Análisis de rendimiento de ventas en tiempo real</p>
              </div>
            </div>
            <div className="mt-4 sm:mt-0 flex items-center space-x-3">
              <Calendar className="h-5 w-5 text-slate-400" />
              <DatePicker
                selectsRange={true} 
                startDate={dateRange[0]} 
                endDate={dateRange[1]}
                onChange={(update: any) => setDateRange(update)} 
                isClearable={false}
                className="border-0 bg-white/70 backdrop-blur-sm rounded-xl px-4 py-3 text-sm font-medium shadow-lg ring-1 ring-slate-200/50 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all duration-200 w-64" 
                dateFormat="dd/MM/yyyy"
              />
            </div>
          </header>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center p-20">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              <div className="mt-4 text-center">
                <p className="text-slate-600 font-medium">Cargando métricas...</p>
              </div>
            </div>
          </div>
        ) : kpis ? (
          <div className="space-y-8 animate-in fade-in duration-700">
            {/* KPIs Section */}
            <section className="space-y-4">
              <div className="flex items-center space-x-3">
                <TrendingUp className="h-6 w-6 text-blue-600" />
                <h2 className="text-2xl font-bold text-slate-800">Resumen del Periodo</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                <KpiCard 
                  title="Ingresos Completados" 
                  value={`$${kpis.total_revenue.toLocaleString('es-CL')}`} 
                  icon={DollarSign} 
                  gradient="from-emerald-500 to-green-600"
                  bgGradient="from-emerald-50 to-green-50"
                  trend="+12.5%"
                />
                <KpiCard 
                  title="Pedidos Completados" 
                  value={kpis.completed_orders_count.toLocaleString('es-CL')} 
                  icon={PackageCheck} 
                  gradient="from-blue-500 to-indigo-600"
                  bgGradient="from-blue-50 to-indigo-50"
                  trend="+8.3%"
                />
                <KpiCard 
                  title="Ticket Promedio" 
                  value={`$${kpis.average_ticket.toLocaleString('es-CL', { maximumFractionDigits: 0 })}`} 
                  icon={ShoppingBag} 
                  gradient="from-purple-500 to-violet-600"
                  bgGradient="from-purple-50 to-violet-50"
                  trend="+5.7%"
                />
                <KpiCard 
                  title="Ingresos Pendientes" 
                  value={`$${kpis.pending_revenue.toLocaleString('es-CL')}`} 
                  icon={Clock} 
                  gradient="from-amber-500 to-orange-600"
                  bgGradient="from-amber-50 to-orange-50"
                  trend="-2.1%"
                />
                <KpiCard 
                  title="Pedidos Pendientes" 
                  value={kpis.pending_orders_count.toLocaleString('es-CL')} 
                  icon={Package} 
                  gradient="from-rose-500 to-pink-600"
                  bgGradient="from-rose-50 to-pink-50"
                  trend="-4.2%"
                />
              </div>
            </section>

            {/* Funnel Chart Mejorado */}
            <section className="animate-in slide-in-from-bottom-4 duration-700 delay-200">
              <ChartContainer 
                title="Pipeline de Ventas" 
                subtitle="Análisis del flujo completo de órdenes con vista moderna"
                icon={Filter}
              >
                <CustomFunnelChart data={data?.sales_funnel || []} />
              </ChartContainer>
            </section>
            
            {/* Charts Grid */}
            <section className="grid grid-cols-1 xl:grid-cols-2 gap-8 animate-in slide-in-from-bottom-4 duration-700 delay-300">
              <ChartContainer 
                title="Evolución de Ventas" 
                subtitle="Tendencia de ventas completadas"
                icon={TrendingUp}
              >
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data?.sales_over_time || []} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(d) => format(new Date(d), 'dd MMM')} 
                      tick={{ fontSize: 12, fill: '#64748b' }} 
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      tickFormatter={(v) => `$${Number(v).toLocaleString('es-CL', { notation: 'compact' })}`} 
                      tick={{ fontSize: 12, fill: '#64748b' }} 
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      formatter={(v) => [`$${Number(v).toLocaleString('es-CL')}`, "Ventas"]}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="Ventas" 
                      stroke="#3b82f6" 
                      strokeWidth={3} 
                      dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }} 
                      activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2, fill: 'white' }}
                      fill="url(#salesGradient)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>

              <ChartContainer 
                title="Ventas por Sucursal" 
                subtitle="Rendimiento por ubicación"
                icon={BarChart3}
              >
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data?.sales_by_branch || []} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                    <defs>
                      <linearGradient id="branchGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0.6}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis 
                      type="number" 
                      tickFormatter={(v) => `$${Number(v).toLocaleString('es-CL', { notation: 'compact' })}`}
                      tick={{ fontSize: 12, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      width={100} 
                      tick={{ fontSize: 12, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      formatter={(v) => [`$${Number(v).toLocaleString('es-CL')}`, "Ventas"]}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
                      }}
                    />
                    <Bar 
                      dataKey="Ventas" 
                      fill="url(#branchGradient)" 
                      radius={[0, 6, 6, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </section>
            
            {/* Top Products Table */}
            <section className="animate-in slide-in-from-bottom-4 duration-700 delay-400">
              <ChartContainer 
                title="Top 10 Productos" 
                subtitle="Productos con mayor rendimiento por ingresos"
                icon={Package}
              >
                <TopProductsTable products={data?.top_products || []} />
              </ChartContainer>
            </section>
          </div>
        ) : (
          <EmptyState message="No se encontraron datos para el período seleccionado." />
        )}
      </div>
    </main>
  );
}

const KpiCard = ({ 
  title, 
  value, 
  icon: Icon, 
  gradient = 'from-blue-500 to-indigo-600',
  bgGradient = 'from-blue-50 to-indigo-50',
  trend
}: { 
  title: string; 
  value: string; 
  icon: React.ElementType; 
  gradient?: string;
  bgGradient?: string;
  trend?: string;
}) => (
  <div className={`group relative overflow-hidden bg-gradient-to-br ${bgGradient} p-6 rounded-2xl shadow-sm border border-white/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}>
    <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
    <div className="relative">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl bg-gradient-to-r ${gradient} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        {trend && (
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
            trend.startsWith('+') ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
          }`}>
            {trend}
          </span>
        )}
      </div>
      <div>
        <p className="text-sm text-slate-600 font-medium mb-1">{title}</p>
        <p className="text-2xl font-bold text-slate-900 group-hover:text-slate-800 transition-colors duration-300">
          {value}
        </p>
      </div>
    </div>
  </div>
);

const ChartContainer = ({ 
  title, 
  subtitle, 
  children, 
  icon: Icon 
}: { 
  title: string; 
  subtitle?: string; 
  children: ReactNode; 
  icon?: React.ElementType;
}) => (
  <div className="group bg-white/70 backdrop-blur-sm p-8 rounded-2xl shadow-sm border border-white/50 hover:shadow-xl transition-all duration-300 hover:bg-white/80">
    <div className="flex items-start justify-between mb-6">
      <div className="flex items-center space-x-3">
        {Icon && (
          <div className="p-2 bg-gradient-to-r from-slate-600 to-slate-700 rounded-lg">
            <Icon className="h-5 w-5 text-white" />
          </div>
        )}
        <div>
          <h2 className="text-xl font-bold text-slate-800 group-hover:text-slate-900 transition-colors duration-300">
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
    <div className="h-auto">{children}</div>
  </div>
);

const EmptyState = ({ message = "Sin datos para mostrar." }: { message?: string }) => (
  <div className="flex flex-col items-center justify-center h-96 text-slate-500 bg-white/50 backdrop-blur-sm rounded-2xl border border-white/50">
    <div className="p-4 bg-slate-100 rounded-full mb-4">
      <AlertCircle className="h-10 w-10 text-slate-400" />
    </div>
    <p className="font-medium text-lg">{message}</p>
  </div>
);

const TopProductsTable = ({ products }: { products: { product_name: string; total_quantity: number; total_revenue: number }[]}) => {
  if (!products || products.length === 0) return <EmptyState message="No se vendieron productos en este período." />
  
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/50">
      <div className="overflow-y-auto max-h-80">
        <table className="w-full text-sm">
          <thead className="bg-gradient-to-r from-slate-50 to-slate-100 sticky top-0">
            <tr>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Producto
              </th>
              <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Cantidad
              </th>
              <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Ingresos
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/50">
            {products.map((p, index) => (
              <tr 
                key={index} 
                className="bg-white/50 hover:bg-white/80 transition-colors duration-200 group"
              >
                <td className="px-6 py-4 font-medium text-slate-900 group-hover:text-slate-800">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full opacity-60 group-hover:opacity-100 transition-opacity duration-200"></div>
                    <span className="truncate max-w-xs">{p.product_name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right text-slate-600 font-medium">
                  {p.total_quantity.toLocaleString('es-CL')}
                </td>
                <td className="px-6 py-4 text-right font-bold text-slate-900">
                  ${p.total_revenue.toLocaleString('es-CL')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};