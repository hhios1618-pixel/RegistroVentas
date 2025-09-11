'use client';
import Link from 'next/link';
import { useEffect, useState, useMemo, useRef, SVGProps, FC, ReactNode } from 'react';
import useSWR from 'swr';

/* ========================================================================
   STYLES & ANIMATIONS (Corporate Dashboard Theme v2)
   ======================================================================== */
const DynamicGlobalStyles = () => (
  <style jsx global>{`
    :root {
      --bg-dark: #0D1117;
      --bg-medium: #161B22;
      --border-color: #30363D;
      --text-primary: #C9D1D9;
      --text-secondary: #8B949E;
      --accent-cyan: #22d3ee;
      --accent-cyan-dark: #0e7490;
    }
    body {
      background-color: var(--bg-dark);
      color: var(--text-primary);
    }
    @keyframes fade-in {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .fade-in-animation { animation: fade-in 0.5s ease-out forwards; }
    .glass-pane {
      background-color: rgba(22, 27, 34, 0.5);
      backdrop-filter: blur(12px);
      border: 1px solid var(--border-color);
    }
    .chart-bar:hover { fill: var(--accent-cyan); }
  `}</style>
);

/* ========================================================================
   TYPES, CAPABILITIES & UTILITIES
   ======================================================================== */
type Role = 'admin' | 'promotor' | 'coordinador' | 'lider' | 'asesor' | 'unknown';
type Cap =
  | 'view:logistica' | 'view:sales-report' | 'view:vendedores' | 'view:returns' | 'view:playbook'
  | 'view:promotores:registro' | 'view:promotores:resumen' | 'view:kpis' | 'view:users-admin'
  | 'view:asistencia' | 'view:captura-embudo';

type NavLinkItem = { cap: Cap; href: string; icon: ReactNode; label: string; shortcut: string; };

const ROLE_CAPS: Record<Role, Cap[]> = {
  admin: ['view:kpis','view:logistica','view:sales-report','view:vendedores','view:returns','view:promotores:registro','view:promotores:resumen','view:asistencia','view:captura-embudo','view:users-admin','view:playbook'],
  promotor: ['view:promotores:registro'],
  coordinador: ['view:kpis','view:logistica','view:asistencia','view:captura-embudo','view:playbook'],
  lider: ['view:kpis','view:vendedores','view:promotores:resumen','view:asistencia','view:captura-embudo','view:playbook'],
  asesor: ['view:sales-report','view:captura-embudo','view:playbook'],
  unknown: [],
};

const can = (role: Role, cap: Cap) => (ROLE_CAPS[role] ?? []).includes(cap);
const fetcher = (url: string) => fetch(url).then((res) => res.ok ? res.json() : Promise.reject(new Error('Error al cargar datos.')));
const normalizeRole = (rawRole?: string): Role => {
  const r = (rawRole || '').trim().toUpperCase();
  if (['GERENCIA','ADMIN','ADMINISTRADOR'].includes(r)) return 'admin';
  if (['PROMOTOR','PROMOTORA'].includes(r)) return 'promotor';
  if (['COORDINADOR','COORDINADORA','COORDINACION'].includes(r)) return 'coordinador';
  if (['LIDER','JEFE','SUPERVISOR'].includes(r)) return 'lider';
  if (['ASESOR','VENDEDOR','VENDEDORA'].includes(r)) return 'asesor';
  return 'unknown';
};

/* ========================================================================
   UI: CORE LAYOUT COMPONENTS
   ======================================================================== */
