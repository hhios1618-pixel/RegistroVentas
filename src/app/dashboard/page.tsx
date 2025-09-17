// src/app/dashboard/page.tsx
'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { useMemo, type ComponentProps } from 'react';
import { motion } from 'framer-motion';
import {
  Activity, ArrowRight, Bell, ClipboardList, RotateCcw,
  UserPlus, Users2
} from 'lucide-react';

import WeatherStrip from '@/components/widgets/WeatherStrip';
import TrafficPanel from '@/components/widgets/TrafficPanel';

const fetcher = (u: string) => fetch(u, { cache: 'no-store' }).then(r => r.json());

// Derivar el tipo de item desde las props de WeatherStrip
type Wx = ComponentProps<typeof WeatherStrip>['data'][number];

export default function DashboardHome() {
  // --- Data sources (existentes en tu backend) ---
  const { data: me }     = useSWR('/endpoints/me', fetcher);
  const { data: today }  = useSWR('/endpoints/summary/today', fetcher);
  const { data: inbox }  = useSWR('/endpoints/inbox', fetcher);
  const { data: recent } = useSWR('/endpoints/my/recent', fetcher);

  // Clima y Tráfico (no inventan datos)
  const { data: wx } = useSWR(
    '/endpoints/ops/weather?cities=Cochabamba,El%20Alto,La%20Paz,Santa%20Cruz,Sucre',
    fetcher
  );
  const { data: tr } = useSWR(
    '/endpoints/ops/traffic?cities=Santa%20Cruz,La%20Paz,Cochabamba,El%20Alto,Sucre',
    fetcher
  );

  const name = (me?.full_name || '—').split(' ')[0];

  const kpis = useMemo(() => ({
    ingresos:     today?.ingresos_hoy     ?? 0,
    pedidos:      today?.pedidos_hoy      ?? 0,
    devoluciones: today?.devoluciones_hoy ?? 0,
    facturadas:   today?.facturadas_hoy   ?? 0,
  }), [today]);

  // Normaliza riesgo (inglés -> español) para que calce con WeatherStrip
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
      condition: String(c.condition ?? ''), // requerido por WeatherStrip
      icon: String(c.icon ?? '01d'),
      rain1h: Number(c.rain_1h ?? c.rain1h ?? 0),
      windKmh: Number(c.wind_kmh ?? c.windKmh ?? 0),
      risk: toRiskEs(c.risk),
    }));
  }, [wx]);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-40">
        <div className="relative">
          <div className="absolute inset-0 bg-[radial-gradient(1000px_500px_at_0%_-20%,rgba(255,255,255,.06),transparent)]" />
          <div className="relative backdrop-blur-xl bg-white/5 border-b border-white/10">
            <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-r from-cyan-500/30 to-blue-500/30 border border-cyan-400/30 rounded-xl">
                  <Activity size={22} />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-extrabold">Hola, {name}</h1>
                  <p className="text-white/60 text-sm">Esto es lo que importa hoy</p>
                </div>
              </div>
              <Link
                href="/dashboard/sales-report"
                className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-sm hover:bg-white/15"
              >
                Ver reportes →
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* KPIs */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <KpiCard title="Ventas (hoy)" value={money(kpis.ingresos)} hint={`${kpis.pedidos} pedidos`} />
          <KpiCard title="Pedidos (hoy)" value={num(kpis.pedidos)} />
          <KpiCard title="Devoluciones (hoy)" value={num(kpis.devoluciones)} />
          <KpiCard title="Órdenes facturadas" value={num(kpis.facturadas)} />
        </section>

        {/* Acciones rápidas */}
        <section className="relative">
          <Panel>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Acciones rápidas</h2>
              <Link href="/dashboard/asesores/playbook-whatsapp" className="text-white/60 text-sm hover:text-white">
                Playbook →
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <QuickAction href="/dashboard/promotores/registro" icon={<Users2 size={16} />} label="Registrar Promotor" />
              <QuickAction href="/dashboard/asesores/registro"   icon={<UserPlus size={16} />} label="Registrar Asesor" />
              <QuickAction href="/dashboard/asesores/devoluciones" icon={<RotateCcw size={16} />} label="Nueva Devolución" />
              <QuickAction href="/dashboard/vendedores" icon={<ClipboardList size={16} />} label="Reporte Vendedores" />
              <QuickAction href="/dashboard/promotores/admin" icon={<ClipboardList size={16} />} label="Reporte Promotores" />
              <QuickAction href="/dashboard/admin/resumen" icon={<ClipboardList size={16} />} label="Reporte Asistencia" />
            </div>
          </Panel>
        </section>

        {/* Operativa del día: Clima + Tránsito */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <WeatherStrip data={weatherData} updatedAt={wx?.ts} />
          </div>
          <TrafficPanel
            incidents={tr?.incidents ?? []}
            updatedAt={tr?.updatedAt}
            onMapClick={() => { /* opcional: navegación a un mapa si lo tienes */ }}
          />
        </section>

        {/* Inbox y actividad */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Panel className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Bell size={18} className="text-amber-300" /> Alertas
              </h3>
              <Link href="/inbox" className="text-white/60 text-sm hover:text-white">Ver todo</Link>
            </div>
            <div className="grid gap-2">
              {(inbox ?? []).slice(0, 8).map((it: any, idx: number) => (
                <motion.div
                  key={it.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: .25, delay: idx * 0.02 }}
                >
                  <Link
                    href={it.ctaHref}
                    className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-lg px-3 py-2 hover:bg-white/10"
                  >
                    <span className="mt-1 w-2 h-2 rounded-full bg-amber-300" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{it.titulo}</div>
                      <div className="text-xs text-white/70 truncate">{it.detalle}</div>
                    </div>
                    <ArrowRight size={14} className="text-white/60 mt-1" />
                  </Link>
                </motion.div>
              ))}
              {!inbox?.length && (
                <EmptyState title="Sin alertas" subtitle="Todo en orden por ahora." />
              )}
            </div>
          </Panel>

          <Panel>
            <h3 className="text-lg font-bold mb-3">Mi actividad</h3>
            <div className="grid gap-2">
              {(recent ?? []).slice(0, 8).map((ev: any, idx: number) => (
                <motion.div
                  key={ev.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: .25, delay: idx * 0.02 }}
                  className="flex items-start gap-3 border-b border-white/10 pb-2"
                >
                  <span className="w-2 h-2 rounded-full bg-cyan-300 mt-1" />
                  <div className="text-sm min-w-0">
                    <div className="font-semibold truncate">{ev.title}</div>
                    <div className="text-white/60 text-xs">{ev.when}</div>
                  </div>
                </motion.div>
              ))}
              {!recent?.length && <EmptyState title="Sin actividad reciente" />}
            </div>
          </Panel>
        </section>
      </main>
    </div>
  );
}

