'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar,
  CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  Download, Filter, Search, DollarSign, ShoppingCart,
  Building, Users, ChevronUp, ChevronDown, ChevronsUpDown,
  Crown, Award, Star, Zap, Target
} from 'lucide-react';
import * as XLSX from 'xlsx'; // <--- LÍNEA AÑADIDA

// === TIPOS ===
// Tipo de dato que RECIBIMOS del API (lista de ventas individuales)
interface SaleRecord {
  seller_full_name: string | null;
  branch: string | null;
  subtotal: number;
  order_id: string;
}

// Tipo de dato que CALCULAMOS y USAMOS para renderizar la UI
interface SellerSummary {
  seller_name: string;
  branch: string;
  total_sales: number;
  orders_count: number;
  ad_spend: number;
  roas: number | null;
}

type SortKey = keyof Omit<SellerSummary, 'seller_name' | 'branch'>;

// === COLORES APPLE ===
const APPLE_COLORS = {
  blue: '#3b82f6',
  green: '#22c55e',
  orange: '#f97316',
  purple: '#8b5cf6',
  red: '#ef4444',
  teal: '#14b8a6',
};

// === COMPONENTES UI (INTACTOS) ===
const StatCard: React.FC<{
  title: string; 
  value: string | number; 
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'orange' | 'purple';
  subtitle?: string; 
  trend?: number;
}> = ({ title, value, icon, color, subtitle, trend }) => {
  const colorClasses = {
    blue: 'from-apple-blue-500/20 to-apple-blue-600/10 border-apple-blue-500/30',
    green: 'from-apple-green-500/20 to-apple-green-600/10 border-apple-green-500/30',
    orange: 'from-apple-orange-500/20 to-apple-orange-600/10 border-apple-orange-500/30',
    purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
  };

  const iconColors = {
    blue: 'text-apple-blue-400',
    green: 'text-apple-green-400',
    orange: 'text-apple-orange-400',
    purple: 'text-purple-400',
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
          <div className={`${iconColors[color]} text-xl`}>{icon}</div>
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

const ChartContainer: React.FC<{ 
  title: string; 
  children: React.ReactNode; 
  className?: string; 
  icon?: React.ReactNode;
}> = ({ title, children, className = '', icon }) => (
  <motion.div
    className={`glass-card ${className}`}
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, ease: 'easeOut' }}
  >
    <div className="flex items-center gap-3 mb-6">
      {icon && (
        <div className="p-2 bg-apple-blue-500/20 border border-apple-blue-500/30 rounded-apple">
          {icon}
        </div>
      )}
      <h3 className="apple-h3 text-white">{title}</h3>
    </div>
    
    <div className="w-full h-[400px]">
      {children}
    </div>
  </motion.div>
);

