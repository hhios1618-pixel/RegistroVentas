'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { motion } from 'framer-motion';
import { DollarSign, Package, Users, TrendingUp, TrendingDown, Briefcase, Building, BarChartHorizontal } from 'lucide-react';

// === TIPOS DE DATOS FINANCIEROS ===
interface MonthlyData { [month: string]: number; }
interface BranchMonthlyData { [branch: string]: MonthlyData; }
interface FinancialSummary {
  ventaTotal: MonthlyData;
  productos: MonthlyData;
  ventaAsesores: MonthlyData;
  ventaPromotores: MonthlyData;
  montoVentaPorSucursal: BranchMonthlyData;
}

// === COLORES (Error corregido) ===
const APPLE_COLORS = {
  blue: '#3b82f6',
  green: '#22c55e',
  orange: '#f97316',
  purple: '#8b5cf6',
  red: '#ef4444',
  teal: '#14b8a6',
};

// === COMPONENTES UI ESPECIALIZADOS ===
const StatCardWithComparison: React.FC<{
  title: string;
  value: string;
  comparisonValue: number | null;
  icon: React.ReactNode;
}> = ({ title, value, comparisonValue, icon }) => {
  const isPositive = comparisonValue !== null && comparisonValue >= 0;
  return (
    <div className="glass-card">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-apple-gray-700/50 rounded-apple">{icon}</div>
        <div>
          <p className="apple-caption text-apple-gray-400">{title}</p>
          <p className="apple-h3 text-white">{value}</p>
        </div>
      </div>
      {comparisonValue !== null && (
        <div className={`mt-3 flex items-center gap-1 text-apple-footnote font-semibold ${isPositive ? 'text-apple-green-400' : 'text-apple-red-400'}`}>
          {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          <span>{comparisonValue.toFixed(1)}% vs mes anterior</span>
        </div>
      )}
    </div>
  );
};

const ChartContainer: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className = '' }) => (
  <div className={`glass-card h-auto ${className}`}>
    <h3 className="apple-body font-semibold text-white mb-6">{title}</h3>
    <div className="w-full h-[300px]">{children}</div>
  </div>
);

const Sparkline: React.FC<{ data: any[] }> = ({ data }) => (
  <ResponsiveContainer width="100%" height="100%">
    <AreaChart data={data}>
      <defs>
        <linearGradient id="sparkline-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor={APPLE_COLORS.blue} stopOpacity={0.4} />
          <stop offset="95%" stopColor={APPLE_COLORS.blue} stopOpacity={0} />
        </linearGradient>
      </defs>
      <Area type="monotone" dataKey="value" stroke={APPLE_COLORS.blue} strokeWidth={2} fill="url(#sparkline-gradient)" />
    </AreaChart>
  </ResponsiveContainer>
);