const NavLink: FC<{ link: NavLinkItem; isActive?: boolean }> = ({ link, isActive = false }) => (
  <Link href={link.href} className={`flex items-center px-4 py-2.5 text-sm font-medium rounded-md transition-colors group relative ${isActive ? 'bg-bg-medium text-white' : 'text-text-primary hover:bg-bg-medium'}`}>
    {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 bg-cyan-400 rounded-r-full"></div>}
    <span className={`transition-colors ${isActive ? 'text-cyan-400' : 'text-text-secondary group-hover:text-cyan-400'}`}>{link.icon}</span>
    <span className="ml-4 flex-1">{link.label}</span>
    <span className="text-xs font-mono text-gray-500 border border-gray-700 rounded px-1.5 py-0.5">{link.shortcut}</span>
  </Link>
);

const Sidebar: FC<{ userRole: Role; userName: string }> = ({ userRole, userName }) => {
  const navSections = [
    {
      title: 'Análisis y Reportes',
      links: [
        { cap: 'view:sales-report', href: '/dashboard/sales-report', icon: <IconSalesReport className="w-5 h-5" />, label: 'Reporte de Ventas', shortcut: '2' },
        { cap: 'view:vendedores', href: '/dashboard/vendedores', icon: <IconVendedores className="w-5 h-5" />, label: 'Vendedores', shortcut: '3' },
        { cap: 'view:promotores:resumen', href: '/promotores/resumen', icon: <IconResumen className="w-5 h-5" />, label: 'Resumen Promotores', shortcut: '7' },
      ]
    },
    {
      title: 'Operaciones y Captura',
      links: [
        { cap: 'view:logistica', href: '/logistica', icon: <IconTruck className="w-5 h-5" />, label: 'Logística', shortcut: '1' },
        { cap: 'view:returns', href: '/dashboard/devoluciones', icon: <IconReturn className="w-5 h-5" />, label: 'Devoluciones', shortcut: '4' },
        { cap: 'view:promotores:registro', href: '/promotores/registro', icon: <IconRegistro className="w-5 h-5" />, label: 'Registro Ventas', shortcut: '6' },
        { cap: 'view:captura-embudo', href: '/dashboard/captura', icon: <IconEmbudo className="w-5 h-5" />, label: 'Captura / Embudo', shortcut: 'C' },
        { cap: 'view:asistencia', href: '/asistencia', icon: <IconAsistencia className="w-5 h-5" />, label: 'Asistencia', shortcut: 'A' },
      ]
    },
    {
      title: 'Administración',
      links: [
        { cap: 'view:playbook', href: '/playbook-whatsapp', icon: <IconPlaybook className="w-5 h-5" />, label: 'Playbook', shortcut: '5' },

        // NUEVO: resumen de asistencia (admin)
        { cap: 'view:asistencia', href: '/admin/asistencia/resumen', icon: <IconAsistencia className="w-5 h-5" />, label: 'Resumen Asistencia', shortcut: 'R' },

        { cap: 'view:users-admin', href: '/dashboard/usuarios', icon: <IconUsersAdmin className="w-5 h-5" />, label: 'Admin Usuarios', shortcut: '8' },
      ]
    }
  ];

  return (
    <aside className="w-64 fixed top-16 left-0 h-[calc(100vh-4rem)] bg-dark flex flex-col border-r border-border-color z-30">
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <NavLink link={{ cap: 'view:kpis', href: '/', icon: <IconDashboard className="w-5 h-5" />, label: 'Dashboard', shortcut: 'H' }} isActive />
        {navSections.map(section => {
          const accessibleLinks = section.links.filter(link => can(userRole, link.cap as Cap));
          if (accessibleLinks.length === 0) return null;
          return (
            <div key={section.title} className="pt-4">
              <h3 className="px-4 text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">{section.title}</h3>
              {accessibleLinks.map(link => <NavLink key={link.href} link={link as NavLinkItem} />)}
            </div>
          );
        })}
      </nav>
      <div className="p-4 border-t border-border-color">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-bg-medium flex items-center justify-center font-bold text-cyan-400">{userName.charAt(0)}</div>
          <div>
            <p className="text-sm font-semibold text-white">{userName}</p>
            <p className="text-xs text-text-secondary capitalize">{userRole}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

const HeaderBar: FC<{ greeting: string; userName: string; }> = ({ greeting, userName }) => {
  const [time, setTime] = useState(new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }));
  useEffect(() => {
    const timerId = setInterval(() => setTime(new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })), 60000);
    return () => clearInterval(timerId);
  }, []);
  return (
    <header className="flex items-center justify-between">
      <div>
        <h2 className="text-xl font-semibold text-white">{greeting}, {userName}</h2>
        <p className="text-sm text-text-secondary">Bienvenido al panel de control.</p>
      </div>
      <div className="flex items-center gap-6">
        <div className="text-right">
          <div className="font-mono text-lg text-white">{time}</div>
          <div className="text-xs text-text-secondary capitalize">{new Date().toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-green-400 bg-green-500/10 px-3 py-1.5 rounded-full">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          Sistema Activo
        </div>
      </div>
    </header>
  );
};