const FiltersBar: React.FC<{
  branches: string[];
  selectedBranch: string;
  onBranchChange: (branch: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onExport: () => void;
}> = ({ branches, selectedBranch, onBranchChange, searchTerm, onSearchChange, onExport }) => (
  <motion.div
    className="glass-card mb-8"
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
  >
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-apple-blue-500/20 border border-apple-blue-500/30 rounded-apple">
          <Filter size={18} className="text-apple-blue-400" />
        </div>
        <h2 className="apple-h3 text-white">Filtros y Búsqueda</h2>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-apple-gray-500" />
          <input
            type="text"
            placeholder="Buscar vendedor..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="field pl-10 min-w-64"
          />
        </div>
        
        <select
          value={selectedBranch}
          onChange={(e) => onBranchChange(e.target.value)}
          className="field min-w-48"
        >
          <option value="">Todas las sucursales</option>
          {branches.map(branch => (
            <option key={branch} value={branch}>{branch}</option>
          ))}
        </select>
        
        <button onClick={onExport} className="btn-primary">
          <Download size={18} />
          Exportar
        </button>
      </div>
    </div>
  </motion.div>
);

const SellersTable: React.FC<{
  sellers: SellerSummary[];
  sortKey: SortKey | null;
  sortDirection: 'asc' | 'desc';
  onSort: (key: SortKey) => void;
}> = ({ sellers, sortKey, sortDirection, onSort }) => {
  const getSortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ChevronsUpDown size={14} className="text-apple-gray-500" />;
    return sortDirection === 'asc' 
      ? <ChevronUp size={14} className="text-apple-blue-400" />
      : <ChevronDown size={14} className="text-apple-blue-400" />;
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown size={16} className="text-yellow-400" />;
    if (index === 1) return <Star size={16} className="text-gray-300" />;
    if (index === 2) return <Award size={16} className="text-orange-400" />;
    return <span className="w-6 text-center text-apple-gray-500 font-medium">{index + 1}</span>;
  };

  return (
    <motion.div
      className="glass-card"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-apple-green-500/20 border border-apple-green-500/30 rounded-apple">
          <Users size={18} className="text-apple-green-400" />
        </div>
        <h3 className="apple-h3 text-white">Ranking de Vendedores</h3>
        <div className="badge badge-primary">{sellers.length}</div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="table-apple">
          <thead>
            <tr>
              <th className="w-16">Rank</th>
              <th>Vendedor</th>
              <th>Sucursal</th>
              <th 
                className="cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => onSort('total_sales')}
              >
                <div className="flex items-center gap-2">Ventas Totales{getSortIcon('total_sales')}</div>
              </th>
              <th 
                className="cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => onSort('orders_count')}
              >
                <div className="flex items-center gap-2">Órdenes{getSortIcon('orders_count')}</div>
              </th>
              <th 
                className="cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => onSort('ad_spend')}
              >
                <div className="flex items-center gap-2">Inversión Pub.{getSortIcon('ad_spend')}</div>
              </th>
              <th 
                className="cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => onSort('roas')}
              >
                <div className="flex items-center gap-2">ROAS{getSortIcon('roas')}</div>
              </th>
            </tr>
          </thead>
          <tbody>
            {sellers.map((seller, index) => (
              <motion.tr
                key={seller.seller_name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="hover:bg-white/5 transition-colors"
              >
                <td><div className="flex items-center justify-center">{getRankIcon(index)}</div></td>
                <td><div className="font-medium text-white">{seller.seller_name}</div></td>
                <td>
                  <div className="flex items-center gap-2">
                    <Building size={14} className="text-apple-gray-500" />
                    <span className="text-apple-gray-300">{seller.branch}</span>
                  </div>
                </td>
                <td>
                  <div className="font-semibold text-apple-green-400">
                    Bs {seller.total_sales.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                  </div>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <ShoppingCart size={14} className="text-apple-blue-400" />
                    <span className="font-medium text-white">{seller.orders_count}</span>
                  </div>
                </td>
                <td>
                  <div className="text-apple-orange-400 font-medium">
                    Bs {seller.ad_spend.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                  </div>
                </td>
                <td>
                  <div className={`font-bold ${
                    seller.roas === null ? 'text-apple-gray-500' :
                    seller.roas >= 3 ? 'text-apple-green-400' :
                    seller.roas >= 2 ? 'text-apple-orange-400' : 'text-apple-red-400'
                  }`}>
                    {seller.roas === null ? 'N/A' : `${seller.roas.toFixed(2)}x`}
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        
        {sellers.length === 0 && (
          <div className="text-center py-12">
            <div className="text-apple-gray-500 mb-3"><Users size={48} className="mx-auto opacity-50" /></div>
            <div className="apple-body font-medium text-apple-gray-300 mb-1">No se encontraron vendedores</div>
            <div className="apple-caption text-apple-gray-500">Ajusta los filtros para ver más resultados</div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// === COMPONENTE PRINCIPAL ===
export default function VendedoresPage() {
  const [rawSales, setRawSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<SortKey | null>('total_sales');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const fetchSalesData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/endpoints/sales-report?channel=Asesor');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al cargar los datos');
        }
        const data = await response.json();
        setRawSales(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchSalesData();
  }, []);

  const { filteredSellers, branches, stats, chartData } = useMemo(() => {
    const sellerSummaryMap = new Map<string, {
      seller_name: string;
      branch: string;
      total_sales: number;
      orderIds: Set<string>;
      ad_spend: number; 
    }>();

    rawSales.forEach(sale => {
      const sellerName = sale.seller_full_name || 'Vendedor Desconocido';
      
      if (!sellerSummaryMap.has(sellerName)) {
        sellerSummaryMap.set(sellerName, {
          seller_name: sellerName,
          branch: sale.branch || 'Sin Sucursal',
          total_sales: 0,
          orderIds: new Set<string>(),
          ad_spend: 0,
        });
      }

      const summary = sellerSummaryMap.get(sellerName)!;
      summary.total_sales += sale.subtotal;
      summary.orderIds.add(sale.order_id);
    });

    let summarizedSellers: SellerSummary[] = Array.from(sellerSummaryMap.values()).map(summary => ({
      ...summary,
      orders_count: summary.orderIds.size,
      roas: null
    }));
    
    if (selectedBranch) {
      summarizedSellers = summarizedSellers.filter(s => s.branch === selectedBranch);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      summarizedSellers = summarizedSellers.filter(s => s.seller_name.toLowerCase().includes(term));
    }

    if (sortKey) {
      summarizedSellers.sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        
        if (aVal === null && bVal === null) return 0;
        if (aVal === null) return 1;
        if (bVal === null) return -1;
        
        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    const totalSales = summarizedSellers.reduce((sum, s) => sum + s.total_sales, 0);
    const totalOrders = summarizedSellers.reduce((sum, s) => sum + s.orders_count, 0);
    const totalAdSpend = summarizedSellers.reduce((sum, s) => sum + s.ad_spend, 0);
    const avgROAS = totalAdSpend > 0 ? totalSales / totalAdSpend : 0;

    return {
      filteredSellers: summarizedSellers,
      branches: Array.from(new Set(rawSales.map(s => s.branch).filter(Boolean) as string[])).sort(),
      stats: {
        totalSales,
        totalOrders,
        totalAdSpend,
        avgROAS,
        sellersCount: summarizedSellers.length,
        avgSalesPerSeller: summarizedSellers.length > 0 ? totalSales / summarizedSellers.length : 0,
      },
      chartData: {
        branchData: Array.from(
          summarizedSellers.reduce((acc, seller) => {
            const existing = acc.get(seller.branch) || { branch: seller.branch, sales: 0 };
            existing.sales += seller.total_sales;
            acc.set(seller.branch, existing);
            return acc;
          }, new Map<string, any>())
        ).map(([_, data]) => data),
        topSellers: summarizedSellers.slice(0, 10),
      },
    };
  }, [rawSales, selectedBranch, searchTerm, sortKey, sortDirection]);

  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  }, [sortKey]);

  const handleExport = useCallback(() => {
    const csvData = filteredSellers.map(s => ({
      'Vendedor': s.seller_name,
      'Sucursal': s.branch,
      'Ventas Totales (Bs)': s.total_sales,
      '# Órdenes': s.orders_count,
      'Inversión Pub. (Bs)': s.ad_spend,
      'ROAS': s.roas !== null ? s.roas.toFixed(2) : 'N/A'
    }));

    const ws = XLSX.utils.json_to_sheet(csvData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte Vendedores");
    XLSX.writeFile(wb, `reporte_vendedores_${new Date().toISOString().split('T')[0]}.xlsx`);
  }, [filteredSellers]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card text-center">
          <div className="animate-spin w-12 h-12 border-2 border-apple-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="apple-body text-white">Cargando reporte de vendedores...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card text-center max-w-md">
          <div className="text-apple-red-400 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="apple-h3 mb-2">Error al cargar datos</h2>
          <p className="apple-caption text-apple-gray-400 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="btn-primary"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-8">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="glass-card"
      >
        <div className="flex items-center gap-4">
          <div className="p-4 bg-gradient-to-br from-apple-green-500/20 to-apple-blue-500/20 border border-apple-green-500/30 rounded-apple-lg">
            <Users size={28} className="text-apple-green-400" />
          </div>
          <div>
            <h1 className="apple-h1 mb-2">Reporte de Vendedores</h1>
            <p className="apple-body text-apple-gray-300">
              Análisis de rendimiento y estadísticas de ventas por vendedor
            </p>
          </div>
        </div>
      </motion.header>

      <FiltersBar
        branches={branches}
        selectedBranch={selectedBranch}
        onBranchChange={setSelectedBranch}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onExport={handleExport}
      />

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Ventas Totales"
            value={`Bs ${stats.totalSales.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`}
            icon={<DollarSign size={20} />}
            color="blue"
            subtitle={`${stats.sellersCount} vendedores`}
            trend={12.5}
          />
          <StatCard
            title="Órdenes Procesadas"
            value={stats.totalOrders.toLocaleString('es-BO')}
            icon={<ShoppingCart size={20} />}
            color="green"
            subtitle="Total de pedidos"
            trend={8.2}
          />
          <StatCard
            title="Inversión Publicitaria"
            value={`Bs ${stats.totalAdSpend.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`}
            icon={<Zap size={20} />}
            color="orange"
            subtitle="Gasto en publicidad"
            trend={-2.1}
          />
          <StatCard
            title="ROAS Promedio"
            value={`${stats.avgROAS.toFixed(2)}x`}
            icon={<Target size={20} />}
            color="purple"
            subtitle="Retorno de inversión"
            trend={15.3}
          />
        </div>
      </motion.section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ChartContainer
          title="Ventas por Sucursal"
          icon={<Building size={18} className="text-apple-blue-400" />}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData.branchData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="branch" stroke="rgba(255,255,255,0.6)" fontSize={12} angle={-45} textAnchor="end" height={80} />
              <YAxis stroke="rgba(255,255,255,0.6)" fontSize={12} tickFormatter={(value) => `Bs ${value.toLocaleString('es-BO')}`} />
              <Tooltip
                contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', color: 'white', backdropFilter: 'blur(20px)' }}
                formatter={(value: any) => [`Bs ${value.toLocaleString('es-BO')}`, 'Ventas']}
              />
              <Bar dataKey="sales" fill={APPLE_COLORS.blue} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        <ChartContainer
          title="Top 10 Vendedores"
          icon={<Award size={18} className="text-apple-green-400" />}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData.topSellers} layout="vertical" margin={{ left: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis type="number" stroke="rgba(255,255,255,0.6)" fontSize={12} tickFormatter={(value) => `Bs ${value.toLocaleString('es-BO')}`} />
              <YAxis type="category" dataKey="seller_name" stroke="rgba(255,255,255,0.6)" fontSize={12} width={120} interval={0} />
              <Tooltip
                contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', color: 'white', backdropFilter: 'blur(20px)' }}
                formatter={(value: any) => [`Bs ${value.toLocaleString('es-BO')}`, 'Ventas']}
              />
              <Bar dataKey="total_sales" fill={APPLE_COLORS.green} radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      <SellersTable
        sellers={filteredSellers}
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSort={handleSort}
      />
    </div>
  );
}