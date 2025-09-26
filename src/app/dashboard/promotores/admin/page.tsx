'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, Search, Filter, TrendingUp, Users, 
  ShoppingCart, DollarSign, MapPin, BarChart3,
  RefreshCw, Download, Eye, ChevronDown, ChevronUp,
  Package, Target, Award, Zap
} from 'lucide-react';

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
   Componentes UI
   ========================================================================= */
const KpiCard = ({ 
  title, 
  value, 
  icon,
  color = 'blue',
  trend,
  subtitle
}: { 
  title: string; 
  value: string; 
  icon: React.ReactNode;
  color?: 'blue' | 'green' | 'orange' | 'purple';
  trend?: number;
  subtitle?: string;
}) => {
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
      className="glass-card hover:shadow-apple-lg transition-all duration-300"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 bg-gradient-to-br ${colorClasses[color]} rounded-apple border`}>
          <div className="text-xl">{icon}</div>
        </div>
        {typeof trend === 'number' && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-apple-caption2 font-semibold ${
            trend >= 0 
              ? 'bg-apple-green-500/20 text-apple-green-300 border border-apple-green-500/30' 
              : 'bg-apple-red-500/20 text-apple-red-300 border border-apple-red-500/30'
          }`}>
            {trend >= 0 ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            <span>{Math.abs(trend).toFixed(1)}%</span>
          </div>
        )}
      </div>
      
      <div className="space-y-2">
        <p className="apple-caption text-apple-gray-400">{title}</p>
        <p className="apple-h2 text-white">{value}</p>
        {subtitle && <p className="apple-caption text-apple-gray-500">{subtitle}</p>}
      </div>
    </motion.div>
  );
};

const OriginCard = ({ byOrigin }: { byOrigin: Record<string, number> }) => {
  const total = Object.values(byOrigin).reduce((s, v) => s + v, 0);
  const topOrigin = Object.entries(byOrigin).sort(([,a], [,b]) => b - a)[0];

  const originColors = {
    cochabamba: 'bg-apple-blue-500/20 text-apple-blue-300',
    lapaz: 'bg-apple-green-500/20 text-apple-green-300',
    elalto: 'bg-apple-orange-500/20 text-apple-orange-300',
    santacruz: 'bg-purple-500/20 text-purple-300',
    sucre: 'bg-apple-red-500/20 text-apple-red-300',
    encomienda: 'bg-yellow-500/20 text-yellow-300',
    tienda: 'bg-pink-500/20 text-pink-300',
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="glass-card hover:shadow-apple-lg transition-all duration-300"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 rounded-apple">
          <MapPin size={20} className="text-purple-400" />
        </div>
        <div>
          <p className="apple-caption text-apple-gray-400">Origen Principal</p>
          <p className="apple-h3 text-white">
            {topOrigin ? topOrigin[0].toUpperCase() : '—'}
          </p>
        </div>
      </div>
      
      <div className="space-y-3">
        {Object.entries(byOrigin)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 4)
          .map(([origin, value]) => {
            const pct = total > 0 ? (value / total) * 100 : 0;
            const colorClass = originColors[origin as keyof typeof originColors] || 'bg-white/10 text-white';
            
            return (
              <div key={origin} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`px-2 py-1 rounded-apple text-apple-caption2 font-medium ${colorClass}`}>
                    {origin.toUpperCase()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="apple-caption text-white font-medium">{pct.toFixed(1)}%</div>
                  <div className="apple-caption2 text-apple-gray-500">{fmtBs(value)}</div>
                </div>
              </div>
            );
          })}
      </div>
    </motion.div>
  );
};

const SkeletonRows = () => (
  <>
    {Array.from({ length: 6 }).map((_, i) => (
      <tr key={i} className="border-b border-white/5">
        {Array.from({ length: 7 }).map((__, j) => (
          <td key={j} className="px-3 py-2">
            <div 
              className="h-3 bg-white/10 rounded-apple animate-pulse" 
              style={{ width: `${60 + Math.random() * 40}%` }} 
            />
          </td>
        ))}
      </tr>
    ))}
  </>
);

const EmptyState = () => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="text-center py-12"
  >
    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-apple-gray-500/20 to-apple-gray-600/10 border border-apple-gray-500/30 rounded-apple-lg flex items-center justify-center">
      <Package size={24} className="text-apple-gray-400" />
    </div>
    <h4 className="apple-h3 text-white mb-2">Sin datos disponibles</h4>
    <p className="apple-body text-apple-gray-400">No hay registros que coincidan con los filtros aplicados</p>
  </motion.div>
);

