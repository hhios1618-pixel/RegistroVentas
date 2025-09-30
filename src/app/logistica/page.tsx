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
import { Button } from '@/components/Button';
import MapOverviewModal from '@/components/MapOverviewModal';
import { SettlementTable } from '@/components/SettlementTable';
import { cn } from '@/lib/utils/cn';

// Iconos (sin cambios)
import {
  PlusCircle, RefreshCw, Search, Truck, Clock, CheckCircle2,
  AlertTriangle, Users, Map as MapIcon, Calendar, BarChart2, Radio,
  SlidersHorizontal, Package, Route, Warehouse, Target, TrendingUp,
  Zap, BarChart3, Eye, Filter, ArrowRight, ChevronDown, ChevronUp,
  Activity, Navigation, MapPin, Timer, Gauge, Signal
} from 'lucide-react';

// ===================================================================================
// COMPONENTES UI REDISEÑADOS CON ESTILO APPLE
// ===================================================================================

// --- Componente de Tarjeta KPI Rediseñado con Estilo Apple ---
const KpiCard = ({ title, value, icon: Icon, color, description, trend, delay = 0 }:
  { title: string, value: string | number, icon: React.ElementType, color: string,
    description: string, trend?: { value: number, isPositive: boolean }, delay?: number }) => {
  
  const colorClasses = {
    '#38bdf8': 'from-apple-blue-500/20 to-apple-blue-600/10 border-apple-blue-500/30 text-apple-blue-400',
    '#facc15': 'from-apple-orange-500/20 to-apple-orange-600/10 border-apple-orange-500/30 text-apple-orange-400',
    '#a78bfa': 'from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400',
    '#4ade80': 'from-apple-green-500/20 to-apple-green-600/10 border-apple-green-500/30 text-apple-green-400',
    '#f472b6': 'from-pink-500/20 to-pink-600/10 border-pink-500/30 text-pink-400',
  };

  const colorClass = colorClasses[color as keyof typeof colorClasses] || colorClasses['#38bdf8'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      whileHover={{ scale: 1.02, y: -4 }}
      className="glass-card hover:shadow-apple-lg transition-all duration-300"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 bg-gradient-to-br ${colorClass} rounded-apple border`}>
          <Icon size={20} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-apple-caption2 font-semibold ${
            trend.isPositive 
              ? 'bg-apple-green-500/20 text-apple-green-300 border border-apple-green-500/30' 
              : 'bg-apple-red-500/20 text-apple-red-300 border border-apple-red-500/30'
          }`}>
            {trend.isPositive ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            <span>{Math.abs(trend.value).toFixed(1)}%</span>
          </div>
        )}
      </div>
      
      <div className="space-y-2">
        <p className="apple-caption text-[color:var(--app-muted)] dark:text-apple-gray-400">{title}</p>
        <p className="apple-h2 font-semibold text-[color:var(--app-foreground)] dark:text-white">{value}</p>
        <p className="apple-caption2 text-[color:var(--app-muted)] dark:text-apple-gray-500">{description}</p>
      </div>
    </motion.div>
  );
};

// --- Filtro de Estado Rediseñado con Estilo Apple ---
const StatusFilter = ({ currentStatus, onStatusChange }: {
  currentStatus: OrderStatus | 'all',
  onStatusChange: (status: OrderStatus | 'all') => void
}) => {
  const statusOptions: { value: OrderStatus | 'all', label: string, color: string, icon: React.ElementType }[] = [
    { value: 'all', label: 'Todos', color: 'apple-gray', icon: Eye },
    { value: 'pending', label: 'Pendientes', color: 'apple-orange', icon: Clock },
    { value: 'confirmed', label: 'Confirmados', color: 'apple-blue', icon: CheckCircle2 },
    { value: 'out_for_delivery', label: 'En Ruta', color: 'purple', icon: Truck },
    { value: 'delivered', label: 'Entregados', color: 'apple-green', icon: Package },
    { value: 'cancelled', label: 'Cancelados', color: 'apple-red', icon: AlertTriangle },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-wrap gap-3"
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
          className={cn(
            'px-4 py-2.5 rounded-apple text-apple-caption font-medium transition-all flex items-center gap-2',
            currentStatus === option.value
              ? `bg-${option.color}-500/20 text-${option.color}-300 border border-${option.color}-500/30 shadow-apple`
              : 'bg-[color:var(--hover-surface)] text-[color:var(--app-muted)] border border-[color:var(--app-border)] hover:bg-[color:var(--hover-surface-strong)] dark:bg-white/5 dark:text-apple-gray-300 dark:border-white/10 dark:hover:bg-white/10'
          )}
        >
          <option.icon size={16} />
          {option.label}
        </motion.button>
      ))}
    </motion.div>
  );
};

