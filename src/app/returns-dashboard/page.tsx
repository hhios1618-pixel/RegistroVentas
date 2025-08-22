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

// --- COMPONENTE MODAL PARA VISUALIZAR IMÁGENES ---
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

// --- DEFINICIÓN DE TIPOS PARA DEVOLUCIONES ---
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

// --- COMPONENTES DE UI REUTILIZABLES ---
const StatCard: React.FC<any> = ({ title, value, icon, gradient }) => (
    <motion.div className="relative overflow-hidden bg-white rounded-2xl shadow-xl border" style={{ background: gradient }} whileHover={{ scale: 1.02, y: -4 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: 'easeOut' }}>
        <div className="relative p-6">
            <div className="p-3 bg-white/20 rounded-xl text-white text-2xl mb-4">{icon}</div>
            <p className="text-white/80 text-sm font-medium">{title}</p>
            <p className="text-white text-3xl font-bold">{value}</p>
        </div>
    </motion.div>
);

const ChartContainer: React.FC<any> = ({ title, children, className = '', fixedHeight = true }) => (
    <motion.div className={`bg-white rounded-2xl shadow-xl border ${className}`} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: 'easeOut' }}>
        <div className="px-6 py-4 border-b"><h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><BarChart3 size={20} className="text-red-600" />{title}</h3></div>
        <div className="p-6">
            <div className={`w-full ${fixedHeight ? 'h-[400px]' : ''}`}>{children}</div>
        </div>
    </motion.div>
);

const AdvancedFilters: React.FC<any> = ({ filters, onFilterChange, uniqueBranches, onClearFilters }) => (
    <motion.div className="bg-white rounded-2xl shadow-xl border p-6 mb-8" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3"><Filter className="text-red-600" />Filtros de Devoluciones</h2>
            <button onClick={onClearFilters} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Limpiar Filtros</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <input type="date" name="startDate" value={filters.startDate} onChange={onFilterChange} className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-red-500" />
            <input type="date" name="endDate" value={filters.endDate} onChange={onFilterChange} className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-red-500" />
            <select name="branch" value={filters.branch} onChange={onFilterChange} className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-red-500">
                <option value="">Todas las Sucursales</option>
                {uniqueBranches.map((b: string) => <option key={b} value={b}>{b}</option>)}
            </select>
        </div>
    </motion.div>
);