/* ===========================
   UI helpers (autocontenidos)
   =========================== */

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_80%_-20%,rgba(255,255,255,.06),transparent)] rounded-2xl" />
      <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
        {children}
      </div>
    </div>
  );
}

function KpiCard({ title, value, hint }: { title: string; value: string; hint?: string }) {
  return (
    <motion.div
      className="relative overflow-hidden"
      whileHover={{ scale: 1.02, y: -4 }}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: .35 }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(900px_400px_at_0%_-20%,rgba(255,255,255,.06),transparent)] rounded-xl" />
      <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-5">
        <div className="text-sm text-white/70">{title}</div>
        <div className="text-2xl font-extrabold tracking-tight">{value}</div>
        {hint && <div className="text-xs text-white/50 mt-1">{hint}</div>}
      </div>
    </motion.div>
  );
}

function QuickAction({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-2 px-3 py-2 bg-white/10 border border-white/20 rounded-lg hover:bg-white/15"
    >
      {icon}
      <span className="text-sm">{label}</span>
      <ArrowRight size={14} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}

function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <div className="text-sm font-semibold text-white/80">{title}</div>
      {subtitle && <div className="text-xs text-white/60">{subtitle}</div>}
    </div>
  );
}

/* ===========================
   Utils
   =========================== */
function num(n: number)   { return (n ?? 0).toLocaleString('es-BO'); }
function money(n: number) { return `Bs ${Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}`; }