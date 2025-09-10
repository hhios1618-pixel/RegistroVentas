'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, DollarSign, ShoppingCart, Target, BarChart3, Search, ChevronsUpDown, ChevronUp, ChevronDown, Building, Users } from 'lucide-react';

// --- TIPOS ---
interface SellerSummary {
  seller_name: string;
  branch: string;
  total_sales: number;
  orders_count: number;
  ad_spend: number;
  roas: number | null;
}
type SortKey = keyof Omit<SellerSummary, 'seller_name' | 'branch'>;

// --- SUB-COMPONENTE: Tabla de Vendedores Ordenable ---
const SellerSortableTable = ({ sellers }: { sellers: SellerSummary[] }) => {
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>({ key: 'total_sales', direction: 'desc' });

  const sortedSellers = useMemo(() => {
    let data = [...sellers];
    if (sortConfig !== null) {
      data.sort((a, b) => {
        const aValue = a[sortConfig.key] ?? -1;
        const bValue = b[sortConfig.key] ?? -1;
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return data;
  }, [sellers, sortConfig]);

  const requestSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: SortKey) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ChevronsUpDown className="w-4 h-4 text-gray-400 ml-2" />;
    }
    return sortConfig.direction === 'desc' 
      ? <ChevronDown className="w-4 h-4 text-blue-600 ml-2" /> 
      : <ChevronUp className="w-4 h-4 text-blue-600 ml-2" />;
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Asesor/Promotor</th>
            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
              <button onClick={() => requestSort('orders_count')} className="flex items-center">Pedidos {getSortIcon('orders_count')}</button>
            </th>
            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
              <button onClick={() => requestSort('total_sales')} className="flex items-center">Ventas Totales {getSortIcon('total_sales')}</button>
            </th>
            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
              <button onClick={() => requestSort('ad_spend')} className="flex items-center">Gasto en Ads {getSortIcon('ad_spend')}</button>
            </th>
            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
              <button onClick={() => requestSort('roas')} className="flex items-center">ROAS {getSortIcon('roas')}</button>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedSellers.map((seller) => (
            <tr key={seller.seller_name} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-semibold text-gray-900">{seller.seller_name}</div></td>
              <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-800">{seller.orders_count}</div></td>
              <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-bold text-blue-600">Bs {seller.total_sales.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</div></td>
              <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-red-600">Bs {seller.ad_spend.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</div></td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${seller.roas === null ? 'bg-gray-100 text-gray-800' : seller.roas >= 3 ? 'bg-green-100 text-green-800' : seller.roas >= 1 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
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

// --- COMPONENTE DE LA PÁGINA PRINCIPAL ---
export default function VendedoresReportPage() {
  const [summaryData, setSummaryData] = useState<SellerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchSellerData = async () => {
      setLoading(true); setError(null);
      try {
        const response = await fetch('/endpoints/vendedores/reporte');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'No se pudieron cargar los datos');
        }
        const data = await response.json();
        setSummaryData(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchSellerData();
  }, []);

  const filteredData = useMemo(() => {
    if (!searchTerm) return summaryData;
    return summaryData.filter(s => s.seller_name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [summaryData, searchTerm]);

  const groupedByBranch = useMemo(() => {
    const groups: { [key: string]: SellerSummary[] } = {};
    filteredData.forEach(seller => {
      const branch = seller.branch || 'Sin Asignar';
      if (!groups[branch]) {
        groups[branch] = [];
      }
      groups[branch].push(seller);
    });
    // --- ORDEN DE GRUPOS PERSONALIZADO ---
    const branchOrder = ['Santa Cruz', 'Cochabamba', 'La Paz', 'El Alto', 'Sucre', 'Promotores', 'Sin Asignar'];
    return Object.entries(groups).sort(([a], [b]) => {
        const indexA = branchOrder.indexOf(a);
        const indexB = branchOrder.indexOf(b);
        if (indexA === -1) return 1; // Pone al final los no encontrados
        if (indexB === -1) return -1;
        return indexA - indexB;
    });
  }, [filteredData]);
  
  if (loading) { return <div>Cargando...</div> }
  if (error) { return <div>Error: {error}</div> }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
            <h1 className="text-3xl font-bold text-gray-800">Reporte de Vendedores</h1>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <div className="relative w-full max-w-xs ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar asesor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-8">
          {groupedByBranch.map(([branchName, sellersInBranch]) => (
            <motion.div
              key={branchName}
              className="bg-white rounded-2xl shadow-lg border border-gray-100"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="text-xl font-bold text-gray-800 flex items-center space-x-3">
                  {branchName === 'Promotores' ? <Users size={22} className="text-purple-600" /> : <Building size={22} className="text-blue-600" />}
                  <span>{branchName}</span>
                  <span className="text-sm font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{sellersInBranch.length} Personas</span>
                </h3>
              </div>
              <div className="p-4">
                <SellerSortableTable sellers={sellersInBranch} />
              </div>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}