// src/app/dashboard/page.tsx
'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { useMemo, type ComponentProps } from 'react';
import { motion } from 'framer-motion';
import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Activity, ArrowRight, Bell, ClipboardList, RotateCcw,
  UserPlus, Users2, DollarSign, Package,
  AlertTriangle, CheckCircle, Clock, Sparkles, TrendingUp
} from 'lucide-react';
import { normalizeRole, type Role } from '@/lib/auth/roles';

import WeatherStrip from '@/components/widgets/WeatherStrip';
import TrafficPanel from '@/components/widgets/TrafficPanel';

const fetcher = async (u: string) => {
  const res = await fetch(u, { cache: 'no-store' });
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Request failed: ${res.status}`);
  }
  return res.json();
};

// Derivar el tipo de item desde las props de WeatherStrip
type Wx = ComponentProps<typeof WeatherStrip>['data'][number];

type AlertItem = {
  id: string;
  title: string;
  subtitle: string;
  detail: string | null;
  amount: number;
  quantity: number;
  href: string;
  when: string | null;
  whenExact: string | null;
};

type ActivityItem = {
  id: string;
  title: string;
  when: string;
  whenExact: string;
  ts: number;
};

export default function DashboardHome() {
  // === DATA SOURCES ===
  const { data: me } = useSWR('/endpoints/me', fetcher);

  const role: Role = useMemo(() => normalizeRole(me?.role), [me?.role]);
  const name = (me?.full_name || '—').split(' ')[0];

  const todayKey = useMemo(() => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz' }).format(new Date()), []);
  const monthKey = useMemo(() => todayKey.slice(0, 7), [todayKey]);

  const { data: salesSummary } = useSWR('/endpoints/sales-summary', fetcher);
  const { data: returnsStats } = useSWR('/endpoints/stats/today-returns', fetcher);
  const { data: returnsReport } = useSWR('/endpoints/returns-report', fetcher);
  const { data: mySales } = useSWR(() => (me?.ok ? `/endpoints/my/sales?month=${monthKey}` : null), fetcher);
  const { data: myAttendance } = useSWR(() => (me?.ok && role !== 'promotor' ? `/endpoints/my/attendance?month=${monthKey}` : null), fetcher);

  // Clima y Tráfico
  const { data: wx } = useSWR(
    '/endpoints/ops/weather?cities=Cochabamba,El%20Alto,La%20Paz,Santa%20Cruz,Sucre',
    fetcher
  );
  const { data: tr } = useSWR(
    '/endpoints/ops/traffic?cities=Santa%20Cruz,La%20Paz,Cochabamba,El%20Alto,Sucre',
    fetcher
  );

  const todaysSales = useMemo(() => {
    if (!Array.isArray(salesSummary)) return [] as any[];
    return salesSummary.filter((row: any) => {
      const date = row?.summary_date ?? row?.summaryDate;
      if (!date) return false;
      return String(date).slice(0, 10) === todayKey;
    });
  }, [salesSummary, todayKey]);

  const monthSummary = useMemo(() => {
    if (!Array.isArray(salesSummary)) return { revenue: 0, products: 0 };
    const rows = salesSummary.filter((row: any) => String(row?.summary_date ?? '').startsWith(monthKey));
    return {
      revenue: rows.reduce((sum, row) => sum + Number(row?.total_revenue ?? row?.total ?? 0), 0),
      products: rows.reduce((sum, row) => sum + Number(row?.total_products_sold ?? 0), 0),
    };
  }, [salesSummary, monthKey]);

  const kpis = useMemo(() => {
    const ingresos = todaysSales.reduce((sum, row) => sum + Number(row?.total_revenue ?? row?.total ?? 0), 0);
    const productos = todaysSales.reduce((sum, row) => sum + Number(row?.total_products_sold ?? 0), 0);
    const registros = todaysSales.length;
    const devolucionesCount = Number(returnsStats?.count ?? 0);
    const devolucionesMonto = Number(returnsStats?.amount ?? 0);
    return {
      ingresos,
      productos,
      registros,
      devolucionesCount,
      devolucionesMonto,
    };
  }, [todaysSales, returnsStats]);

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

  const alerts = useMemo(() => {
    if (!Array.isArray(returnsReport)) return [] as AlertItem[];
    return returnsReport.slice(0, 6).map((item: any, idx: number) => {
      const date = parseDate(item?.return_date);
      const titleBase = item?.product_name ? String(item.product_name) : `Devolución #${item?.return_id ?? idx + 1}`;
      const branch = item?.branch ? `(${item.branch})` : '';
      return {
        id: `return-${item?.return_id ?? idx}`,
        title: `${titleBase} ${branch}`.trim(),
        subtitle: item?.customer_name ? `Cliente: ${item.customer_name}` : 'Devolución registrada',
        detail: item?.reason || null,
        amount: Number(item?.return_amount ?? 0),
        quantity: Number(item?.quantity ?? 0),
        href: '/dashboard/asesores/devoluciones',
        when: date ? relativeTime(date) : null,
        whenExact: date ? shortDate(date) : null,
      } satisfies AlertItem;
    });
  }, [returnsReport]);

  const activity = useMemo(() => {
    const events: ActivityItem[] = [];

    const salesList = Array.isArray(mySales?.list) ? mySales.list : [];
    for (const sale of salesList) {
      const date = parseDate(sale?.order_date ?? sale?.created_at);
      if (!date) continue;
      events.push({
        id: `sale-${sale?.id ?? date.getTime()}`,
        title: `${sale?.product_name || 'Venta'} · ${money(Number(sale?.total ?? 0))}`,
        when: relativeTime(date),
        whenExact: shortDate(date),
        ts: date.getTime(),
      });
    }

    const days = Array.isArray(myAttendance?.days) ? myAttendance.days : [];
    for (const day of days) {
      const firstIn = parseDate(day?.first_in);
      if (firstIn) {
        events.push({
          id: `att-in-${day.date}`,
          title: `Entrada registrada · ${format(firstIn, 'HH:mm', { locale: es })}`,
          when: relativeTime(firstIn),
          whenExact: shortDate(firstIn),
          ts: firstIn.getTime(),
        });
      }
      const lastOut = parseDate(day?.last_out);
      if (lastOut) {
        events.push({
          id: `att-out-${day.date}`,
          title: `Salida registrada · ${format(lastOut, 'HH:mm', { locale: es })}`,
          when: relativeTime(lastOut),
          whenExact: shortDate(lastOut),
          ts: lastOut.getTime(),
        });
      }
    }

    events.sort((a, b) => b.ts - a.ts);
    return events.slice(0, 8);
  }, [myAttendance, mySales]);

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
            title="Ingresos de hoy" 
            value={money(kpis.ingresos)} 
            hint={`${num(kpis.productos)} productos`}
            icon={<DollarSign size={20} />}
            color="blue"
          />
          <KpiCard 
            title="Productos vendidos" 
            value={num(kpis.productos)} 
            hint={`Sucursales activas: ${num(kpis.registros)}`}
            icon={<Package size={20} />}
            color="green"
          />
          <KpiCard 
            title="Devoluciones (hoy)" 
            value={num(kpis.devolucionesCount)} 
            hint={money(kpis.devolucionesMonto)}
            icon={<RotateCcw size={20} />}
            color="orange"
          />
          <KpiCard 
            title="Ventas del mes" 
            value={money(monthSummary.revenue)} 
            hint={`${num(monthSummary.products)} productos`}
            icon={<CheckCircle size={20} />}
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
              Ver Central Operativa →
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
              {alerts.map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                >
                  <Link
                    href={item.href}
                    className="group flex items-start gap-4 p-4 bg-white/5 border border-white/10 rounded-apple hover:bg-white/10 hover:border-white/20 transition-all duration-300"
                  >
                    <div className="p-2 bg-apple-orange-500/20 rounded-apple border border-apple-orange-500/30">
                      <AlertTriangle size={16} className="text-apple-orange-400" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="apple-body font-medium text-white truncate">
                          {item.title}
                        </div>
                        {item.amount > 0 && (
                          <span className="apple-caption text-apple-orange-300 bg-apple-orange-500/10 border border-apple-orange-500/30 rounded-apple px-2 py-0.5">
                            {money(item.amount)}
                          </span>
                        )}
                      </div>
                      <div className="apple-caption text-apple-gray-400 truncate">
                        {item.subtitle}
                      </div>
                      {item.detail && (
                        <div className="apple-caption text-apple-gray-500 truncate">
                          {item.detail}
                        </div>
                      )}
                      {item.when && (
                        <div className="apple-caption text-apple-gray-600">
                          {item.when} {item.whenExact ? `• ${item.whenExact}` : ''}
                        </div>
                      )}
                    </div>
                    <ArrowRight 
                      size={16} 
                      className="text-apple-gray-500 group-hover:text-white transition-colors mt-1" 
                    />
                  </Link>
                </motion.div>
              ))}

              {!alerts.length && (
                <EmptyState 
                  icon={<CheckCircle size={24} />}
                  title="Todo en orden" 
                  subtitle="No hay devoluciones pendientes en este momento." 
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
            {activity.map((event, idx) => (
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
                  {event.whenExact && (
                    <div className="apple-caption text-apple-gray-500">
                      {event.whenExact}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}

            {!activity.length && (
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

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return isValid(value) ? value : null;
  }
  const date = parseISO(String(value));
  return isValid(date) ? date : null;
}

function relativeTime(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: true, locale: es });
}

function shortDate(date: Date): string {
  return format(date, 'dd MMM • HH:mm', { locale: es });
}
