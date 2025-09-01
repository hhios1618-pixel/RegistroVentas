'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Importa el hook que ahora centraliza toda la lógica de datos
import { useLogisticsData } from '@/hooks/useLogisticsData'; 

// Tipos (sin cambios)
import type { OrderRow, OrderStatus } from '@/lib/types';

// Componentes (sin cambios)
import { OrderTable } from '@/components/OrderTable';
import OrderDetailsModal from '@/components/OrderDetailsModal';
import DeliveryDetailsModal from '@/components/DeliveryDetailsModal';
import { DeliveryCard } from '@/components/DeliveryCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import Button from '@/components/Button';
import MapOverviewModal from '@/components/MapOverviewModal';
import { SettlementTable } from '@/components/SettlementTable';

// Iconos (sin cambios)
import {
  PlusCircle, RefreshCw, Search, Truck, Clock, CheckCircle2,
  AlertTriangle, Users, Map as MapIcon, Calendar, BarChart2, Radio,
  SlidersHorizontal, Package, Route, Warehouse, Target, TrendingUp,
  Zap, BarChart3, Eye, Filter, ArrowRight, ChevronDown
} from 'lucide-react';

// ===================================================================================
// TUS COMPONENTES DE UI PERSONALIZADOS - SE MANTIENEN 100% IDÉNTICOS
// ===================================================================================

// --- Componente de Tarjeta KPI Mejorado con Animaciones ---
const KpiCard = ({ title, value, icon: Icon, color, description, trend, delay = 0 }:
  { title: string, value: string | number, icon: React.ElementType, color: string,
    description: string, trend?: { value: number, isPositive: boolean }, delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: 0.5, delay, ease: "easeOut" }}
    whileHover={{ y: -5, transition: { duration: 0.2 } }}
    className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-sm p-6 shadow-2xl shadow-black/30 hover:shadow-indigo-500/10 transition-all duration-300 group"
  >
    <div className="flex items-start justify-between">
      <div className="flex flex-col">
        <motion.p
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: delay + 0.1 }}
          className="text-sm font-medium text-slate-400 flex items-center gap-1"
        >
          <Icon className="w-4 h-4" style={{ color }} />
          {title}
        </motion.p>
        <motion.p
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: delay + 0.2 }}
          className="text-3xl font-bold text-white mt-2"
        >
          {value}
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay + 0.3 }}
          className="text-xs text-slate-500 mt-1"
        >
          {description}
        </motion.p>

        {trend && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: delay + 0.4 }}
            className={`text-xs mt-2 flex items-center ${trend.isPositive ? 'text-green-400' : 'text-red-400'}`}
          >
            {trend.isPositive ? '↑' : '↓'} {trend.value}% vs ayer
          </motion.div>
        )}
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ delay: delay + 0.3, type: "spring", stiffness: 200 }}
        className="p-2 rounded-md group-hover:scale-110 transition-transform duration-300"
        style={{ backgroundColor: `${color}20` }}
      >
        <Icon className="w-5 h-5" style={{ color }} />
      </motion.div>
    </div>
    <motion.div
      initial={{ width: 0 }}
      animate={{ width: "100%" }}
      transition={{ delay: delay + 0.5, duration: 0.8 }}
      className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-transparent"
      style={{ background: `linear-gradient(to right, ${color}40, ${color})` }}
    />
  </motion.div>
);