/* ========================================================================
   UI: DASHBOARD WIDGETS
   ======================================================================== */
const AnimatedValue: FC<{ value: number; isCurrency?: boolean }> = ({ value, isCurrency = false }) => {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const initialValue = parseFloat(el.textContent?.replace(/[^\d,-]/g, '').replace(',', '.') || '0');
    let startTime: number; const duration = 1000;
    const frame = (t: number) => {
      if (!startTime) startTime = t;
      const progress = Math.min((t - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      const current = initialValue + (value - initialValue) * eased;
      el.textContent = current.toLocaleString('es-BO', { minimumFractionDigits: isCurrency ? 2 : 0, maximumFractionDigits: isCurrency ? 2 : 0 });
      if (progress < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }, [value, isCurrency]);
  return <span ref={ref}>0</span>;
};

const KpiCard: FC<{ icon: ReactNode; title: string; value: number; trend: string; isCurrency?: boolean; delay?: number; }> =
  ({ icon, title, value, trend, isCurrency = false, delay = 0 }) => (
  <div className="p-5 glass-pane rounded-lg fade-in-animation flex items-center" style={{ animationDelay: `${delay}ms` }}>
    <div className="w-10 h-10 flex items-center justify-center bg-bg-medium rounded-lg mr-4 text-cyan-400">{icon}</div>
    <div className="flex-1">
      <h3 className="text-sm text-text-secondary font-medium">{title}</h3>
      <div className="flex items-baseline gap-2">
        <p className="text-2xl font-semibold text-white">
          {isCurrency && <span className="text-lg text-text-secondary mr-1">Bs</span>}
          <AnimatedValue value={value} isCurrency={isCurrency} />
        </p>
        <span className={`text-xs font-semibold ${trend.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>{trend}</span>
      </div>
    </div>
  </div>
);

const SalesChart = () => {
  const data = [
    { day: 'Lun', sales: 4000 }, { day: 'Mar', sales: 3000 }, { day: 'Mié', sales: 5000 },
    { day: 'Jue', sales: 4500 }, { day: 'Vie', sales: 6000 }, { day: 'Sáb', sales: 8000 }, { day: 'Dom', sales: 7500 },
  ];
  const maxSales = Math.max(...data.map(d => d.sales));
  return (
    <div className="h-full flex flex-col">
      <h3 className="text-lg font-semibold text-white mb-4">Resumen de Actividad Reciente</h3>
      <div className="flex-grow">
        <svg width="100%" height="100%" viewBox="0 0 500 250" className="text-text-secondary">
          {[0.25, 0.5, 0.75, 1].map(v => <line key={v} x1="30" y1={220 - (200 * v)} x2="490" y2={220 - (200 * v)} stroke="var(--border-color)" strokeWidth="1" strokeDasharray="2,2" />)}
          <line x1="30" y1="220" x2="490" y2="220" stroke="var(--border-color)" strokeWidth="1" />
          {data.map((d, i) => {
            const h = (d.sales / maxSales) * 200;
            return (
              <g key={d.day}>
                <title>{`${d.day}: Bs ${d.sales.toLocaleString('es-BO')}`}</title>
                <rect x={40 + i * 65} y={220 - h} width="40" height={h} fill="var(--accent-cyan-dark)" rx="2" className="chart-bar transition-all" />
                <text x={60 + i * 65} y="235" textAnchor="middle" fontSize="12" fill="currentColor">{d.day}</text>
              </g>
            );
          })}
          <text x="25" y="225" textAnchor="end" fontSize="12" fill="currentColor">0</text>
          <text x="25" y="25" textAnchor="end" fontSize="12" fill="currentColor">{maxSales/1000}k</text>
        </svg>
      </div>
    </div>
  );
};

const NotificationsFeed = () => {
  const notifications = [
    { icon: <IconWallet className="w-5 h-5"/>, text: 'Venta #8231 confirmada por Bs 1,250', time: 'hace 5 min' },
    { icon: <IconTruck className="w-5 h-5"/>, text: 'Despacho #412 ha sido asignado.', time: 'hace 2 horas' },
    { icon: <IconReturn className="w-5 h-5"/>, text: 'Solicitud de devolución iniciada.', time: 'hace 3 horas' },
    { icon: <IconUsersAdmin className="w-5 h-5"/>, text: 'Juan Pérez ha actualizado su perfil.', time: 'hace 1 día' },
  ];
  return (
    <div>
      <h3 className="text-lg font-semibold text-white mb-4">Notificaciones</h3>
      <ul className="space-y-4">
        {notifications.map((n, i) => (
          <li key={i} className="flex items-start gap-3">
            <div className={`p-2 rounded-full bg-bg-medium ${ i === 0 ? 'text-cyan-400' : 'text-text-secondary'}`}>{n.icon}</div>
            <div>
              <p className="text-sm text-text-primary">{n.text}</p>
              <p className="text-xs text-text-secondary">{n.time}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

const TopPerformers = () => {
  const performers = [
    { name: 'Maria Rodriguez', sales: 15200.50, color: 'bg-cyan-400' },
    { name: 'Carlos Guzman', sales: 12800.00, color: 'bg-cyan-600' },
    { name: 'Ana Mendoza', sales: 11500.75, color: 'bg-cyan-800' },
  ];
  return (
    <div className="lg:col-span-1 glass-pane rounded-lg p-6 fade-in-animation" style={{ animationDelay: '700ms' }}>
      <h3 className="text-lg font-semibold text-white mb-4">Vendedores con Mejor Rendimiento</h3>
      <ul className="space-y-4">
        {performers.map(p => (
          <li key={p.name}>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-text-primary">{p.name}</span>
              <span className="text-text-secondary">Bs {p.sales.toLocaleString('es-BO')}</span>
            </div>
            <div className="w-full bg-bg-medium rounded-full h-1.5">
              <div className={`${p.color} h-1.5 rounded-full`} style={{ width: `${(p.sales / performers[0].sales) * 100}%`}}></div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

/* ========================================================================
   MAIN PAGE COMPONENT
   ======================================================================== */
export default function HomePage() {
  const { data: me, isLoading: meLoading } = useSWR('/endpoints/me', fetcher);
  const userRole = useMemo(() => normalizeRole(me?.role), [me]);
  const { data: salesReport } = useSWR('/endpoints/sales-report', fetcher, { refreshInterval: 60000 });

  const kpiData = useMemo(() => {
    if (!salesReport) return { sales: 0, orders: 0, revenue: 0, returns: 0 };
    const todaySales = salesReport.filter((s: any) => s.order_date.startsWith(new Date().toISOString().slice(0, 10)));
    return {
      sales: todaySales.length,
      orders: new Set(todaySales.map((s: any) => s.order_id)).size,
      revenue: todaySales.reduce((acc: number, s: any) => acc + (s.total || 0), 0),
      returns: 0
    };
  }, [salesReport]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT','TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      const keyMap: Record<string, string> = {
        'H': '/', '1': '/logistica', '2': '/dashboard/sales-report', '3': '/dashboard/vendedores',
        '4': '/dashboard/devoluciones', '5': '/playbook-whatsapp', '6': '/promotores/registro',
        '7': '/promotores/resumen', '8': '/dashboard/usuarios',
        // NUEVO atajo
        'R': '/admin/asistencia/resumen',
      };
      if (keyMap[e.key]) { e.preventDefault(); window.location.href = keyMap[e.key]; }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const userName = meLoading ? '...' : me?.full_name || 'Usuario';
  const userFirstName = userName.split(' ')[0];
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    return hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
  }, []);

  return (
    <>
      <DynamicGlobalStyles />
      <div className="flex min-h-screen bg-bg-dark font-sans">
        <Sidebar userRole={userRole} userName={userName} />
        <main className="flex-1 ml-64 pt-16">
          <div className="p-8 max-w-7xl mx-auto space-y-8">
            <HeaderBar greeting={greeting} userName={userFirstName} />
            {can(userRole, 'view:kpis') && (
              <section>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <KpiCard icon={<IconChart className="w-6 h-6"/>} title="Ventas del Día" value={kpiData.sales} trend="+5%" delay={100} />
                  <KpiCard icon={<IconPackage className="w-6 h-6"/>} title="Pedidos Facturados" value={kpiData.orders} trend="+2%" delay={200} />
                  <KpiCard icon={<IconWallet className="w-6 h-6"/>} title="Ingresos (Hoy)" value={kpiData.revenue} trend="+12.5%" isCurrency delay={300} />
                  <KpiCard icon={<IconReturn className="w-6 h-6"/>} title="Devoluciones" value={kpiData.returns} trend="-1%" delay={400} />
                </div>
              </section>
            )}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 glass-pane rounded-lg p-6 min-h-[350px] fade-in-animation" style={{ animationDelay: '500ms' }}>
                <SalesChart />
              </div>
              <div className="lg:col-span-1 glass-pane rounded-lg p-6 fade-in-animation" style={{ animationDelay: '600ms' }}>
                <NotificationsFeed />
              </div>
              <TopPerformers />
            </section>
          </div>
        </main>
      </div>
    </>
  );
}

/* ========================================================================
   PROFESSIONAL ICON SET
   ======================================================================== */
const IconDashboard: FC<SVGProps<SVGSVGElement>> = (props) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>);
const IconChart: FC<SVGProps<SVGSVGElement>> = (props) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>);
const IconPackage: FC<SVGProps<SVGSVGElement>> = (props) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>);
const IconWallet: FC<SVGProps<SVGSVGElement>> = (props) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V8H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4Z"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M18 12a2 2 0 0 0-2 2h-4a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4h-4a2 2 0 0 1-2-2"/></svg>);
const IconTruck: FC<SVGProps<SVGSVGElement>> = (props) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>);
const IconSalesReport: FC<SVGProps<SVGSVGElement>> = (props) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-3"/><rect x="8" y="1" width="8" height="4" rx="1" ry="1"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="16" y1="16" x2="16" y2="9"/><line x1="8" y1="16" x2="8" y2="14"/></svg>);
const IconVendedores: FC<SVGProps<SVGSVGElement>> = (props) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6m-3-3h6"/></svg>);
const IconReturn: FC<SVGProps<SVGSVGElement>> = (props) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>);
const IconRegistro: FC<SVGProps<SVGSVGElement>> = (props) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>);
const IconResumen: FC<SVGProps<SVGSVGElement>> = (props) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>);
const IconAsistencia: FC<SVGProps<SVGSVGElement>> = (props) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="m9 16 2 2 4-4"/></svg>);
const IconEmbudo: FC<SVGProps<SVGSVGElement>> = (props) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2h18v4l-8 8v6l-4 2v-8L3 6V2z"/></svg>);
const IconPlaybook: FC<SVGProps<SVGSVGElement>> = (props) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v15H6.5A2.5 2.5 0 0 1 4 14.5v-10A2.5 2.5 0 0 1 6.5 2z"/></svg>);
const IconUsersAdmin: FC<SVGProps<SVGSVGElement>> = (props) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><circle cx="18" cy="18" r="3"/><line x1="20.5" y1="15.5" x2="23" y2="13"/></svg>);

//Hola vercel qlo// 