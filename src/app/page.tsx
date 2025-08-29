'use client';

import Link from 'next/link';
import { useEffect, useState, useMemo, SVGProps, FC } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

// --- TIPOS Y DATOS DE EJEMPLO ---

type IconProps = SVGProps<SVGSVGElement>;

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  description: string;
  chartData?: { h: number; v: number }[];
  trend?: 'up' | 'down' | 'stable';
  color: string;
}

interface QuickLinkCardProps {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  shortcut: string;
  accentColor: string;
  gradient: string;
}

const salesData = [
  { h: 0, v: 5 }, { h: 2, v: 8 }, { h: 4, v: 10 }, { h: 6, v: 15 },
  { h: 8, v: 12 }, { h: 10, v: 20 }, { h: 12, v: 35 }, { h: 14, v: 40 },
  { h: 16, v: 55 }, { h: 18, v: 60 }, { h: 20, v: 75 }, { h: 22, v: 80 },
];

// --- HOOK PERSONALIZADO PARA LA HORA ---

const useCurrentTime = () => {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = useMemo(() => {
    if (!currentTime) return '00:00:00';
    return currentTime.toLocaleTimeString('es-BO', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  }, [currentTime]);

  const formattedDate = useMemo(() => {
    if (!currentTime) return 'Cargando fecha...';
    return currentTime.toLocaleDateString('es-BO', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }, [currentTime]);

  const greeting = useMemo(() => {
    if (!currentTime) return 'Buenas';
    const hour = currentTime.getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 19) return 'Buenas tardes';
    return 'Buenas noches';
  }, [currentTime]);

  return { formattedTime, formattedDate, greeting };
};


// --- COMPONENTES DE UI REUTILIZABLES ---

const StatCard: FC<StatCardProps> = ({ icon, title, value, description, trend = 'stable', color }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    const numericValue = typeof value === 'string' ? parseInt(value.replace(/[^0-9]/g, '')) || 0 : value;
    if (isNaN(numericValue)) return;
    const duration = 1500;
    const steps = 50;
    const increment = numericValue / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= numericValue) {
        setAnimatedValue(numericValue as number);
        clearInterval(timer);
      } else {
        setAnimatedValue(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);

  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return <span className="text-green-400 text-xs">↗</span>;
      case 'down': return <span className="text-red-400 text-xs">↘</span>;
      default: return <span className="text-gray-400 text-xs">→</span>;
    }
  };

  return (
    <div
      className={`relative group bg-gray-900/80 backdrop-blur-xl rounded-xl p-5 border border-gray-700/50 overflow-hidden transition-all duration-300 hover:border-${color}-500/30`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`absolute inset-0 bg-gradient-to-r from-${color}-500/0 via-${color}-500/5 to-${color}-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className={`text-${color}-400 transition-transform duration-300 ${isHovered ? 'scale-110' : ''}`}>{icon}</div>
          <div className="flex items-center space-x-1">{getTrendIcon()}</div>
        </div>
        <h3 className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">{title}</h3>
        <div className={`text-2xl font-bold text-white mb-2 transition-all duration-300 ${isHovered ? 'scale-105' : ''}`}>
          {typeof value === 'string' ? value : animatedValue.toLocaleString('es-BO')}
        </div>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
    </div>
  );
};

const QuickLinkCard: FC<QuickLinkCardProps> = ({ href, icon, title, description, shortcut, accentColor, gradient }) => (
  <Link href={href} className="group block h-full">
    <motion.div
      className={`relative bg-gray-900/60 backdrop-blur-2xl rounded-xl p-6 border border-gray-700/30 transition-all duration-300 hover:border-${accentColor}-500/30 flex flex-col h-full overflow-hidden`}
      variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}
      whileHover={{ y: -8, transition: { duration: 0.3 } }}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-5">
          <div className={`text-${accentColor}-400 transition-all duration-300 group-hover:text-${accentColor}-300 group-hover:scale-110`}>
            {icon}
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-gray-600/30 group-hover:border-gray-500/50 transition-all duration-300">
            <kbd className="text-xs font-mono text-gray-300 group-hover:text-white">{shortcut}</kbd>
          </div>
        </div>
        <div className="flex-grow">
          <h2 className={`text-xl font-semibold text-white mb-2 group-hover:text-${accentColor}-100 transition-colors duration-300`}>
            {title}
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed group-hover:text-gray-300 transition-colors duration-300">
            {description}
          </p>
        </div>
        <div className={`flex items-center text-${accentColor}-400 group-hover:text-${accentColor}-300 text-sm font-medium mt-6 transition-all duration-300 group-hover:translate-x-1`}>
          <span>Acceder al panel</span>
          <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </div>
      </div>
    </motion.div>
  </Link>
);

// --- COMPONENTE PRINCIPAL DE LA PÁGINA ---
export default function FenixHomePage() {
  const { formattedTime, formattedDate, greeting } = useCurrentTime();
  const [isLoaded, setIsLoaded] = useState(false);
  const [usdRate] = useState({ oficial: 6.96, paralelo: 7.15, loading: false, error: null, lastUpdated: 'Hace 5 min' });
  const [todayStats] = useState({ sales: 847, orders: 124, revenue: 185420, returns: 12, returnsAmount: 8540 });

  useEffect(() => {
    setIsLoaded(true);

    // Atajos de teclado → rutas correctas
    const handleKeyDown = (e: KeyboardEvent) => {
      const shortcuts: Record<string, string> = {
        '1': '/logistica',
        '2': '/dashboard/sales-report',
        '3': '/dashboard/vendedores',
        '4': '/returns-dashboard',
      };
      if (shortcuts[e.key]) {
        window.location.href = shortcuts[e.key];
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.2 } },
  };

  return (
    <main className={`min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white font-sans transition-all duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'} overflow-hidden`}>
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute w-80 h-80 -translate-x-1/2 -translate-y-1/2 left-1/4 top-1/4 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute w-72 h-72 translate-x-1/2 translate-y-1/2 right-1/4 bottom-1/4 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
      </div>

      <motion.div
        className="relative z-10 max-w-7xl mx-auto p-6 space-y-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <header className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
                FENIX
              </h1>
              <div className="h-8 w-px bg-gray-700/50"></div>
              <span className="text-sm text-gray-400 font-light uppercase tracking-widest">OPERACIONES</span>
            </div>
            <div className="flex items-center space-x-3 bg-gray-800/30 backdrop-blur-sm px-4 py-2 rounded-lg border border-gray-700/30">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-300">Sistema activo</span>
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-lg text-gray-300">{greeting}, <span className="font-medium text-blue-400">Equipo Fenix</span>.</p>
            <div className="flex items-center space-x-5">
              <div className="text-3xl font-mono text-white font-medium bg-gray-800/30 backdrop-blur-sm px-4 py-2 rounded-lg border border-gray-700/30">
                {formattedTime}
              </div>
              <div className="text-sm text-gray-400 capitalize bg-gray-800/30 backdrop-blur-sm px-3 py-1.5 rounded-md border border-gray-700/30">
                {formattedDate}
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-gray-900/80 backdrop-blur-xl rounded-xl p-5 border border-gray-700/50 lg:col-span-1 transition-all duration-300 hover:border-yellow-500/30">
            <div className="flex items-center justify-between mb-3">
              <div className="text-yellow-400">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs text-gray-400">{usdRate.lastUpdated}</span>
              </div>
            </div>
            <h3 className="text-xs font-medium text-gray-400 mb-3 uppercase tracking-wider">USD Bolivia</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Oficial:</span>
                <span className="text-yellow-300 font-mono text-base font-medium">{usdRate.oficial.toFixed(2)} Bs</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Paralelo:</span>
                <span className="text-blue-300 font-mono text-base font-medium">{usdRate.paralelo.toFixed(2)} Bs</span>
              </div>
            </div>
          </div>
          <StatCard icon={<TrendingUpIcon />} title="Ventas de Hoy" value={todayStats.sales} description="+12% vs ayer" trend="up" color="blue"/>
          <StatCard icon={<PackageIcon />} title="Pedidos Activos" value={todayStats.orders} description="En proceso de entrega" color="emerald"/>
          <StatCard icon={<ReturnIcon />} title="Devoluciones Hoy" value={todayStats.returns} description={`${todayStats.returnsAmount.toLocaleString('es-BO')} Bs`} trend="down" color="red"/>
          <StatCard icon={<WalletIcon />} title="Ingresos (Bs)" value={todayStats.revenue.toLocaleString('es-BO')} description="Total facturado hoy" trend="up" color="purple"/>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-6">
          <QuickLinkCard 
            href="/logistica" icon={<TruckIcon className="w-8 h-8"/>}
            title="Panel de Logística"
            description="Asigna, monitorea y gestiona el despacho de todos los pedidos."
            shortcut="1" accentColor="blue"
            gradient="from-blue-500 to-cyan-500"
          />
          <QuickLinkCard 
            href="/dashboard/sales-report" icon={<ClipboardIcon className="w-8 h-8"/>}
            title="Reporte de Ventas"
            description="Analiza las ventas diarias, semanales y ROAS por canal."
            shortcut="2" accentColor="emerald"
            gradient="from-emerald-500 to-green-500"
          />
          <QuickLinkCard 
            href="/dashboard/vendedores" icon={<UsersIcon className="w-8 h-8"/>}
            title="Detalle de Vendedores"
            description="Rendimiento por asesor: ventas, inversión Meta y conversión."
            shortcut="3" accentColor="amber"
            gradient="from-amber-500 to-orange-500"
          />
          <QuickLinkCard 
            href="/returns-dashboard" icon={<RouteIcon className="w-8 h-8"/>}
            title="Devoluciones"
            description="Trazabilidad de devoluciones, motivos y montos recuperados."
            shortcut="4" accentColor="purple"
            gradient="from-purple-500 to-violet-500"
          />
        </div>

        <footer className="text-center pt-8">
          <div className="flex items-center justify-center space-x-4 text-gray-500 text-sm">
            <span>Atajos rápidos:</span>
            {[
              { key: '1', label: 'Logística' },
              { key: '2', label: 'Reporte Ventas' },
              { key: '3', label: 'Vendedores' },
              { key: '4', label: 'Devoluciones' }
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center space-x-1 group hover:text-white transition-colors duration-200">
                <kbd className="bg-gray-800/50 backdrop-blur-sm px-2 py-1 rounded text-xs font-mono border border-gray-600/30 group-hover:border-gray-500/50 transition-all duration-200">
                  {key}
                </kbd>
                <span className="text-xs">{label}</span>
              </div>
            ))}
          </div>
          <div className="relative mt-5">
            <div className="w-24 h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent mx-auto mb-3" />
            <p className="text-gray-600 text-xs font-light">
              Fenix Store © 2025 - Sistema de Gestión Integral
            </p>
          </div>
        </footer>
      </motion.div>
    </main>
  );
}