/* =========================================================================
   Página Principal
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
  const [showDetails, setShowDetails] = useState(false);

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

  const groupingOptions = [
    { value: 'day', label: 'Por Día', icon: <Calendar size={16} /> },
    { value: 'week', label: 'Por Semana', icon: <BarChart3 size={16} /> },
    { value: 'month', label: 'Por Mes', icon: <TrendingUp size={16} /> },
    { value: 'promoter', label: 'Por Promotor', icon: <Users size={16} /> },
    { value: 'origin', label: 'Por Origen', icon: <MapPin size={16} /> },
  ];

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card mb-8"
      >
        <div className="flex items-center gap-4">
          <div className="p-4 bg-gradient-to-br from-apple-blue-500/20 to-apple-green-500/20 border border-apple-blue-500/30 rounded-apple-lg">
            <BarChart3 size={28} className="text-apple-blue-400" />
          </div>
          <div>
            <h1 className="apple-h1 mb-2">Dashboard de Promotores</h1>
            <p className="apple-body text-apple-gray-300">
              Análisis detallado de ventas y rendimiento por promotor
            </p>
          </div>
        </div>
      </motion.header>

      {/* Panel de filtros */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card mb-8"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-apple-blue-500/20 border border-apple-blue-500/30 rounded-apple">
            <Filter size={18} className="text-apple-blue-400" />
          </div>
          <h2 className="apple-h3 text-white">Filtros y Configuración</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
          {/* Fecha desde */}
          <div className="space-y-2">
            <label className="block apple-caption text-apple-gray-300">Desde</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="field"
            />
          </div>
          
          {/* Fecha hasta */}
          <div className="space-y-2">
            <label className="block apple-caption text-apple-gray-300">Hasta</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="field"
            />
          </div>

          {/* Agrupación */}
          <div className="space-y-2">
            <label className="block apple-caption text-apple-gray-300">Agrupar por</label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupingType)}
              className="field"
            >
              {groupingOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Promotor */}
          <div className="space-y-2">
            <label className="block apple-caption text-apple-gray-300">Promotor</label>
            <select
              value={selectedPromoter}
              onChange={(e) => setSelectedPromoter(e.target.value)}
              className="field"
            >
              <option value="">Todos los promotores</option>
              {uniquePromoters.map(promoter => (
                <option key={promoter} value={promoter}>{promoter}</option>
              ))}
            </select>
          </div>

          {/* Origen */}
          <div className="space-y-2">
            <label className="block apple-caption text-apple-gray-300">Origen</label>
            <select
              value={selectedOrigin}
              onChange={(e) => setSelectedOrigin(e.target.value)}
              className="field"
            >
              <option value="">Todos los orígenes</option>
              {uniqueOrigins.map(origin => (
                <option key={origin} value={origin}>{origin.toUpperCase()}</option>
              ))}
            </select>
          </div>

          {/* Botón actualizar */}
          <div className="flex items-end">
            <button
              onClick={load}
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Cargando...
                </>
              ) : (
                <>
                  <RefreshCw size={16} />
                  Actualizar
                </>
              )}
            </button>
          </div>
        </div>

        {/* Búsqueda */}
        <div className="space-y-2">
          <label className="block apple-caption text-apple-gray-300">Búsqueda global</label>
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-apple-gray-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por cliente, promotor, origen, producto..."
              className="field pl-10"
            />
          </div>
        </div>
      </motion.section>

      {/* KPIs */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <KpiCard 
            title="Total Registros" 
            value={fmtInt(kpis.totalLines)} 
            icon={<Package size={20} />}
            color="blue"
            trend={12.5}
            subtitle={`${filteredRows.length} transacciones`}
          />
          <KpiCard 
            title="Items Vendidos" 
            value={fmtInt(kpis.items)} 
            icon={<ShoppingCart size={20} />}
            color="green"
            trend={8.3}
            subtitle="Unidades totales"
          />
          <KpiCard 
            title="Ingresos Totales" 
            value={fmtBs(kpis.totalBs)} 
            icon={<DollarSign size={20} />}
            color="orange"
            trend={15.7}
            subtitle="Bolivianos generados"
          />
          <OriginCard byOrigin={kpis.byOrigin} />
        </div>
      </motion.section>

      {/* Top Promotores */}
      {topPromoters.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <div className="glass-card">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-apple-green-500/20 border border-apple-green-500/30 rounded-apple">
                <Award size={18} className="text-apple-green-400" />
              </div>
              <h3 className="apple-h3 text-white">Top 10 Promotores</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {topPromoters.slice(0, 5).map((promoter, index) => (
                <motion.div
                  key={promoter.promoter}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className="p-4 bg-white/5 border border-white/10 rounded-apple hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-apple-caption2 font-bold ${
                      index === 0 ? 'bg-yellow-500/20 text-yellow-300' :
                      index === 1 ? 'bg-gray-500/20 text-gray-300' :
                      index === 2 ? 'bg-orange-500/20 text-orange-300' :
                      'bg-apple-blue-500/20 text-apple-blue-300'
                    }`}>
                      {index + 1}
                    </div>
                    <span className="apple-caption1 text-white font-medium truncate">
                      {promoter.promoter}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="apple-caption2 text-apple-green-400 font-semibold">
                      {fmtBs(promoter.bs)}
                    </div>
                    <div className="apple-caption2 text-apple-gray-400">
                      {fmtInt(promoter.items)} items
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {/* Tabla de agrupaciones */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mb-8"
      >
        <div className="glass-card">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-apple-orange-500/20 border border-apple-orange-500/30 rounded-apple">
                <BarChart3 size={18} className="text-apple-orange-400" />
              </div>
              <h3 className="apple-h3 text-white">
                Resumen {groupingOptions.find(g => g.value === groupBy)?.label}
              </h3>
              <div className="badge badge-primary">{groupedData.length}</div>
            </div>
            
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="btn-ghost"
            >
              <Eye size={16} />
              {showDetails ? 'Ocultar' : 'Ver'} Detalles
            </button>
          </div>
          
          <div className="overflow-x-auto">
            {loading ? (
              <table className="table-apple">
                <thead>
                  <tr>
                    <th>Período</th>
                    <th className="text-right">Items</th>
                    <th className="text-right">Total Bs</th>
                    <th className="text-center">Promotores</th>
                    <th className="text-center">Orígenes</th>
                  </tr>
                </thead>
                <tbody>
                  <SkeletonRows />
                </tbody>
              </table>
            ) : groupedData.length === 0 ? (
              <EmptyState />
            ) : (
              <table className="table-apple">
                <thead>
                  <tr>
                    <th>
                      {groupBy === 'day' ? 'Día' : 
                       groupBy === 'week' ? 'Semana' : 
                       groupBy === 'month' ? 'Mes' : 
                       groupBy === 'promoter' ? 'Promotor' : 'Origen'}
                    </th>
                    <th className="text-right">Items</th>
                    <th className="text-right">Total Bs</th>
                    <th className="text-center">Promotores</th>
                    <th className="text-center">Orígenes</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedData.map((group, i) => (
                    <motion.tr
                      key={group.key}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.05 }}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td>
                        <div className="apple-body text-white font-medium">{group.label}</div>
                      </td>
                      <td className="text-right">
                        <div className="apple-body text-white font-medium">{fmtInt(group.items)}</div>
                      </td>
                      <td className="text-right">
                        <div className="apple-body text-apple-green-400 font-semibold">
                          {fmtBs(group.totalBs)}
                        </div>
                      </td>
                      <td className="text-center">
                        <div className="badge badge-primary">{group.promoters.size}</div>
                      </td>
                      <td className="text-center">
                        <div className="badge badge-secondary">{group.origins.size}</div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </motion.section>

      {/* Tabla de detalle */}
      <AnimatePresence>
        {showDetails && (
          <motion.section
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="glass-card"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 border border-purple-500/30 rounded-apple">
                  <Target size={18} className="text-purple-400" />
                </div>
                <h3 className="apple-h3 text-white">
                  Detalle de Transacciones
                </h3>
                <div className="badge badge-primary">{fmtInt(filteredRows.length)}</div>
              </div>
              
              <button className="btn-secondary">
                <Download size={16} />
                Exportar
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="table-apple">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Promotor</th>
                    <th>Origen</th>
                    <th>Producto</th>
                    <th className="text-right">Cant.</th>
                    <th className="text-right">P. Unit.</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && <SkeletonRows />}
                  {!loading && filteredRows.length === 0 && (
                    <tr>
                      <td colSpan={7}>
                        <EmptyState />
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    filteredRows.slice(0, 50).map((r, index) => {
                      const total = r.quantity * r.unit_price;
                      return (
                        <motion.tr
                          key={r.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.02 }}
                          className="hover:bg-white/5 transition-colors"
                        >
                          <td>
                            <div className="apple-caption text-apple-gray-300">
                              {new Date(r.sale_date || r.created_at).toLocaleDateString('es-BO', { 
                                day: '2-digit', 
                                month: '2-digit',
                                year: '2-digit'
                              })}
                            </div>
                          </td>
                          <td>
                            <div className="apple-body text-apple-blue-300 font-medium">
                              {r.promoter_name}
                            </div>
                          </td>
                          <td>
                            <div className="badge badge-secondary uppercase">
                              {r.origin}
                            </div>
                          </td>
                          <td>
                            <div className="apple-caption text-white truncate max-w-xs" title={r.product_name}>
                              {r.product_name}
                            </div>
                          </td>
                          <td className="text-right">
                            <div className="apple-body text-white font-medium">{fmtInt(r.quantity)}</div>
                          </td>
                          <td className="text-right">
                            <div className="apple-caption text-apple-gray-300">{fmtBs(r.unit_price)}</div>
                          </td>
                          <td className="text-right">
                            <div className="apple-body text-apple-green-400 font-semibold">{fmtBs(total)}</div>
                          </td>
                        </motion.tr>
                      );
                    })}
                </tbody>
              </table>
              
              {!loading && filteredRows.length > 50 && (
                <div className="p-4 text-center border-t border-white/10">
                  <p className="apple-caption text-apple-gray-400">
                    Mostrando los primeros 50 registros de {fmtInt(filteredRows.length)} total.
                  </p>
                </div>
              )}
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