// --- COMPONENTE PRINCIPAL DEL DASHBOARD ---
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
        const response = await fetch('/api/returns-report');
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
        const lowercasedTerm = searchTerm.toLowerCase();
        returnsData = returnsData.filter(ret => 
            ret.order_no.toString().includes(lowercasedTerm) ||
            ret.product_name.toLowerCase().includes(lowercasedTerm) ||
            ret.reason.toLowerCase().includes(lowercasedTerm) ||
            ret.seller_name.toLowerCase().includes(lowercasedTerm) ||
            ret.customer_name.toLowerCase().includes(lowercasedTerm)
        );
    }
    setFilteredReturns(returnsData);
  }, [allReturns, filters, searchTerm]);

  const stats = useMemo(() => {
    if (allReturns.length === 0) {
        return {
            uniqueBranches: [], totalAmountReturned: 0, totalItemsReturned: 0, totalReturns: 0,
            averageReturnValue: 0, returnsByBranch: [], returnsByReason: [], returnsTrend: []
        };
    }
    const totalReturned = filteredReturns.reduce((acc, r) => acc + r.return_amount, 0);
    const totalItems = filteredReturns.reduce((acc, r) => acc + r.quantity, 0);
    const totalEvents = new Set(filteredReturns.map(r => r.return_id)).size;
    const dailyReturns: { [key: string]: number } = {};
    filteredReturns.forEach(ret => {
        const date = new Date(ret.return_date).toISOString().split('T')[0];
        dailyReturns[date] = (dailyReturns[date] || 0) + ret.return_amount;
    });

    return {
      uniqueBranches: Array.from(new Set(allReturns.map(r => r.branch))).sort(),
      totalAmountReturned: totalReturned,
      totalItemsReturned: totalItems,
      totalReturns: totalEvents,
      averageReturnValue: totalEvents > 0 ? totalReturned / totalEvents : 0,
      returnsByBranch: Object.entries(filteredReturns.reduce((acc, {branch, return_amount}) => ({...acc, [branch]: (acc[branch] || 0) + return_amount}), {} as Record<string, number>)).map(([name, total]) => ({name, total})).sort((a,b) => b.total - a.total),
      returnsByReason: Object.entries(filteredReturns.reduce((acc, {reason}) => ({...acc, [reason]: (acc[reason] || 0) + 1}), {} as Record<string, number>)).map(([name, count]) => ({name, count})).sort((a,b) => b.count - a.count).slice(0, 5),
      returnsTrend: Object.entries(dailyReturns).map(([date, amount]) => ({ date: new Date(date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }), amount })).slice(-30),
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

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div></div>;
  if (error) return <div className="min-h-screen flex items-center justify-center p-4 text-center"><div className="p-8 bg-white rounded-2xl shadow-xl"><Zap className="text-red-600 mx-auto" size={32} /><h2 className="text-2xl font-bold mt-4">Error al cargar datos</h2><p>{error}</p></div></div>;

  return (
    <>
      <AnimatePresence>{modalImageSrc && <ImageModal src={modalImageSrc} onClose={() => setModalImageSrc(null)} />}</AnimatePresence>
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50">
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                    <CornerDownLeft size={28} /> Dashboard de Devoluciones
                </h1>
                <button onClick={exportToExcel} disabled={filteredReturns.length === 0} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50 transition-all">
                    <Download size={20} /> Exportar
                </button>
            </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
            <AdvancedFilters filters={filters} onFilterChange={handleFilterChange} uniqueBranches={stats.uniqueBranches} onClearFilters={clearFilters} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Monto Total Devuelto" value={`Bs ${stats.totalAmountReturned.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`} icon={<DollarSign />} gradient="linear-gradient(135deg, #EF4444 0%, #F87171 100%)" />
                <StatCard title="Total Devoluciones" value={stats.totalReturns.toLocaleString()} icon={<CornerDownLeft />} gradient="linear-gradient(135deg, #F97316 0%, #FB923C 100%)" />
                <StatCard title="Items Devueltos" value={stats.totalItemsReturned.toLocaleString()} icon={<Package />} gradient="linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)" />
                <StatCard title="Valor Promedio/Devolución" value={`Bs ${stats.averageReturnValue.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`} icon={<TrendingDown />} gradient="linear-gradient(135deg, #EAB308 0%, #FACC15 100%)" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <ChartContainer title="Tendencia de Devoluciones" className="lg:col-span-3">
                    <ResponsiveContainer>
                        <AreaChart data={stats.returnsTrend}>
                            <defs><linearGradient id="returnGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#EF4444" stopOpacity={0.8}/><stop offset="95%" stopColor="#EF4444" stopOpacity={0.1}/></linearGradient></defs>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" fontSize={12} />
                            <YAxis fontSize={12} tickFormatter={(value) => `Bs ${value.toLocaleString()}`} />
                            <Tooltip formatter={(value: number) => [`Bs ${value.toLocaleString()}`, 'Monto devuelto']} />
                            <Area type="monotone" dataKey="amount" stroke="#EF4444" fill="url(#returnGradient)" strokeWidth={3} />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartContainer>
                
                <ChartContainer title="Top 5 Motivos de Devolución" className="lg:col-span-2">
                    <ResponsiveContainer>
                        <BarChart data={stats.returnsByReason} layout="vertical" margin={{ left: 20, right: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" hide />
                            <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12, width: 110 }} interval={0} />
                            <Tooltip formatter={(value: number) => [value, 'Cantidad']} />
                            <Bar dataKey="count" fill="#F97316" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </div>

            <ChartContainer title="Monto Devuelto por Sucursal">
                <ResponsiveContainer>
                    <BarChart data={stats.returnsByBranch}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis fontSize={12} tickFormatter={(value) => `Bs ${value/1000}k`} />
                    <Tooltip formatter={(value: number) => [`Bs ${value.toLocaleString()}`, 'Total devuelto']} />
                    <Bar dataKey="total" fill="#EF4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </ChartContainer>
            
            <ChartContainer title="Detalle de Devoluciones" fixedHeight={false}>
                <div className="flex justify-between items-center mb-4">
                    <p className="text-sm text-gray-600">Mostrando {filteredReturns.length} de {allReturns.length} registros</p>
                    <div className="relative w-full max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input type="text" placeholder="Buscar por Nº Pedido, producto, motivo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-xl" />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                {['Nº Pedido Orig.', 'Fecha Dev.', 'Sucursal Dev.', 'Producto', 'Motivo', 'Método Dev.', 'Monto'].map(header => (
                                    <th key={header} className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">{header}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredReturns.slice(0, 100).map((ret, index) => (
                                <motion.tr key={`${ret.return_id}-${ret.product_name}-${index}`} className="hover:bg-red-50/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                    <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-bold text-red-600">#{ret.order_no}</div></td>
                                    <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-900">{new Date(ret.return_date).toLocaleDateString('es-ES')}</div></td>
                                    <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-900">{ret.branch}</div></td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-gray-900">{ret.product_name}</div>
                                        <div className="text-xs text-gray-500">Cantidad: {ret.quantity}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-sm text-gray-700" title={ret.reason}>
                                            <MessageSquareWarning size={16} className="text-orange-500 flex-shrink-0" />
                                            <span className="truncate max-w-[200px]">{ret.reason}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-gray-800">{ret.return_method}</span>
                                            {ret.return_proof_url && (
                                                <button onClick={() => setModalImageSrc(ret.return_proof_url)} className="p-1 rounded-full hover:bg-gray-200" title="Ver comprobante">
                                                  <CreditCard className="w-4 h-4 text-gray-600" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right"><div className="text-lg font-bold text-gray-900">Bs {ret.return_amount.toLocaleString()}</div></td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredReturns.length > 100 && (
                        <div className="text-center py-4 text-sm text-gray-500">Mostrando los primeros 100 registros. Use los filtros para acotar la búsqueda.</div>
                    )}
                </div>
            </ChartContainer>
        </main>
      </div>
    </>
  );
}