// --- Filtro de Estado Mejorado con Animaciones ---
const StatusFilter = ({ currentStatus, onStatusChange }: {
  currentStatus: OrderStatus | 'all',
  onStatusChange: (status: OrderStatus | 'all') => void
}) => {
  const statusOptions: { value: OrderStatus | 'all', label: string, color: string, icon: React.ElementType }[] = [
    { value: 'all', label: 'Todos', color: 'bg-slate-500', icon: Eye },
    { value: 'pending', label: 'Pendientes', color: 'bg-yellow-500', icon: Clock },
    { value: 'confirmed', label: 'Confirmados', color: 'bg-blue-500', icon: CheckCircle2 },
    { value: 'out_for_delivery', label: 'En Ruta', color: 'bg-purple-500', icon: Truck },
    { value: 'delivered', label: 'Entregados', color: 'bg-green-500', icon: Package },
    { value: 'cancelled', label: 'Cancelados', color: 'bg-red-500', icon: AlertTriangle },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-wrap gap-2"
    >
      {statusOptions.map((option, index) => (
        <motion.button
          key={option.value}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onStatusChange(option.value)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 shadow-lg ${
            currentStatus === option.value
              ? `${option.color} text-white shadow-md ${option.color.replace('bg-', 'shadow-')}/30`
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 shadow-slate-900/20'
          }`}
        >
          <option.icon className="w-4 h-4" />
          {option.label}
        </motion.button>
      ))}
    </motion.div>
  );
};

// --- Efecto de partículas para fondo ---
const ParticlesBackground = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10"
          initial={{
            x: Math.random() * 100 + 'vw',
            y: Math.random() * 100 + 'vh',
            scale: Math.random() * 0.5 + 0.5,
            opacity: Math.random() * 0.3 + 0.1,
          }}
          animate={{
            x: [null, Math.random() * 100 + 'vw'],
            y: [null, Math.random() * 100 + 'vh'],
          }}
          transition={{
            duration: Math.random() * 30 + 20,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "linear"
          }}
          style={{
            width: Math.random() * 100 + 50 + 'px',
            height: Math.random() * 100 + 50 + 'px',
            filter: 'blur(20px)',
          }}
        />
      ))}
    </div>
  );
};

// --- Componente para las secciones agrupadas ---
const CollapsibleOrderSection = ({ city, orders, onRowClick }: { city: string, orders: OrderRow[], onRowClick: (order: OrderRow) => void }) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900/30 rounded-xl overflow-hidden"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left p-4 bg-slate-800/50 hover:bg-slate-800 transition-colors flex justify-between items-center"
      >
        <div className="flex items-center gap-3">
          <MapIcon className="w-5 h-5 text-indigo-400" />
          <h3 className="font-semibold text-white">{city}</h3>
          <span className="text-sm text-slate-400 bg-slate-700/50 px-2 py-0.5 rounded-full">{orders.length}</span>
        </div>
        <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <OrderTable orders={orders} onRowClick={onRowClick} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// --- LÓGICA DE AGRUPACIÓN FINAL ---
const getBranchForOrder = (order: OrderRow): string => {
  const destino = order.destino;
  if (destino) {
    const lowerDestino = destino.toLowerCase();
    if (lowerDestino.includes('el alto')) return 'El Alto';
    if (lowerDestino.includes('la paz') || lowerDestino.includes('oruro')) return 'La Paz';
    if (lowerDestino.includes('cochabamba')) return 'Cochabamba';
    if (lowerDestino.includes('sucre') || lowerDestino.includes('chuquisaca') || lowerDestino.includes('potosi') || lowerDestino.includes('tarija') || lowerDestino.includes('villamontes')) return 'Sucre';
    if (lowerDestino.includes('santa cruz') || lowerDestino.includes('beni') || lowerDestino.includes('pando') || lowerDestino.includes('charagua')) return 'Santa Cruz';
  }
  return 'Santa Cruz';
};


export default function LogisticaPage() {
  // ===================================================================================
  // ÚNICO CAMBIO LÓGICO: Usamos el hook en lugar de los useState y funciones locales
  // ===================================================================================
  const {
    orders,
    deliveries,
    deliveryRoutes,
    loading,
    error,
    isLive,
    loadData, // Función para refrescar manualmente
    assignDelivery,
    handleStatusChange,
    saveLocation,
    confirmDelivered,
    clearError
  } = useLogisticsData();

  // --- ESTADOS LOCALES (solo para la UI) - SIN CAMBIOS ---
  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null);
  const [selectedDelivery, setSelectedDelivery] = useState<any | null>(null);
  const [filters, setFilters] = useState({ status: 'all' as OrderStatus | 'all', search: '' });
  const [isMapOpen, setIsMapOpen] = useState(false);
  
  // SE HAN ELIMINADO:
  // - Los useState para orders, deliveries, deliveryRoutes, loading, error, isLive, refreshing.
  // - La función loadData, assignDelivery, saveLocation, handleStatusChange, confirmDelivered.
  // - El useEffect para cargar datos y suscribirse al canal de Supabase.
  // ¡Todo eso ahora vive en el hook useLogisticsData!

  // --- LÓGICA DE UI Y DATOS DERIVADOS - SIN CAMBIOS ---

  // Efecto para mantener los datos del modal actualizados
  useEffect(() => {
    if (selectedOrder) {
      const latestOrderData = orders.find(o => o.id === selectedOrder.id);
      if (latestOrderData && JSON.stringify(latestOrderData) !== JSON.stringify(selectedOrder)) {
        setSelectedOrder(latestOrderData);
      }
    }
  }, [orders, selectedOrder]);

  // Preparar datos para el mapa
  const ordersForMap = useMemo(() => {
    return orders.map(order => ({
      id: order.id, status: order.status, order_no: order.order_no, customer_name: order.customer_name,
      delivery_address: order.delivery_address, delivery_geo_lat: order.delivery_geo_lat,
      delivery_geo_lng: order.delivery_geo_lng, delivery_date: order.delivery_date,
      delivery_from: order.delivery_from, delivery_to: order.delivery_to
    }));
  }, [orders]);

  // KPIs
  const kpis = useMemo(() => ({
    total: { value: orders.length, trend: 2.5 },
    pending: { value: orders.filter((o) => o.status === 'pending').length, trend: -1.2 },
    inDelivery: { value: orders.filter((o) => o.status === 'out_for_delivery').length, trend: 5.8 },
    delivered: { value: orders.filter((o) => ['delivered', 'confirmed'].includes(o.status || '')).length, trend: 3.1 },
    efficiency: { value: orders.length > 0 ? Math.round((orders.filter(o => ['delivered', 'confirmed'].includes(o.status || '')).length / orders.length) * 100) : 0, trend: 1.7 },
  }), [orders]);

  // Filtro de pedidos
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (filters.status !== 'all' && order.status !== filters.status) return false;
      if (filters.search) {
        const search = filters.search.toLowerCase();
        const sellerName = Array.isArray(order.seller_profile) ? order.seller_profile[0]?.full_name : order.seller_profile?.full_name;
        const deliveryName = Array.isArray(order.delivery_profile) ? order.delivery_profile[0]?.full_name : order.delivery_profile?.full_name;
        return [ order.order_no, order.customer_name, order.customer_phone, order.delivery_address, sellerName || order.seller, deliveryName ].filter(Boolean).join(' ').toLowerCase().includes(search);
      }
      return true;
    });
  }, [orders, filters]);
  
  // Agrupación de pedidos
  const groupedOrders = useMemo(() => {
    const cityOrder = ['Santa Cruz', 'Cochabamba', 'La Paz', 'El Alto', 'Sucre'];
    const groups: { [key: string]: OrderRow[] } = {};
    filteredOrders.forEach(order => {
      const branch = getBranchForOrder(order);
      if (!groups[branch]) { groups[branch] = []; }
      groups[branch].push(order);
    });
    const orderedGroups = Object.entries(groups).sort(([a], [b]) => {
      const indexA = cityOrder.indexOf(a);
      const indexB = cityOrder.indexOf(b);
      if (indexA === -1 && indexB === -1) return a.localeCompare(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
    return orderedGroups;
  }, [filteredOrders]);

  // --- RENDERIZADO PRINCIPAL - SIN CAMBIOS VISUALES ---

  if (loading && orders.length === 0) {
    // ... (Tu pantalla de carga inicial) ...
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full mb-4" />
          <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-xl font-semibold text-white mb-2">Cargando Centro de Operaciones</motion.h2>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="text-slate-400">Conectando con el sistema de gestión logística</motion.p>
        </motion.div>
      </div>
    );
  }
  
  if (error && !selectedOrder) {
    // ... (Tu pantalla de error) ...
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center p-8 bg-gradient-to-br from-red-900/20 to-red-800/20 rounded-2xl border border-red-700/30 backdrop-blur-sm max-w-md w-full">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }}><AlertTriangle className="mx-auto w-16 h-16 text-red-400 mb-4" /></motion.div>
          <h2 className="text-xl font-bold text-white mb-2">Error de Conexión</h2>
          <p className="text-red-300 mb-6">{error}</p>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button onClick={() => { clearError(); loadData(true); }} className="bg-red-600 hover:bg-red-500 text-white w-full">Reintentar Conexión</Button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen w-full bg-slate-950 text-slate-300">
        <ParticlesBackground />
        <div className="absolute inset-0 -z-10 h-full w-full bg-slate-950 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:32px_32px]"></div>
        <motion.div initial="hidden" animate="show" variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } }} className="p-4 sm:p-6 lg:p-8 max-w-[1800px] mx-auto" >
          <motion.header variants={{ hidden: { opacity: 0, y: -30 }, show: { opacity: 1, y: 0, transition: { duration: 0.6 } } }} className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
            <div className="flex items-center gap-4">
              <h1 className="text-4xl font-extrabold text-white tracking-tight">Centro de Logística</h1>
              <span className="text-sm text-slate-500 bg-slate-800/50 px-3 py-1 rounded-full flex items-center gap-1">
                  <Radio className={`w-3 h-3 ${isLive ? 'text-green-400 animate-pulse' : 'text-yellow-400'}`} />
                  {isLive ? 'En Vivo' : 'Reconectando...'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button size="small" className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white flex items-center gap-2" onClick={() => loadData(true)} disabled={loading}>
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    {loading ? 'Actualizando...' : 'Actualizar Datos'}
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}><Button size="small" className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white flex items-center gap-2" onClick={() => setIsMapOpen(true)}><MapIcon className="w-4 h-4" />Vista de Mapa</Button></motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}><Button size="small" className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white flex items-center gap-2"><PlusCircle className="w-4 h-4" />Nuevo Pedido</Button></motion.div>
            </div>
          </motion.header>

          <motion.div variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mb-8">
            <KpiCard title="Pedidos Totales" value={kpis.total.value} icon={Package} color="#38bdf8" description="Todos los estados" trend={{ value: kpis.total.trend, isPositive: kpis.total.trend > 0 }} delay={0.1}/>
            <KpiCard title="Pendientes" value={kpis.pending.value} icon={Clock} color="#facc15" description="Listos para asignar" trend={{ value: kpis.pending.trend, isPositive: kpis.pending.trend > 0 }} delay={0.2}/>
            <KpiCard title="En Ruta" value={kpis.inDelivery.value} icon={Truck} color="#a78bfa" description="Entregas en curso" trend={{ value: kpis.inDelivery.trend, isPositive: kpis.inDelivery.trend > 0 }} delay={0.3}/>
            <KpiCard title="Completados" value={kpis.delivered.value} icon={CheckCircle2} color="#4ade80" description="Entregas exitosas" trend={{ value: kpis.delivered.trend, isPositive: kpis.delivered.trend > 0 }} delay={0.4}/>
            <KpiCard title="Eficiencia" value={`${kpis.efficiency.value}%`} icon={Target} color="#f472b6" description="Tasa de éxito" trend={{ value: kpis.efficiency.trend, isPositive: kpis.efficiency.trend > 0 }} delay={0.5}/>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="mb-6 bg-gradient-to-br from-slate-900/40 to-slate-800/30 p-5 rounded-2xl border border-slate-700/30 backdrop-blur-sm shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <motion.h3 initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 }} className="font-semibold text-slate-300 flex items-center gap-2"><Filter className="w-5 h-5 text-indigo-400" />Filtrar por Estado</motion.h3>
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="text-sm text-slate-500 bg-slate-800/50 px-3 py-1 rounded-full">{filteredOrders.length} pedidos coinciden</motion.span>
            </div>
            <StatusFilter currentStatus={filters.status} onStatusChange={(status) => setFilters({...filters, status})} />
          </motion.div>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 }} className="lg:col-span-8 xl:col-span-9 space-y-6">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
                <Card className="bg-gradient-to-br from-slate-900/50 to-slate-800/30 border-slate-700/30 backdrop-blur-sm shadow-xl">
                  <CardHeader className="border-b border-slate-700/30"><CardTitle className="text-white flex items-center gap-2"><TrendingUp className="w-5 h-5 text-blue-400" />Eficiencia de Entregas por Horario</CardTitle><p className="text-sm text-slate-400 mt-1">{/* El componente SettlementTable ya tiene su propio contenedor y título */}</p></CardHeader>
                  <CardContent className="pt-6"><SettlementTable /></CardContent>
                </Card>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>
                <Card className="bg-gradient-to-br from-slate-900/50 to-slate-800/30 border-slate-700/30 backdrop-blur-sm shadow-xl">
                  <CardHeader className="border-b border-slate-700/30"><div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"><div><CardTitle className="text-white flex items-center gap-2"><Route className="w-5 h-5 text-indigo-400" />Lista de Pedidos</CardTitle><p className="text-sm text-slate-400 mt-1">{filteredOrders.length} pedidos encontrados</p></div><div className="flex items-center gap-3 w-full sm:w-auto"><motion.div className="relative flex-1 sm:w-64" whileFocus={{ scale: 1.02 }}><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" placeholder="Buscar por cliente, #, dirección..." value={filters.search} onChange={(e) => setFilters(p => ({ ...p, search: e.target.value }))} className="w-full bg-slate-950/70 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" /></motion.div><motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}><Button variant="outline" size="small" className="p-2 h-auto border-slate-700 hover:bg-slate-800"><SlidersHorizontal className="w-4 h-4" /></Button></motion.div></div></div></CardHeader>
                  <CardContent className="p-4 space-y-4">
                    {groupedOrders.length > 0 ? (groupedOrders.map(([city, cityOrders]) => (<CollapsibleOrderSection key={city} city={city} orders={cityOrders} onRowClick={setSelectedOrder} />))) : (<div className="text-center py-12 text-slate-500"><Package className="mx-auto w-10 h-10 mb-3" />No se encontraron pedidos que coincidan con los filtros.</div>)}
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.0 }} className="lg:col-span-4 xl:col-span-3 space-y-6 sticky top-6">
              <Card className="bg-gradient-to-br from-slate-900/50 to-slate-800/30 border-slate-700/30 backdrop-blur-sm shadow-xl">
                <CardHeader className="border-b border-slate-700/30"><CardTitle className="text-white flex items-center gap-2"><Truck className="w-5 h-5 text-indigo-400" />Unidades Activas<span className="text-sm font-normal text-slate-400 ml-1">({deliveries.length})</span></CardTitle></CardHeader>
                <CardContent className="space-y-4 max-h-[calc(100vh-12rem)] overflow-y-auto pr-2 py-4">
                  <AnimatePresence>
                  {deliveries.length > 0 ? (deliveries.map((delivery, index) => {
                        const today = new Date().toISOString().slice(0, 10);
                        const todayRoutes = deliveryRoutes.filter(r => r.delivery_user_id === delivery.id && r.route_date === today);
                        const completedToday = todayRoutes.filter(r => r.status === 'completed').length;
                        const stats = {
                            totalToday: todayRoutes.length, completedToday: completedToday, inProgressToday: todayRoutes.filter(r => r.status === 'in_progress').length,
                            pendingToday: todayRoutes.filter(r => r.status === 'pending').length,
                            efficiency: todayRoutes.length > 0 ? Math.round((completedToday / todayRoutes.length) * 100) : 0,
                        };
                        return (<motion.div key={delivery.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} exit={{ opacity: 0, height: 0 }} layout><DeliveryCard delivery={delivery} stats={stats} onViewDetails={setSelectedDelivery} /></motion.div>);
                      })) : (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 border-2 border-dashed border-slate-700 rounded-xl"><Users className="mx-auto w-10 h-10 text-slate-600 mb-3" /><p className="text-slate-500">No hay unidades activas en el sistema.</p></motion.div>)}
                  </AnimatePresence>
                </CardContent>
              </Card>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1 }}>
                <Card className="bg-gradient-to-br from-slate-900/50 to-slate-800/30 border-slate-700/30 backdrop-blur-sm shadow-xl">
                  <CardHeader className="border-b border-slate-700/30"><CardTitle className="text-white text-sm font-semibold flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-400" />Acciones Rápidas</CardTitle></CardHeader>
                  <CardContent className="pt-4"><div className="space-y-3"><motion.div whileHover={{ x: 5 }} whileTap={{ scale: 0.98 }}><Button variant="outline" className="w-full justify-between text-slate-300 hover:bg-slate-800 border-slate-700 group"><div className="flex items-center gap-2"><PlusCircle className="w-4 h-4" />Crear Ruta de Entrega</div><ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></Button></motion.div><motion.div whileHover={{ x: 5 }} whileTap={{ scale: 0.98 }}><Button variant="outline" className="w-full justify-between text-slate-300 hover:bg-slate-800 border-slate-700 group"><div className="flex items-center gap-2"><MapIcon className="w-4 h-4" />Optimizar Rutas</div><ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></Button></motion.div><motion.div whileHover={{ x: 5 }} whileTap={{ scale: 0.98 }}><Button variant="outline" className="w-full justify-between text-slate-300 hover:bg-slate-800 border-slate-700 group"><div className="flex items-center gap-2"><BarChart3 className="w-4 h-4" />Reporte de Eficiencia</div><ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></Button></motion.div></div></CardContent>
                </Card>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </div>
      
      <AnimatePresence>
        {selectedOrder && ( 
          <OrderDetailsModal 
            order={selectedOrder} 
            deliveries={deliveries} 
            onClose={() => { setSelectedOrder(null); clearError(); }} 
            onAssignDelivery={assignDelivery} 
            onStatusChange={handleStatusChange} 
            onSaveLocation={saveLocation} 
            onConfirmDelivered={confirmDelivered}
            error={error}
            onClearError={clearError}
          />
        )}
        {selectedDelivery && ( 
          <DeliveryDetailsModal 
            delivery={selectedDelivery} 
            routes={deliveryRoutes.filter(r => r.delivery_user_id === selectedDelivery.id)} 
            metrics={undefined} 
            onClose={() => setSelectedDelivery(null)}
          />
        )}
        {isMapOpen && (
          <MapOverviewModal 
            orders={ordersForMap} 
            onClose={() => setIsMapOpen(false)} 
            defaultCenter={{ lat: -17.7833, lng: -63.1821 }} 
            defaultZoom={12}
          />
        )}
      </AnimatePresence>
    </>
  );
}