// === COMPONENTE PRINCIPAL DEL PANEL FINANCIERO ===
export default function FinancialControlPage() {
  const [data, setData] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  
  useEffect(() => {
    // Simulación de endpoint
    const mockData: FinancialSummary = {
      ventaTotal: { Mayo: 466369, Junio: 485189, Julio: 577947, Agosto: 517880.50 },
      productos: { Mayo: 8258, Junio: 5904, Julio: 7940, Agosto: 6254 },
      ventaAsesores: { Mayo: 466369, Junio: 369926, Julio: 417627, Agosto: 395300 },
      ventaPromotores: { Mayo: 0, Junio: 115263, Julio: 160320, Agosto: 122580.50 },
      montoVentaPorSucursal: {
        "La Paz": { Mayo: 45258, Junio: 23751, Julio: 21263, Agosto: 32504 },
        "El Alto": { Mayo: 24667, Junio: 39444, Julio: 34826, Agosto: 49589 },
        "Santa Cruz": { Mayo: 169549, Junio: 125375, Julio: 143023, Agosto: 147669 },
        "CCBA": { Mayo: 194462, Junio: 140486, Julio: 165935, Agosto: 116633 },
        "Sucre": { Mayo: 32433, Junio: 40870, Julio: 52580, Agosto: 48905 }
      },
    };
    setData(mockData);
    const months = Object.keys(mockData.ventaTotal);
    setSelectedMonth(months[months.length - 1]);
    setLoading(false);
  }, []);
  
  const { kpis, branchData, channelData, availableMonths } = useMemo(() => {
    if (!data) return { kpis: null, branchData: [], channelData: [], availableMonths: [] };

    const months = Object.keys(data.ventaTotal);
    const prevMonthIndex = months.indexOf(selectedMonth) - 1;
    const prevMonth = prevMonthIndex >= 0 ? months[prevMonthIndex] : null;

    const getComparison = (metric: MonthlyData) => {
      if (!prevMonth) return null;
      const current = metric[selectedMonth] || 0;
      const previous = metric[prevMonth] || 0;
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const selectedKpis = {
      ventaTotal: { value: data.ventaTotal[selectedMonth] || 0, comparison: getComparison(data.ventaTotal) },
      productos: { value: data.productos[selectedMonth] || 0, comparison: getComparison(data.productos) },
      ventaAsesores: { value: data.ventaAsesores[selectedMonth] || 0, comparison: getComparison(data.ventaAsesores) },
      ventaPromotores: { value: data.ventaPromotores[selectedMonth] || 0, comparison: getComparison(data.ventaPromotores) },
    };

    const branches = Object.keys(data.montoVentaPorSucursal);
    const branchesForMonth = branches.map(branch => {
        const trend = months.map(month => ({ month, value: data.montoVentaPorSucursal[branch][month] || 0 }));
        return {
          name: branch,
          monto: data.montoVentaPorSucursal[branch][selectedMonth] || 0,
          trendData: trend
        };
    }).sort((a, b) => b.monto - a.monto);

    const channels = [
        { name: 'Asesores', value: data.ventaAsesores[selectedMonth] || 0 },
        { name: 'Promotores', value: data.ventaPromotores[selectedMonth] || 0 },
    ].filter(c => c.value > 0);

    return { kpis: selectedKpis, branchData: branchesForMonth, channelData: channels, availableMonths: months };
  }, [data, selectedMonth]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-apple-blue-500 border-t-transparent rounded-full" /></div>;
  if (!kpis) return <div className="text-center py-20 text-apple-red-400">Error al procesar los datos financieros.</div>;

  return (
    <div className="min-h-screen space-y-8">
      <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="apple-h1 mb-1">Control Financiero</h1>
          <p className="apple-body text-apple-gray-300">Análisis de rendimiento consolidado.</p>
        </div>
        <div className="w-full md:w-72">
          <label className="apple-caption text-apple-gray-400 mb-2">Mes de Análisis</label>
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="field">
            {availableMonths.map(month => <option key={month} value={month}>{month}</option>)}
          </select>
        </div>
      </motion.header>

      <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCardWithComparison title="Venta Total" value={`Bs ${kpis.ventaTotal.value.toLocaleString('es-BO')}`} comparisonValue={kpis.ventaTotal.comparison} icon={<DollarSign />} />
          <StatCardWithComparison title="Productos Vendidos" value={kpis.productos.value.toLocaleString('es-BO')} comparisonValue={kpis.productos.comparison} icon={<Package />} />
          <StatCardWithComparison title="Venta Asesores" value={`Bs ${kpis.ventaAsesores.value.toLocaleString('es-BO')}`} comparisonValue={kpis.ventaAsesores.comparison} icon={<Users />} />
          <StatCardWithComparison title="Venta Promotores" value={`Bs ${kpis.ventaPromotores.value.toLocaleString('es-BO')}`} comparisonValue={kpis.ventaPromotores.comparison} icon={<Briefcase />} />
        </div>
      </motion.section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
            <ChartContainer title={`Ranking de Ingresos por Sucursal - ${selectedMonth}`}>
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={branchData} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" horizontal={false} />
                        <XAxis type="number" stroke="rgba(255,255,255,0.6)" fontSize={12} tickFormatter={(v) => `Bs ${Number(v)/1000}k`} />
                        <YAxis type="category" dataKey="name" stroke="rgba(255,255,255,0.6)" fontSize={12} width={80} />
                        <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px' }} formatter={(v:any) => [`Bs ${v.toLocaleString('es-BO')}`, 'Ingresos']} cursor={{ fill: 'rgba(255,255,255,0.1)' }}/>
                        <Bar dataKey="monto" fill={APPLE_COLORS.blue} radius={[0, 8, 8, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </ChartContainer>
        </div>
        <div>
            <ChartContainer title={`Contribución por Canal - ${selectedMonth}`}>
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={channelData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} fill="#8884d8" paddingAngle={5}>
                             {channelData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={[APPLE_COLORS.blue, APPLE_COLORS.teal][index % 2]} />
                            ))}
                        </Pie>
                         <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px' }} formatter={(v:any) => `Bs ${v.toLocaleString('es-BO')}`} />
                        <Legend wrapperStyle={{ fontSize: '14px' }} />
                    </PieChart>
                </ResponsiveContainer>
            </ChartContainer>
        </div>
      </div>
        
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="glass-card">
        <h3 className="apple-body font-semibold text-white mb-6">Desglose y Tendencia por Sucursal</h3>
        <div className="overflow-x-auto">
            <table className="table-apple">
                <thead>
                    <tr>
                        <th>Sucursal</th>
                        <th className="text-right">Ingresos ({selectedMonth})</th>
                        <th className="w-1/3 text-center">Tendencia (Últimos 4 meses)</th>
                    </tr>
                </thead>
                <tbody>
                    {branchData.map(branch => (
                        <tr key={branch.name}>
                            <td className="font-medium text-white">{branch.name}</td>
                            <td className="text-right font-mono text-apple-green-400">Bs {branch.monto.toLocaleString('es-BO')}</td>
                            <td className="h-12">
                                <Sparkline data={branch.trendData} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </motion.div>
    </div>
  );
}