// --- COLECCIÓN DE ICONOS SVG ---
const TrendingUpIcon = (props: IconProps) => (<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>);
const PackageIcon = (props: IconProps) => (<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>);
const ReturnIcon = (props: IconProps) => (<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 15l6-6m-6 0l6 6m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>);
const WalletIcon = (props: IconProps) => (<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 00-2 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>);
const TruckIcon = (props: IconProps) => (<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125V14.25m-17.25 4.5v-1.875a3.375 3.375 0 0 1 3.375-3.375h9.75a3.375 3.375 0 0 1 3.375 3.375v1.875M16.5 12.75v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H3.75m12.75 15-3.75-3.75M16.5 12.75 12.75 9" /></svg>);
const ClipboardIcon = (props: IconProps) => (<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5-1.5H15M10.5 4.5h3m-3 0V3" /></svg>);
const RouteIcon = (props: IconProps) => (<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.622 10.551a1.061 1.061 0 0 1 .535 1.954l-3.355 1.678a1.06 1.06 0 0 0 .535 1.954l3.355-1.678a1.06 1.06 0 0 1 1.07 0l3.355 1.678a1.06 1.06 0 0 0 1.07 0l3.355-1.678a1.06 1.06 0 0 1 .535-1.954l-3.355-1.678a1.06 1.06 0 0 0 0-1.908l3.355-1.678a1.06 1.06 0 0 1-.535-1.954l-3.355 1.678a1.06 1.06 0 0 0-1.07 0L10.5 8.822a1.06 1.06 0 0 1-1.07 0L6.075 7.144a1.06 1.06 0 0 0-1.07 0L1.65 8.822a1.06 1.06 0 0 1-.535 1.954l3.355 1.678a1.06 1.06 0 0 0 1.07 0l3.355-1.678Z" /></svg>);
const UsersIcon = (props: IconProps) => (<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 18.72a9.094 9.094 0 0 0 3.75-5.25M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM6.75 18h9a9.06 9.06 0 0 0-9 0Zm-3.375 0a9.06 9.06 0 0 1-1.875-5.25M9 12a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z" /></svg>);