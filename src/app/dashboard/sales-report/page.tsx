
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';

// --- Definiciones de Tipos (Interfaces) ---
interface SaleRecord {
  order_id: string;
  order_date: string;
  branch: string | null;
  seller_full_name: string | null;
  seller_role: string | null;
  product_name: string;
  quantity: number;
  subtotal: number;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

interface ChartContainerProps {
  title: string;
  children: React.ReactNode;
}

const PIE_CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

// --- Componentes de UI Reutilizables ---
const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color }) => (
  <motion.div
    className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-lg flex items-center justify-between"
    whileHover={{ scale: 1.03, boxShadow: '0px 10px 20px rgba(0,0,0,0.1)' }}
    transition={{ type: 'spring', stiffness: 300 }}
  >
    <div>
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
      <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">{value}</p>
    </div>
    <div className={`text-white p-3 rounded-full shadow-md`} style={{ backgroundColor: color }}>
      {icon}
    </div>
  </motion.div>
);

const ChartContainer: React.FC<ChartContainerProps> = ({ title, children }) => (
  <motion.div 
    className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, ease: 'easeOut' }}
  >
    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">{title}</h3>
    <div className="w-full h-[300px]">
      {children}
    </div>
  </motion.div>
);

// --- Componente Principal del Dashboard ---
export default function SalesReportPage() {
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

  const applyFilters = useCallback(() => {
    let salesData = [...allSales];
    if (filters.startDate) {
      salesData = salesData.filter(s => new Date(s.order_date) >= new Date(filters.startDate));
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999); // Incluir todo el día de fin
      salesData = salesData.filter(s => new Date(s.order_date) <= end);
    }
    if (filters.branch) {
      salesData = salesData.filter(s => s.branch === filters.branch);
    }
    if (filters.sellerRole) {
      salesData = salesData.filter(s => s.seller_role === filters.sellerRole);
    }
    setFilteredSales(salesData);
  }, [allSales, filters]);

  useEffect(() => {
    applyFilters();
  }, [filters, allSales, applyFilters]);

  const {
    uniqueBranches,
    uniqueRoles,
    totalRevenue,
    totalItemsSold,
    totalOrders,
    salesByBranch,
    salesByProduct,
  } = useMemo(() => {
    const branches = new Set<string>();
    const roles = new Set<string>();
    const branchSales: { [key: string]: number } = {};
    const productSales: { [key: string]: number } = {};

    filteredSales.forEach(sale => {
      if (sale.branch) branches.add(sale.branch);
      if (sale.seller_role) roles.add(sale.seller_role);
      branchSales[sale.branch || 'Sin Sucursal'] = (branchSales[sale.branch || 'Sin Sucursal'] || 0) + sale.subtotal;
      productSales[sale.product_name] = (productSales[sale.product_name] || 0) + sale.quantity;
    });

    return {
      uniqueBranches: Array.from(branches).sort(),
      uniqueRoles: Array.from(roles).sort(),
      totalRevenue: filteredSales.reduce((acc, s) => acc + s.subtotal, 0),
      totalItemsSold: filteredSales.reduce((acc, s) => acc + s.quantity, 0),
      totalOrders: new Set(filteredSales.map(s => s.order_id)).size,
      salesByBranch: Object.entries(branchSales).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total),
      salesByProduct: Object.entries(productSales).map(([name, quantity]) => ({ name, quantity })).sort((a, b) => b.quantity - a.quantity).slice(0, 5),
    };
  }, [filteredSales]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const exportToExcel = () => {
    const summaryData = [
      { Metrica: 'Ingresos Totales', Valor: totalRevenue },
      { Metrica: 'Items Vendidos', Valor: totalItemsSold },
      { Metrica: 'Órdenes Totales', Valor: totalOrders },
      { Metrica: 'Ingreso Promedio por Item', Valor: (totalRevenue / totalItemsSold || 0) },
    ];
    const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.sheet_add_aoa(summaryWorksheet, [["Resumen de Datos"]], { origin: "A1" });
    summaryWorksheet['!cols'] = [{ wch: 30 }, { wch: 15 }];

    const transactionsData = filteredSales.map(sale => ({
      'Fecha': new Date(sale.order_date).toLocaleString(),
      'Sucursal': sale.branch,
      'Vendedor': sale.seller_full_name,
      'Rol': sale.seller_role,
      'Producto': sale.product_name,
      'Cantidad': sale.quantity,
      'Subtotal': sale.subtotal,
    }));
    const transactionsWorksheet = XLSX.utils.json_to_sheet(transactionsData);
    const colsWidth = Object.keys(transactionsData[0] || {}).map(key => ({ wch: Math.max(key.length, ...transactionsData.map(row => String(row[key as keyof typeof row] || '').length)) + 2 }));
    transactionsWorksheet['!cols'] = colsWidth;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Resumen');
    XLSX.utils.book_append_sheet(workbook, transactionsWorksheet, 'Detalle de Transacciones');

    XLSX.writeFile(workbook, `Reporte_Ventas_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (loading) return <div className="flex justify-center items-center h-screen bg-gray-100 text-gray-600 font-semibold">Cargando Dashboard...</div>;
  if (error) return <div className="flex justify-center items-center h-screen bg-red-50 text-red-600 font-semibold">Error al cargar el dashboard: {error}</div>;

  return (
    <div className="bg-gray-100 dark:bg-gray-900 min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-screen-xl mx-auto">
        <header className="mb-8 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 dark:text-gray-100">Dashboard de Rendimiento de Ventas</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2">Una vista analítica de las operaciones comerciales.</p>
          </div>
          <button onClick={exportToExcel} disabled={filteredSales.length === 0} className="inline-flex items-center justify-center px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200">
            <DownloadIcon className="w-5 h-5 mr-2" />
            Exportar a Excel
          </button>
        </header>

        <motion.div layout className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-lg mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha Inicio</label>
              <input id="startDate" type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="w-full p-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white" />
            </div>
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha Fin</label>
              <input id="endDate" type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="w-full p-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white" />
            </div>
            <div>
              <label htmlFor="branch" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sucursal</label>
              <select id="branch" name="branch" value={filters.branch} onChange={handleFilterChange} className="w-full p-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white">
                <option value="">Todas las Sucursales</option>
                {uniqueBranches.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="sellerRole" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rol</label>
              <select id="sellerRole" name="sellerRole" value={filters.sellerRole} onChange={handleFilterChange} className="w-full p-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white">
                <option value="">Todos los Roles</option>
                {uniqueRoles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard title="Ingresos Totales" value={`$${totalRevenue.toFixed(2)}`} icon={<DollarSignIcon />} color="#0088FE" />
          <StatCard title="Items Vendidos" value={totalItemsSold} icon={<PackageIcon />} color="#00C49F" />
          <StatCard title="Órdenes Filtradas" value={totalOrders} icon={<ShoppingCartIcon />} color="#FFBB28" />
          <StatCard title="Ingreso Prom./Item" value={`$${(totalRevenue / totalItemsSold || 0).toFixed(2)}`} icon={<BarChartIcon />} color="#FF8042" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-8">
          <div className="lg:col-span-3">
            <ChartContainer title="Ventas por Sucursal">
              <ResponsiveContainer>
                <BarChart data={salesByBranch} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={(value) => `$${Number(value).toLocaleString()}`} />
                  <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                  <Legend />
                  <Bar dataKey="total" name="Ingresos" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
          <div className="lg:col-span-2">
            <ChartContainer title="Top 5 Productos (por cantidad)">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={salesByProduct} dataKey="quantity" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {salesByProduct.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${value} unidades`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </div>

        <motion.div layout className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">Detalle de Transacciones</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Mostrando las primeras {Math.min(filteredSales.length, 100)} de {filteredSales.length} transacciones.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  {['Fecha', 'Vendedor', 'Rol', 'Producto', 'Cant.', 'Subtotal'].map(h => (
                    <th key={h} className="py-3 px-4 sm:px-6 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                <AnimatePresence>
                  {filteredSales.slice(0, 100).map((sale, i) => (
                    <motion.tr
                      key={`${sale.order_id}-${sale.product_name}-${i}`}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50"
                    >
                      <td className="p-4 sm:px-6 whitespace-nowrap">
                        <div className="font-medium text-gray-800 dark:text-gray-100">{new Date(sale.order_date).toLocaleDateString()}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{new Date(sale.order_date).toLocaleTimeString()}</div>
                      </td>
                      <td className="p-4 sm:px-6">
                        <div className="font-semibold text-gray-900 dark:text-gray-50">{sale.seller_full_name || 'N/A'}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{sale.branch || 'Sin sucursal'}</div>
                      </td>
                      <td className="p-4 sm:px-6">
                        <span className={`px-3 py-1 text-xs font-bold leading-none rounded-full ${sale.seller_role === 'Asesor' ? 'bg-blue-500 text-white' : sale.seller_role === 'Promotor' ? 'bg-green-500 text-white' : 'bg-gray-400 text-white'}`}>
                          {sale.seller_role || 'Sin Rol'}
                        </span>
                      </td>
                      <td className="p-4 sm:px-6 text-gray-800 dark:text-gray-200">{sale.product_name}</td>
                      <td className="p-4 sm:px-6 text-center font-medium text-gray-600 dark:text-gray-300">{sale.quantity}</td>
                      <td className="p-4 sm:px-6 text-right">
                        <div className="text-base font-extrabold text-gray-900 dark:text-white">${sale.subtotal.toFixed(2)}</div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
            {filteredSales.length === 0 && (
              <div className="text-center py-16">
                <PackageIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-200">Sin resultados</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Ajusta los filtros para encontrar datos.</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// --- Íconos SVG ---
const DownloadIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>;
const DollarSignIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>;
const ShoppingCartIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>;
const PackageIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16.5 9.4l-9-5.19"></path><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>;
const BarChartIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="20" x2="12" y2="10"></line><line x1="18" y1="20" x2="18" y2="4"></line><line x1="6" y1="20" x2="6" y2="16"></line></svg>;