// --- Componente para las secciones agrupadas rediseñado ---
const CollapsibleOrderSection = ({ city, orders, onRowClick }: { city: string, orders: OrderRow[], onRowClick: (order: OrderRow) => void }) => {
  const [isOpen, setIsOpen] = useState(true);

  const cityIcons = {
    'Santa Cruz': <MapPin size={18} className="text-apple-green-400" />,
    'Cochabamba': <MapPin size={18} className="text-apple-blue-400" />,
    'La Paz': <MapPin size={18} className="text-apple-orange-400" />,
    'El Alto': <MapPin size={18} className="text-purple-400" />,
    'Sucre': <MapPin size={18} className="text-pink-400" />,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card overflow-hidden"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left p-4 transition-colors flex justify-between items-center border-b border-[color:var(--app-border)] hover:bg-[color:var(--hover-surface)] dark:border-white/10 dark:hover:bg-white/5"
      >
        <div className="flex items-center gap-3">
          {cityIcons[city as keyof typeof cityIcons] || <MapPin size={18} className="text-apple-gray-400" />}
          <h3 className="apple-h4 text-[color:var(--app-foreground)] dark:text-white">{city}</h3>
          <div className="badge badge-primary">{orders.length}</div>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={20} className="text-apple-gray-400" />
        </motion.div>
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

const PageSurface = ({ children }: { children: React.ReactNode }) => (
  <div className="relative min-h-screen overflow-hidden bg-[color:var(--app-bg)] text-[color:var(--app-foreground)] transition-colors duration-500 ease-apple">
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0 bg-[radial-gradient(1350px_700px_at_12%_-10%,rgba(124,142,255,0.22),transparent_72%)] opacity-80 dark:bg-[radial-gradient(1200px_620px_at_12%_-12%,rgba(64,112,255,0.2),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(1100px_640px_at_92%_-10%,rgba(255,182,193,0.18),transparent_68%)] opacity-70 dark:bg-[radial-gradient(920px_540px_at_92%_-18%,rgba(168,85,247,0.14),transparent_55%)]" />
    </div>
    <div className="relative z-10 min-h-screen flex flex-col">
      {children}
    </div>
  </div>
);

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

  // --- RENDERIZADO PRINCIPAL REDISEÑADO ---

  if (loading && orders.length === 0) {
    return (
      <PageSurface>
        <div className="flex flex-1 items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card text-center max-w-md transition-colors duration-500"
          >
            <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-apple-blue-500/20 to-apple-green-500/20 border border-apple-blue-500/30 rounded-apple-lg flex items-center justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              >
                <Truck size={24} className="text-apple-blue-400" />
              </motion.div>
            </div>
            <h2 className="apple-h2 text-[color:var(--app-foreground)] dark:text-white mb-3">Centro de Operaciones</h2>
            <p className="apple-body text-[color:var(--app-muted)] dark:text-apple-gray-300 mb-4">Conectando con el sistema de gestión logística</p>
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-apple-blue-400 rounded-full animate-pulse" />
              <div className="w-2 h-2 bg-apple-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
              <div className="w-2 h-2 bg-apple-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
            </div>
          </motion.div>
        </div>
      </PageSurface>
    );
  }

  if (error && !selectedOrder) {
    return (
      <PageSurface>
        <div className="flex flex-1 items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card text-center max-w-md border border-apple-red-500/30 bg-apple-red-500/10 transition-colors duration-500"
          >
            <div className="w-16 h-16 mx-auto mb-6 bg-apple-red-500/20 border border-apple-red-500/30 rounded-apple-lg flex items-center justify-center">
              <AlertTriangle size={24} className="text-apple-red-400" />
            </div>
            <h2 className="apple-h2 text-[color:var(--app-foreground)] dark:text-white mb-3">Error de Conexión</h2>
            <p className="apple-body text-apple-red-300 dark:text-apple-red-300 mb-6">{error}</p>
            <button
              onClick={() => { clearError(); loadData(true); }}
              className="btn-primary w-full"
            >
              <RefreshCw size={16} />
              Reintentar Conexión
            </button>
          </motion.div>
        </div>
      </PageSurface>
    );
  }

  return (
    <>
      <PageSurface>
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card mb-8 transition-colors duration-500"
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-apple-blue-500/20 to-apple-green-500/20 border border-apple-blue-500/30 rounded-apple-lg">
                <Truck size={28} className="text-apple-blue-400" />
              </div>
              <div>
                <h1 className="apple-h1 mb-2">Centro de Logística</h1>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-apple-green-400 animate-pulse' : 'bg-apple-orange-400'}`} />
                  <span className="apple-caption text-[color:var(--app-muted)] dark:text-apple-gray-400">
                    {isLive ? 'Sistema en línea' : 'Reconectando...'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => loadData(true)}
                disabled={loading}
                className="btn-primary"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                {loading ? 'Actualizando...' : 'Actualizar'}
              </button>
              <button
                onClick={() => setIsMapOpen(true)}
                className="btn-secondary"
              >
                <MapIcon size={16} />
                Vista de Mapa
              </button>
              <button className="btn-success">
                <PlusCircle size={16} />
                Nuevo Pedido
              </button>
            </div>
          </div>
        </motion.header>

        <div className="max-w-[1800px] mx-auto px-6 space-y-8">
          {/* KPIs */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6"
          >
            <KpiCard 
              title="Pedidos Totales" 
              value={kpis.total.value} 
              icon={Package} 
              color="#38bdf8" 
              description="Todos los estados" 
              trend={{ value: kpis.total.trend, isPositive: kpis.total.trend > 0 }} 
              delay={0.1}
            />
            <KpiCard 
              title="Pendientes" 
              value={kpis.pending.value} 
              icon={Clock} 
              color="#facc15" 
              description="Listos para asignar" 
              trend={{ value: kpis.pending.trend, isPositive: kpis.pending.trend > 0 }} 
              delay={0.2}
            />
            <KpiCard 
              title="En Ruta" 
              value={kpis.inDelivery.value} 
              icon={Truck} 
              color="#a78bfa" 
              description="Entregas en curso" 
              trend={{ value: kpis.inDelivery.trend, isPositive: kpis.inDelivery.trend > 0 }} 
              delay={0.3}
            />
            <KpiCard 
              title="Completados" 
              value={kpis.delivered.value} 
              icon={CheckCircle2} 
              color="#4ade80" 
              description="Entregas exitosas" 
              trend={{ value: kpis.delivered.trend, isPositive: kpis.delivered.trend > 0 }} 
              delay={0.4}
            />
            <KpiCard 
              title="Eficiencia" 
              value={`${kpis.efficiency.value}%`} 
              icon={Target} 
              color="#f472b6" 
              description="Tasa de éxito" 
              trend={{ value: kpis.efficiency.trend, isPositive: kpis.efficiency.trend > 0 }} 
              delay={0.5}
            />
          </motion.section>
          
          {/* Panel de filtros */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card transition-colors duration-500"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-apple-blue-500/20 border border-apple-blue-500/30 rounded-apple">
                  <Filter size={18} className="text-apple-blue-400" />
                </div>
                <h3 className="apple-h3 text-[color:var(--app-foreground)] dark:text-white">Filtrar por Estado</h3>
              </div>
              <div className="badge badge-primary">{filteredOrders.length} pedidos</div>
            </div>
            <StatusFilter 
              currentStatus={filters.status} 
              onStatusChange={(status) => setFilters({...filters, status})} 
            />
          </motion.section>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Contenido principal */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="lg:col-span-8 xl:col-span-9 space-y-8"
            >
              {/* Tabla de eficiencia */}
              <div className="glass-card transition-colors duration-500">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-apple-green-500/20 border border-apple-green-500/30 rounded-apple">
                    <TrendingUp size={18} className="text-apple-green-400" />
                  </div>
                  <h3 className="apple-h3 text-[color:var(--app-foreground)] dark:text-white">Eficiencia de Entregas por Horario</h3>
                </div>
                <SettlementTable />
              </div>

              {/* Lista de pedidos */}
              <div className="glass-card transition-colors duration-500">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/20 border border-purple-500/30 rounded-apple">
                      <Route size={18} className="text-purple-400" />
                    </div>
                    <div>
                      <h3 className="apple-h3 text-[color:var(--app-foreground)] dark:text-white">Lista de Pedidos</h3>
                      <p className="apple-caption text-[color:var(--app-muted)] dark:text-apple-gray-400">{filteredOrders.length} pedidos encontrados</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-apple-gray-500" />
                      <input
                        type="text"
                        placeholder="Buscar por cliente, #, dirección..."
                        value={filters.search}
                        onChange={(e) => setFilters(p => ({ ...p, search: e.target.value }))}
                        className="field pl-10"
                      />
                    </div>
                    <button className="btn-ghost p-2">
                      <SlidersHorizontal size={16} />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {groupedOrders.length > 0 ? (
                    groupedOrders.map(([city, cityOrders]) => (
                      <CollapsibleOrderSection 
                        key={city} 
                        city={city} 
                        orders={cityOrders} 
                        onRowClick={setSelectedOrder} 
                      />
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 mx-auto mb-4 bg-apple-gray-500/20 border border-apple-gray-500/30 rounded-apple-lg flex items-center justify-center">
                        <Package size={24} className="text-apple-gray-400" />
                      </div>
                      <h4 className="apple-h3 text-[color:var(--app-foreground)] dark:text-white mb-2">Sin pedidos</h4>
                      <p className="apple-body text-[color:var(--app-muted)] dark:text-apple-gray-400">No se encontraron pedidos que coincidan con los filtros.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Sidebar */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="lg:col-span-4 xl:col-span-3 space-y-6 sticky top-6"
            >
              {/* Unidades activas */}
              <div className="glass-card transition-colors duration-500">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-apple-orange-500/20 border border-apple-orange-500/30 rounded-apple">
                      <Truck size={18} className="text-apple-orange-400" />
                    </div>
                    <h3 className="apple-h3 text-[color:var(--app-foreground)] dark:text-white">Unidades Activas</h3>
                  </div>
                  <div className="badge badge-primary">{deliveries.length}</div>
                </div>
                
                <div className="space-y-4 max-h-[calc(100vh-12rem)] overflow-y-auto">
                  <AnimatePresence>
                    {deliveries.length > 0 ? (
                      deliveries.map((delivery, index) => {
                        const today = new Date().toISOString().slice(0, 10);
                        const todayRoutes = deliveryRoutes.filter(r => r.delivery_user_id === delivery.id && r.route_date === today);
                        const completedToday = todayRoutes.filter(r => r.status === 'completed').length;
                        const stats = {
                          totalToday: todayRoutes.length, 
                          completedToday: completedToday, 
                          inProgressToday: todayRoutes.filter(r => r.status === 'in_progress').length,
                          pendingToday: todayRoutes.filter(r => r.status === 'pending').length,
                          efficiency: todayRoutes.length > 0 ? Math.round((completedToday / todayRoutes.length) * 100) : 0,
                        };
                        return (
                          <motion.div
                            key={delivery.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            exit={{ opacity: 0, height: 0 }}
                            layout
                          >
                            <DeliveryCard 
                              delivery={delivery} 
                              stats={stats} 
                              onViewDetails={setSelectedDelivery} 
                            />
                          </motion.div>
                        );
                      })
                    ) : (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-12 border-2 border-dashed border-[color:var(--app-border)] rounded-apple dark:border-white/10"
                      >
                        <div className="w-12 h-12 mx-auto mb-3 bg-apple-gray-500/20 border border-apple-gray-500/30 rounded-apple flex items-center justify-center">
                          <Users size={20} className="text-apple-gray-400" />
                        </div>
                        <p className="apple-body text-[color:var(--app-muted)] dark:text-apple-gray-400">No hay unidades activas</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Acciones rápidas */}
              <div className="glass-card transition-colors duration-500">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-apple-green-500/20 border border-apple-green-500/30 rounded-apple">
                    <Zap size={18} className="text-apple-green-400" />
                  </div>
                  <h3 className="apple-h4 text-[color:var(--app-foreground)] dark:text-white">Acciones Rápidas</h3>
                </div>
                
                <div className="space-y-3">
                  <motion.button
                    whileHover={{ x: 5 }}
                    whileTap={{ scale: 0.98 }}
                    className="btn-ghost w-full justify-between group"
                  >
                    <div className="flex items-center gap-2">
                      <PlusCircle size={16} />
                      Crear Ruta de Entrega
                    </div>
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ x: 5 }}
                    whileTap={{ scale: 0.98 }}
                    className="btn-ghost w-full justify-between group"
                  >
                    <div className="flex items-center gap-2">
                      <Navigation size={16} />
                      Optimizar Rutas
                    </div>
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ x: 5 }}
                    whileTap={{ scale: 0.98 }}
                    className="btn-ghost w-full justify-between group"
                  >
                    <div className="flex items-center gap-2">
                      <BarChart3 size={16} />
                      Reporte de Eficiencia
                    </div>
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </PageSurface>
      
      {/* Modales - SIN CAMBIOS */}
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
          />
        )}
      </AnimatePresence>
    </>
  );
}