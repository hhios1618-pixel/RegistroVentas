'use client';

import Link from 'next/link';
import { useEffect, useState, useMemo, SVGProps, FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

// --- TIPOS Y DATOS DE EJEMPLO ---

type IconProps = SVGProps<SVGSVGElement>;

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  description: string;
  chartData?: { h: number; v: number }[];
}

interface QuickLinkCardProps {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  shortcut: string;
  accentColor: string;
}

// Datos simulados para el mini-gráfico de ventas
const salesData = [
  { h: 0, v: 5 }, { h: 2, v: 8 }, { h: 4, v: 10 }, { h: 6, v: 15 },
  { h: 8, v: 12 }, { h: 10, v: 20 }, { h: 12, v: 35 }, { h: 14, v: 40 },
  { h: 16, v: 55 }, { h: 18, v: 60 }, { h: 20, v: 75 }, { h: 22, v: 80 },
];

// --- HOOK PERSONALIZADO PARA LA HORA ---

const useCurrentTime = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = useMemo(() => currentTime.toLocaleTimeString('es-BO', {
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  }), [currentTime]);

  const formattedDate = useMemo(() => currentTime.toLocaleDateString('es-BO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  }), [currentTime]);

  const greeting = useMemo(() => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 19) return 'Buenas tardes';
    return 'Buenas noches';
  }, [currentTime]);

  return { formattedTime, formattedDate, greeting };
};


// --- COMPONENTES DE UI REUTILIZABLES ---

const StatCard: FC<StatCardProps> = ({ icon, title, value, description, chartData }) => (
  <motion.div
    className="bg-slate-800/50 backdrop-blur-lg rounded-xl p-5 border border-slate-700/80 relative overflow-hidden"
    variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}
    whileHover={{ y: -5, transition: { duration: 0.2 } }}
  >
    <div className="relative z-10">
      <div className="text-slate-400 mb-3">{icon}</div>
      <h3 className="text-sm font-medium text-slate-400 mb-1">{title}</h3>
      <AnimatePresence mode="wait">
        <motion.div
          key={value}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.3 }}
          className="text-3xl font-bold text-white"
        >
          {value}
        </motion.div>
      </AnimatePresence>
      <p className="text-xs text-slate-500 mt-1">{description}</p>
    </div>
    {chartData && (
      <div className="absolute right-0 bottom-0 w-2/3 h-1/2 opacity-50 pointer-events-none">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <Line type="monotone" dataKey="v" stroke="#0ea5e9" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    )}
  </motion.div>
);

const QuickLinkCard: FC<QuickLinkCardProps> = ({ href, icon, title, description, shortcut, accentColor }) => (
  <Link href={href} className="group block">
    <motion.div
      className={`bg-slate-800/60 backdrop-blur-xl rounded-2xl p-8 border border-slate-700/80 transition-colors duration-300 hover:border-${accentColor}-500/80`}
      variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}
      whileHover={{ y: -8, transition: { duration: 0.3 } }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`text-${accentColor}-400 group-hover:scale-110 transition-transform duration-300`}>{icon}</div>
        <kbd className="bg-slate-700/50 px-3 py-1 rounded-md text-sm font-mono text-slate-300">{shortcut}</kbd>
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
      <p className="text-slate-400 leading-relaxed mb-6">{description}</p>
      <div className={`flex items-center text-${accentColor}-400 group-hover:translate-x-1 transition-transform duration-300 font-medium`}>
        <span>Acceder al panel</span>
        <ArrowRightIcon className="w-5 h-5 ml-2" />
      </div>
    </motion.div>
  </Link>
);


// --- COMPONENTE PRINCIPAL DE LA PÁGINA ---

