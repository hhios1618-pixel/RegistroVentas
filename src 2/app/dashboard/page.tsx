// src/app/dashboard/page.tsx
'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { useMemo, type ComponentProps } from 'react';
import { motion } from 'framer-motion';
import {
  Activity, ArrowRight, Bell, ClipboardList, RotateCcw,
  UserPlus, Users2, TrendingUp, DollarSign, Package,
  AlertTriangle, CheckCircle, Clock, Sparkles
} from 'lucide-react';

import WeatherStrip from '@/components/widgets/WeatherStrip';
import TrafficPanel from '@/components/widgets/TrafficPanel';

const fetcher = (u: string) => fetch(u, { cache: 'no-store' }).then(r => r.json());

// Derivar el tipo de item desde las props de WeatherStrip
type Wx = ComponentProps<typeof WeatherStrip>['data'][number];

export default function DashboardHome() {
  // === DATA SOURCES ===
  const { data: me }     = useSWR('/endpoints/me', fetcher);
  const { data: today }  = useSWR('/endpoints/summary/today', fetcher);
  const { data: inbox }  = useSWR('/endpoints/inbox', fetcher);
  const { data: recent } = useSWR('/endpoints/my/recent', fetcher);

  // Clima y Tráfico
  const { data: wx } = useSWR(
    '/endpoints/ops/weather?cities=Cochabamba,El%20Alto,La%20Paz,Santa%20Cruz,Sucre',
    fetcher
  );
  const { data: tr } = useSWR(
    '/endpoints/ops/traffic?cities=Santa%20Cruz,La%20Paz,Cochabamba,El%20Alto,Sucre',
    fetcher
  );

  const name = (me?.full_name || '—').split(' ')[0];

  // === KPIs COMPUTADOS ===
  const kpis = useMemo(() => ({
    ingresos:     today?.ingresos_hoy     ?? 0,
    pedidos:      today?.pedidos_hoy      ?? 0,
    devoluciones: today?.devoluciones_hoy ?? 0,
    facturadas:   today?.facturadas_hoy   ?? 0,
  }), [today]);

  // === DATOS DEL CLIMA ===
  const toRiskEs = (r: unknown): Wx['risk'] => {
    const v = String(r ?? '').toLowerCase();
    if (v === 'high' || v === 'alto') return 'Alto';
    if (v === 'med' || v === 'medio' || v === 'medium') return 'Medio';
    if (v === 'low' || v === 'bajo') return 'Bajo';
    return undefined;
  };

  const weatherData: Wx[] = useMemo(() => {
    const list = (wx?.cities ?? []) as any[];
    return list.map((c): Wx => ({
      city: String(c.city || c.name || ''),
      tempC: Math.round(Number(c.temp ?? c.tempC ?? 0)),
      condition: String(c.condition ?? ''),
      icon: String(c.icon ?? '01d'),
      rain1h: Number(c.rain_1h ?? c.rain1h ?? 0),
      windKmh: Number(c.wind_kmh ?? c.windKmh ?? 0),
      risk: toRiskEs(c.risk),
    }));
  }, [wx]);

  return (
    <div className="min-h-screen space-y-8">
      {/* === HEADER HERO === */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative overflow-hidden"
      >
        {/* Efectos de fondo */}
        <div className="absolute inset-0 bg-gradient-to-r from-apple-blue-600/10 via-transparent to-apple-green-600/10 rounded-apple-xl" />
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-apple-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-apple-green-500/5 rounded-full blur-3xl" />
        
        <div className="relative glass-card">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-4">
              <motion.div
                whileHover={{ scale: 1.05, rotate: 5 }}
                className="p-4 bg-gradient-to-br from-apple-blue-500/20 to-apple-green-500/20 border border-white/20 rounded-apple-lg"
              >
                <Activity size={28} className="text-apple-blue-400" />
              </motion.div>
              <div>
                <motion.h1 
                  className="apple-h1 mb-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  Hola, {name} 👋
                </motion.h1>
                <motion.p 
                  className="apple-body text-apple-gray-300"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  Esto es lo que importa hoy
                </motion.p>
              </div>
            </div>
            
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="flex gap-3"
            >
              <Link href="/dashboard/sales-report" className="btn-primary">
                <TrendingUp size={18} />
                Ver reportes
                <ArrowRight size={16} />
              </Link>
              <Link href="/dashboard/asesores/registro" className="btn-secondary">
                <UserPlus size={18} />
                Acción rápida
              </Link>
            </motion.div>
          </div>
        </div>
      </motion.header>

      {/* === KPIs GRID === */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <KpiCard 
            title="Ventas de hoy" 
            value={money(kpis.ingresos)} 
            hint={`${kpis.pedidos} pedidos`}
            icon={<DollarSign size={20} />}
            trend="+12.5%"
            color="blue"
          />
          <KpiCard 
            title="Pedidos procesados" 
            value={num(kpis.pedidos)} 
            icon={<Package size={20} />}
            trend="+8.2%"
            color="green"
          />
          <KpiCard 
            title="Devoluciones" 
            value={num(kpis.devoluciones)} 
            icon={<RotateCcw size={20} />}
            trend="-2.1%"
            color="orange"
          />
          <KpiCard 
            title="Órdenes facturadas" 
            value={num(kpis.facturadas)} 
            icon={<CheckCircle size={20} />}
            trend="+15.3%"
            color="green"
          />
        </div>
      </motion.section>

      {/* === ACCIONES RÁPIDAS === */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <div className="glass-card">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-apple-blue-500/20 rounded-apple border border-apple-blue-500/30">
                <Sparkles size={18} className="text-apple-blue-400" />
              </div>
              <h2 className="apple-h2">Acciones rápidas</h2>
            </div>
            <Link 
              href="/dashboard/asesores/playbook-whatsapp" 
              className="text-apple-gray-400 hover:text-white transition-colors text-apple-body"
            >
              Ver playbook →
            </Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <QuickAction 
              href="/dashboard/promotores/registro" 
              icon={<Users2 size={20} />} 
              label="Registrar Promotor" 
              description="Nuevo promotor"
            />
            <QuickAction 
              href="/dashboard/asesores/registro" 
              icon={<UserPlus size={20} />} 
              label="Registrar Asesor" 
              description="Nuevo asesor"
            />
            <QuickAction 
              href="/dashboard/asesores/devoluciones" 
              icon={<RotateCcw size={20} />} 
              label="Nueva Devolución" 
              description="Procesar devolución"
            />
            <QuickAction 
              href="/dashboard/vendedores" 
              icon={<ClipboardList size={20} />} 
              label="Reporte Vendedores" 
              description="Ver estadísticas"
            />
            <QuickAction 
              href="/dashboard/promotores/admin" 
              icon={<ClipboardList size={20} />} 
              label="Reporte Promotores" 
              description="Análisis de rendimiento"
            />
            <QuickAction 
              href="/dashboard/admin/resumen" 
              icon={<ClipboardList size={20} />} 
              label="Reporte Asistencia" 
              description="Control de asistencia"
            />
          </div>
        </div>
      </motion.section>

      {/* === OPERATIVA DEL DÍA === */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        <div className="lg:col-span-2">
          <WeatherStrip data={weatherData} updatedAt={wx?.ts} />
        </div>
        <TrafficPanel
          incidents={tr?.incidents ?? []}
          updatedAt={tr?.updatedAt}
          onMapClick={() => { /* navegación opcional */ }}
        />
      </motion.section>

      {/* === ALERTAS Y ACTIVIDAD === */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Alertas */}
        <div className="lg:col-span-2">
          <div className="glass-card h-full">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-apple-orange-500/20 rounded-apple border border-apple-orange-500/30">
                  <Bell size={18} className="text-apple-orange-400" />
                </div>
                <h3 className="apple-h3">Alertas y notificaciones</h3>
              </div>
              <Link 
                href="/inbox" 
                className="text-apple-gray-400 hover:text-white transition-colors text-apple-body"
              >
                Ver todas
              </Link>
            </div>
            
            <div className="space-y-3">
              {(inbox ?? []).slice(0, 6).map((item: any, idx: number) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                >
                  <Link
                    href={item.ctaHref}
                    className="group flex items-start gap-4 p-4 bg-white/5 border border-white/10 rounded-apple hover:bg-white/10 hover:border-white/20 transition-all duration-300"
                  >
                    <div className="p-2 bg-apple-orange-500/20 rounded-apple border border-apple-orange-500/30">
                      <AlertTriangle size={16} className="text-apple-orange-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="apple-body font-medium text-white truncate mb-1">
                        {item.titulo}
                      </div>
                      <div className="apple-caption text-apple-gray-400 truncate">
                        {item.detalle}
                      </div>
                    </div>
                    <ArrowRight 
                      size={16} 
                      className="text-apple-gray-500 group-hover:text-white transition-colors mt-1" 
                    />
                  </Link>
                </motion.div>
              ))}
              
              {!inbox?.length && (
                <EmptyState 
                  icon={<CheckCircle size={24} />}
                  title="Todo en orden" 
                  subtitle="No hay alertas pendientes en este momento." 
                />
              )}
            </div>
          </div>
        </div>

        {/* Actividad reciente */}
        <div className="glass-card">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-apple-green-500/20 rounded-apple border border-apple-green-500/30">
              <Clock size={18} className="text-apple-green-400" />
            </div>
            <h3 className="apple-h3">Mi actividad</h3>
          </div>
          
          <div className="space-y-3">
            {(recent ?? []).slice(0, 8).map((event: any, idx: number) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                className="flex items-start gap-3 pb-3 border-b border-white/5 last:border-b-0"
              >
                <div className="w-2 h-2 rounded-full bg-apple-green-400 mt-2 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="apple-body font-medium text-white truncate mb-1">
                    {event.title}
                  </div>
                  <div className="apple-caption text-apple-gray-400">
                    {event.when}
                  </div>
                </div>
              </motion.div>
            ))}
            
            {!recent?.length && (
              <EmptyState 
                icon={<Clock size={24} />}
                title="Sin actividad reciente" 
                subtitle="Tu actividad aparecerá aquí."
              />
            )}
          </div>
        </div>
      </motion.section>
    </div>
  );
}

/* ===========================
   COMPONENTES UI
   =========================== */

function KpiCard({ 
  title, 
  value, 
  hint, 
  icon, 
  trend, 
  color = 'blue' 
}: { 
  title: string; 
  value: string; 
  hint?: string; 
  icon?: React.ReactNode;
  trend?: string;
  color?: 'blue' | 'green' | 'orange' | 'red';
}) {
  const colorClasses = {
    blue: 'from-apple-blue-500/20 to-apple-blue-600/10 border-apple-blue-500/30 text-apple-blue-400',
    green: 'from-apple-green-500/20 to-apple-green-600/10 border-apple-green-500/30 text-apple-green-400',
    orange: 'from-apple-orange-500/20 to-apple-orange-600/10 border-apple-orange-500/30 text-apple-orange-400',
    red: 'from-apple-red-500/20 to-apple-red-600/10 border-apple-red-500/30 text-apple-red-400',
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="glass-card hover:shadow-apple-lg transition-all duration-300"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="apple-caption text-apple-gray-400">{title}</div>
        {icon && (
          <div className={`p-2 bg-gradient-to-br ${colorClasses[color]} rounded-apple border`}>
            {icon}
          </div>
        )}
      </div>
      
      <div className="apple-h2 text-white mb-2">{value}</div>
      
      <div className="flex items-center justify-between">
        {hint && (
          <div className="apple-caption text-apple-gray-500">{hint}</div>
        )}
        {trend && (
          <div className={`apple-caption font-medium ${trend.startsWith('+') ? 'text-apple-green-400' : trend.startsWith('-') ? 'text-apple-red-400' : 'text-apple-gray-400'}`}>
            {trend}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function QuickAction({ 
  href, 
  icon, 
  label, 
  description 
}: { 
  href: string; 
  icon: React.ReactNode; 
  label: string;
  description?: string;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Link
        href={href}
        className="group flex flex-col items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-apple hover:bg-white/10 hover:border-white/20 transition-all duration-300 text-center"
      >
        <div className="p-3 bg-apple-blue-500/20 border border-apple-blue-500/30 rounded-apple group-hover:bg-apple-blue-500/30 transition-colors">
          {icon}
        </div>
        <div>
          <div className="apple-body font-medium text-white mb-1">{label}</div>
          {description && (
            <div className="apple-caption text-apple-gray-400">{description}</div>
          )}
        </div>
        <ArrowRight 
          size={16} 
          className="text-apple-gray-500 group-hover:text-white transition-colors opacity-0 group-hover:opacity-100" 
        />
      </Link>
    </motion.div>
  );
}

function EmptyState({ 
  icon, 
  title, 
  subtitle 
}: { 
  icon?: React.ReactNode;
  title: string; 
  subtitle?: string; 
}) {
  return (
    <div className="text-center py-8">
      {icon && (
        <div className="text-apple-gray-500 mb-3 flex justify-center">
          {icon}
        </div>
      )}
      <div className="apple-body font-medium text-apple-gray-300 mb-1">{title}</div>
      {subtitle && (
        <div className="apple-caption text-apple-gray-500">{subtitle}</div>
      )}
    </div>
  );
}

/* ===========================
   UTILIDADES
   =========================== */
function num(n: number) { 
  return (n ?? 0).toLocaleString('es-BO'); 
}

function money(n: number) { 
  return `Bs ${Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}`; 
}