export default function FenixHomePage() {
  const { formattedTime, formattedDate, greeting } = useCurrentTime();
  const [isLoaded, setIsLoaded] = useState(false);
  
  const [usdRate, setUsdRate] = useState({
    oficial: 6.96,
    paralelo: 0,
    loading: true,
    error: null as string | null,
    lastUpdated: ''
  });

  const [todayStats, setTodayStats] = useState({
    sales: 124,
    orders: 38,
    revenue: 12540
  });

  useEffect(() => {
    setIsLoaded(true);

    const fetchRate = async () => {
      try {
        const res = await fetch('/api/usd-rate');
        if (!res.ok) throw new Error('No se pudo obtener la tasa de cambio');
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setUsdRate(prev => ({ ...prev, paralelo: data.price, loading: false, error: null, lastUpdated: data.lastUpdated }));
      } catch (error: any) {
        setUsdRate(prev => ({ ...prev, loading: false, error: error.message }));
      }
    };
    
    fetchRate();
    const rateInterval = setInterval(fetchRate, 60000);

    const statsInterval = setInterval(() => {
      setTodayStats({
        sales: Math.floor(Math.random() * 150) + 80,
        orders: Math.floor(Math.random() * 45) + 25,
        revenue: Math.floor(Math.random() * 15000) + 8000
      });
    }, 15000);

    const handleKeyDown = (e: KeyboardEvent) => {
      const shortcuts: Record<string, string> = { '1': '/logistica', '2': '/dashboard/sales-report' };
      if (shortcuts[e.key]) window.location.href = shortcuts[e.key];
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(rateInterval);
      clearInterval(statsInterval);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
  
  const renderParaleloRate = () => {
    if (usdRate.loading) return <span className="text-slate-400">Cargando...</span>;
    if (usdRate.error) return <span className="text-red-400 text-sm">Error</span>;
    return <span className="text-sky-300 font-mono">{usdRate.paralelo.toFixed(2)} Bs</span>;
  };
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5 } },
  };

  return (
    <main className={`min-h-screen bg-slate-900 text-white font-sans transition-opacity duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute w-[50vw] h-[50vw] -translate-x-1/2 -translate-y-1/2 left-1/4 top-1/4 bg-sky-500/20 rounded-full blur-[150px] animate-pulse-slow"></div>
        <div className="absolute w-[40vw] h-[40vw] translate-x-1/2 translate-y-1/2 right-1/4 bottom-1/4 bg-emerald-500/20 rounded-full blur-[120px] animate-pulse-slow animation-delay-2000"></div>
      </div>
      
      <motion.div 
        className="relative z-10 max-w-7xl mx-auto p-6 md:p-8 space-y-12"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.header className="space-y-2" variants={itemVariants}>
          <div className="flex items-baseline space-x-3">
             <h1 className="text-5xl md:text-6xl font-black tracking-tighter">FENIX</h1>
             <span className="text-lg text-slate-400 font-light">STORE</span>
          </div>
           <p className="text-xl text-slate-300">{greeting}, Equipo Fenix.</p>
          <div className="flex items-center space-x-4 pt-2">
            <div className="text-3xl font-mono text-sky-400 tracking-wider">{formattedTime}</div>
            <div className="text-base text-slate-400 capitalize border-l border-slate-600 pl-4">{formattedDate}</div>
          </div>
        </motion.header>

        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          variants={containerVariants}
        >
          <motion.div
            className="bg-slate-800/50 backdrop-blur-lg rounded-xl p-5 border border-slate-700/80"
            variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}
          >
             <div className="flex items-center justify-between mb-3">
              <div className="text-slate-400"><DollarIcon className="w-6 h-6"/></div>
              {!usdRate.loading && !usdRate.error && <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" title={`Actualizado: ${new Date(usdRate.lastUpdated).toLocaleTimeString()}`} />}
            </div>
            <h3 className="text-sm font-medium text-slate-400 mb-2">USD Bolivia</h3>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center"><span className="text-slate-400">Oficial:</span> <span className="text-yellow-300 font-mono">{usdRate.oficial.toFixed(2)} Bs</span></div>
              <div className="flex justify-between items-center"><span className="text-slate-400">Paralelo:</span> {renderParaleloRate()}</div>
            </div>
          </motion.div>
          <StatCard 
            icon={<TrendingUpIcon className="w-6 h-6"/>} 
            title="Ventas de Hoy" 
            value={todayStats.sales} 
            description="+12% vs ayer"
            chartData={salesData}
          />
          <StatCard 
            icon={<PackageIcon className="w-6 h-6"/>} 
            title="Pedidos Activos" 
            value={todayStats.orders} 
            description="En proceso de entrega"
          />
          <StatCard 
            icon={<WalletIcon className="w-6 h-6"/>} 
            title="Ingresos (Bs)" 
            value={todayStats.revenue.toLocaleString('es-BO')} 
            description="Total facturado hoy" 
          />
        </motion.div>

        <motion.div 
            className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6"
            variants={containerVariants}
        >
          <QuickLinkCard 
            href="/logistica"
            icon={<TruckIcon className="w-10 h-10"/>}
            title="Panel de Logística"
            description="Gestiona rutas, asigna pedidos y monitorea entregas en tiempo real."
            shortcut="1"
            accentColor="sky"
          />
          <QuickLinkCard 
            href="/dashboard/sales-report"
            icon={<ChartIcon className="w-10 h-10"/>}
            title="Dashboard de Ventas"
            description="Analytics, KPIs, reportes de productos y rendimiento de asesores."
            shortcut="2"
            accentColor="emerald"
          />
        </motion.div>

        <motion.footer className="text-center pt-8" variants={itemVariants}>
          <p className="text-slate-500 text-sm">
            Atajos: <kbd className="bg-slate-700/50 px-2 py-1 rounded-md text-xs mx-1">1</kbd> Logística
            <kbd className="bg-slate-700/50 px-2 py-1 rounded-md text-xs mx-1">2</kbd> Dashboard
          </p>
          <p className="text-slate-600 text-xs mt-4">
            Fenix Store © 2025 - Sistema de Gestión Integral
          </p>
        </motion.footer>
      </motion.div>
    </main>
  );
}

// --- COLECCIÓN COMPLETA DE ICONOS SVG ---
const TruckIcon = (props: IconProps) => <svg {...props} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125V14.25m-17.25 4.5v-1.875a3.375 3.375 0 013.375-3.375h9.75a3.375 3.375 0 013.375 3.375v1.875M16.5 12.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H3.75m12.75 15l-3.75-3.75M16.5 12.75L12.75 9" /></svg>;
const ChartIcon = (props: IconProps) => <svg {...props} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 1.5m-5-11.25h15.25l-1.5 2.25-3-4.5-3 4.5-3-4.5-1.5 2.25v9.75" /></svg>;
const DollarIcon = (props: IconProps) => <svg {...props} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.825-1.106-2.156 0-2.981.54-.403 1.22-.627 1.94-.627.65 0 1.25.204 1.77.552m-3.996 5.641l-.879.659c-1.171.879-3.07.879-4.242 0-1.172-.879-1.172-2.303 0-3.182C4.464 9.219 5.232 9 6 9c.725 0 1.45.22 2.003.659 1.106.825 1.106 2.156 0 2.981l-.879.659m7.992-1.228l.879-.659c1.171-.879 3.07-.879 4.242 0 1.172.879 1.172-2.303 0-3.182C19.536 9.219 18.768 9 18 9c-.725 0-1.45.22-2.003.659-1.106-.825-1.106-2.156 0-2.981l.879-.659" /></svg>;
const TrendingUpIcon = (props: IconProps) => <svg {...props} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-3.75-.625m3.75.625V3.375" /></svg>;
const PackageIcon = (props: IconProps) => <svg {...props} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>;
const WalletIcon = (props: IconProps) => <svg {...props} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" /></svg>;
const ArrowRightIcon = (props: IconProps) => <svg {...props} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>;