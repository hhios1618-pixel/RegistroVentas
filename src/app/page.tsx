'use client';

import Link from 'next/link';
import { useEffect, useState, useMemo, useRef, type SVGProps, type FC, type ReactNode } from 'react';
import useSWR from 'swr';

/* ============================== THEME ============================== */
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
    body { background-color: var(--bg-dark); color: var(--text-primary); }
    @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .fade-in-animation { animation: fade-in 0.5s ease-out forwards; }
    .glass-pane { background-color: rgba(22,27,34,.5); backdrop-filter: blur(12px); border: 1px solid var(--border-color); }
    .chart-bar:hover { fill: var(--accent-cyan); }
  `}</style>
);

/* ============================== TYPES & CAPS ============================== */
type Role = 'admin' | 'promotor' | 'coordinador' | 'lider' | 'asesor' | 'unknown';
type Cap =
  | 'view:kpis'
  | 'view:sales-report'
  | 'view:resumen-asesores'
  | 'view:reporte-asistencia'
  | 'view:logistica'
  | 'view:registro-ventas'
  | 'view:captura-embudo'
  | 'view:devoluciones'
  | 'view:asistencia'
  | 'view:playbook'
  | 'view:users-admin';

type NavLinkItem = { cap: Cap; href: string; icon: ReactNode; label: string; shortcut?: string };

const ROLE_CAPS: Record<Role, Cap[]> = {
  admin: [
    'view:kpis','view:sales-report','view:resumen-asesores','view:reporte-asistencia',
    'view:logistica','view:registro-ventas','view:captura-embudo','view:devoluciones','view:asistencia',
    'view:playbook','view:users-admin'
  ],
  coordinador: [
    'view:kpis','view:logistica','view:asistencia','view:captura-embudo','view:reporte-asistencia','view:playbook'
  ],
  lider: [
    'view:kpis','view:resumen-asesores','view:reporte-asistencia','view:logistica','view:asistencia','view:captura-embudo','view:sales-report','view:playbook'
  ],
  asesor: [
    'view:sales-report','view:registro-ventas','view:captura-embudo','view:asistencia','view:playbook'
  ],
  promotor: [
    'view:registro-ventas','view:captura-embudo','view:playbook'
  ],
  unknown: [],
};

const can = (role: Role, cap: Cap) => (ROLE_CAPS[role] ?? []).includes(cap);
const fetcher = (url: string) => fetch(url).then((r) => r.ok ? r.json() : Promise.reject(new Error('fetch error')));
const normalizeRole = (raw?: string): Role => {
  const r = (raw || '').trim().toUpperCase();
  if (['GERENCIA','ADMIN','ADMINISTRADOR'].includes(r)) return 'admin';
  if (['PROMOTOR','PROMOTORA'].includes(r)) return 'promotor';
  if (['COORDINADOR','COORDINADORA','COORDINACION'].includes(r)) return 'coordinador';
  if (['LIDER','JEFE','SUPERVISOR'].includes(r)) return 'lider';
  if (['ASESOR','VENDEDOR','VENDEDORA'].includes(r)) return 'asesor';
  return 'unknown';
};

/* ============================== UI BITS ============================== */
const NavLink: FC<{ link: NavLinkItem; isActive?: boolean }> = ({ link, isActive = false }) => (
  <Link
    href={link.href}
    className={`flex items-center px-4 py-2.5 text-sm font-medium rounded-md transition-colors group relative
      ${isActive ? 'bg-[var(--bg-medium)] text-white' : 'text-[var(--text-primary)] hover:bg-[var(--bg-medium)]'}`}
  >
    {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 bg-cyan-400 rounded-r-full" />}
    <span className={`transition-colors ${isActive ? 'text-cyan-400' : 'text-[var(--text-secondary)] group-hover:text-cyan-400'}`}>
      {link.icon}
    </span>
    <span className="ml-4 flex-1">{link.label}</span>
    {link.shortcut && (
      <span className="text-xs font-mono text-gray-500 border border-gray-700 rounded px-1.5 py-0.5">
        {link.shortcut}
      </span>
    )}
  </Link>
);

const Sidebar: FC<{ userRole: Role; userName: string }> = ({ userRole, userName }) => {
  const sections: { title: string; links: NavLinkItem[] }[] = [
    {
      title: 'ANÁLISIS Y REPORTES',
      links: [
        { cap: 'view:sales-report',      href: '/dashboard/sales-report',       icon: <IconSalesReport className="w-5 h-5" />, label: 'Reporte de Ventas',      shortcut: '2' },
        { cap: 'view:resumen-asesores',  href: '/dashboard/asesores/HOME',      icon: <IconResumen className="w-5 h-5" />,     label: 'Resumen Asesores',       shortcut: '7' },
        { cap: 'view:reporte-asistencia',href: '/dashboard/admin/resumen',      icon: <IconAsistencia className="w-5 h-5" />,  label: 'Reporte de Asistencia',  shortcut: 'R' },
      ],
    },
    {
      title: 'OPERACIONES Y CAPTURA',
      links: [
        { cap: 'view:logistica',        href: '/logistica',                          icon: <IconTruck className="w-5 h-5" />,    label: 'Logística',          shortcut: '1' },
        { cap: 'view:registro-ventas',  href: '/dashboard/asesores/registro',        icon: <IconRegistro className="w-5 h-5" />,  label: 'Registro Ventas',    shortcut: '6' },
        { cap: 'view:captura-embudo',   href: '/dashboard/captura',                  icon: <IconEmbudo className="w-5 h-5" />,   label: 'Captura / Embudo',   shortcut: 'C' },
        { cap: 'view:devoluciones',     href: '/dashboard/asesores/devoluciones',    icon: <IconReturn className="w-5 h-5" />,   label: 'Devoluciones',       shortcut: '4' },
        { cap: 'view:asistencia',       href: '/asistencia',                         icon: <IconAsistencia className="w-5 h-5" />,label: 'Asistencia',         shortcut: 'A' },
      ],
    },
    {
      title: 'ADMINISTRACIÓN',
      links: [
        { cap: 'view:playbook',     href: '/dashboard/asesores/playbook-whatsapp', icon: <IconPlaybook className="w-5 h-5" />, label: 'Playbook',         shortcut: '5' },
        { cap: 'view:users-admin',  href: '/dashboard/admin/usuarios',             icon: <IconUsersAdmin className="w-5 h-5" />,label: 'Admin Usuarios',  shortcut: '8' },
      ],
    },
  ];

  return (
    <aside className="w-64 fixed top-16 left-0 h-[calc(100vh-4rem)] bg-[var(--bg-dark)] flex flex-col border-r border-[var(--border-color)] z-30">
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <NavLink
          key="nav-/home"
          link={{ cap: 'view:kpis', href: '/', icon: <IconDashboard className="w-5 h-5" />, label: 'Dashboard', shortcut: 'H' }}
          isActive
        />
        {sections.map((section) => {
          const accessibleLinks = section.links.filter((l) => can(userRole, l.cap));
          if (accessibleLinks.length === 0) return null;
          return (
            <div key={`sec-${section.title}`} className="pt-4">
              <h3 className="px-4 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                {section.title}
              </h3>
              {accessibleLinks.map((l) => (
                <NavLink key={`nav-${l.href}`} link={l} />
              ))}
            </div>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[var(--border-color)]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[var(--bg-medium)] flex items-center justify-center font-bold text-cyan-400">
            {userName?.charAt(0) || 'U'}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{userName || 'Usuario'}</p>
            <p className="text-xs text-[var(--text-secondary)] capitalize">{userRole}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

const HeaderBar: FC<{ greeting: string; userName: string }> = ({ greeting, userName }) => {
  const [time, setTime] = useState(new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }));
  useEffect(() => {
    const id = setInterval(() => setTime(new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })), 60000);
    return () => clearInterval(id);
  }, []);
  return (
    <header className="flex items-center justify-between">
      <div>
        <h2 className="text-xl font-semibold text-white">{greeting}, {userName}</h2>
        <p className="text-sm text-[var(--text-secondary)]">Bienvenido al panel de control.</p>
      </div>
      <div className="flex items-center gap-6">
        <div className="text-right">
          <div className="font-mono text-lg text-white">{time}</div>
          <div className="text-xs text-[var(--text-secondary)] capitalize">
            {new Date().toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-green-400 bg-green-500/10 px-3 py-1.5 rounded-full">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          Sistema Activo
        </div>
      </div>
    </header>
  );
};

/* ============================== WIDGETS ============================== */
const AnimatedValue: FC<{ value: number; isCurrency?: boolean }> = ({ value, isCurrency = false }) => {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const initial = parseFloat(el.textContent?.replace(/[^\d,-]/g, '').replace(',', '.') || '0');
    let start: number; const dur = 1000;
    const frame = (t: number) => {
      if (!start) start = t;
      const prog = Math.min((t - start) / dur, 1);
      const eased = 1 - Math.pow(1 - prog, 4);
      const cur = initial + (value - initial) * eased;
      el.textContent = cur.toLocaleString('es-BO', {
        minimumFractionDigits: isCurrency ? 2 : 0,
        maximumFractionDigits: isCurrency ? 2 : 0
      });
      if (prog < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }, [value, isCurrency]);
  return <span ref={ref}>0</span>;
};

const KpiCard: FC<{ icon: ReactNode; title: string; value: number; trend: string; isCurrency?: boolean; delay?: number }> =
({ icon, title, value, trend, isCurrency = false, delay = 0 }) => (
  <div className="p-5 glass-pane rounded-lg fade-in-animation flex items-center" style={{ animationDelay: `${delay}ms` }}>
    <div className="w-10 h-10 flex items-center justify-center bg-[var(--bg-medium)] rounded-lg mr-4 text-cyan-400">{icon}</div>
    <div className="flex-1">
      <h3 className="text-sm text-[var(--text-secondary)] font-medium">{title}</h3>
      <div className="flex items-baseline gap-2">
        <p className="text-2xl font-semibold text-white">
          {isCurrency && <span className="text-lg text-[var(--text-secondary)] mr-1">Bs</span>}
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
        <svg width="100%" height="100%" viewBox="0 0 500 250" className="text-[var(--text-secondary)]">
          {[0.25, 0.5, 0.75, 1].map(v => (
            <line key={v} x1="30" y1={220 - (200 * v)} x2="490" y2={220 - (200 * v)} stroke="var(--border-color)" strokeWidth="1" strokeDasharray="2,2" />
          ))}
          <line x1="30" y1="220" x2="490" y2="220" stroke="var(--border-color)" strokeWidth="1" />
          {data.map((d, i) => {
            const h = (d.sales / maxSales) * 200;
            return (
              <g key={d.day}>
                <title>{`${d.day}: Bs ${d.sales.toLocaleString('es-BO')}`}</title>
                <rect x={40 + i * 65} y={220 - h} width="40" height={h} rx="2" className="chart-bar transition-all" fill="var(--accent-cyan-dark)" />
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
    { icon: <IconWallet className="w-5 h-5" />, text: 'Venta #8231 confirmada por Bs 1,250', time: 'hace 5 min' },
    { icon: <IconTruck className="w-5 h-5" />,  text: 'Despacho #412 ha sido asignado.',     time: 'hace 2 horas' },
    { icon: <IconReturn className="w-5 h-5" />, text: 'Solicitud de devolución iniciada.',    time: 'hace 3 horas' },
    { icon: <IconUsersAdmin className="w-5 h-5" />, text: 'Juan Pérez ha actualizado su perfil.', time: 'hace 1 día' },
  ];
  return (
    <div>
      <h3 className="text-lg font-semibold text-white mb-4">Notificaciones</h3>
      <ul className="space-y-4">
        {notifications.map((n, i) => (
          <li key={`notif-${i}`} className="flex items-start gap-3">
            <div className={`p-2 rounded-full bg-[var(--bg-medium)] ${i === 0 ? 'text-cyan-400' : 'text-[var(--text-secondary)]'}`}>{n.icon}</div>
            <div>
              <p className="text-sm text-[var(--text-primary)]">{n.text}</p>
              <p className="text-xs text-[var(--text-secondary)]">{n.time}</p>
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
    { name: 'Carlos Guzman',   sales: 12800.00, color: 'bg-cyan-600' },
    { name: 'Ana Mendoza',     sales: 11500.75, color: 'bg-cyan-800' },
  ];
  return (
    <div className="lg:col-span-1 glass-pane rounded-lg p-6 fade-in-animation" style={{ animationDelay: '700ms' }}>
      <h3 className="text-lg font-semibold text-white mb-4">Vendedores con Mejor Rendimiento</h3>
      <ul className="space-y-4">
        {performers.map((p) => (
          <li key={`top-${p.name}`}>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-[var(--text-primary)]">{p.name}</span>
              <span className="text-[var(--text-secondary)]">Bs {p.sales.toLocaleString('es-BO')}</span>
            </div>
            <div className="w-full bg-[var(--bg-medium)] rounded-full h-1.5">
              <div className={`${p.color} h-1.5 rounded-full`} style={{ width: `${(p.sales / performers[0].sales) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

/* ============================== PAGE ============================== */
export default function HomePage() {
  const { data: me, isLoading: meLoading } = useSWR('/endpoints/me', fetcher);
  const role: Role = useMemo(() => normalizeRole(me?.role), [me?.role]);

  const { data: salesReport } = useSWR('/endpoints/sales-report', fetcher, { refreshInterval: 60000 });

  const kpi = useMemo(() => {
    if (!salesReport) return { sales: 0, orders: 0, revenue: 0, returns: 0 };
    const today = new Date().toISOString().slice(0, 10);
    const todaySales = salesReport.filter((s: any) => (s.order_date || '').startsWith(today));
    return {
      sales: todaySales.length,
      orders: new Set(todaySales.map((s: any) => s.order_id)).size,
      revenue: todaySales.reduce((acc: number, s: any) => acc + (s.total || 0), 0),
      returns: 0,
    };
  }, [salesReport]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['INPUT','TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      const map: Record<string, string> = {
        'H': '/', '1': '/logistica', '2': '/dashboard/sales-report',
        '6': '/dashboard/asesores/registro', '7': '/dashboard/asesores/HOME',
        '4': '/dashboard/asesores/devoluciones', '5': '/dashboard/asesores/playbook-whatsapp',
        '8': '/dashboard/admin/usuarios', 'R': '/dashboard/admin/resumen',
        'C': '/dashboard/captura', 'A': '/asistencia',
      };
      const to = map[e.key];
      if (to) { e.preventDefault(); window.location.href = to; }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const userName = meLoading ? '...' : (me?.full_name || 'Usuario');
  const firstName = userName.split(' ')[0];
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  }, []);

  return (
    <>
      <DynamicGlobalStyles />
      <div className="flex min-h-screen bg-[var(--bg-dark)] font-sans">
        <Sidebar userRole={role} userName={userName} />
        <main className="flex-1 ml-64 pt-16">
          <div className="p-8 max-w-7xl mx-auto space-y-8">
            <HeaderBar greeting={greeting} userName={firstName} />
            {can(role, 'view:kpis') && (
              <section>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <KpiCard icon={<IconChart className="w-6 h-6" />}    title="Ventas del Día"       value={kpi.sales}   trend="+5%"      delay={100} />
                  <KpiCard icon={<IconPackage className="w-6 h-6" />}  title="Pedidos Facturados"  value={kpi.orders}  trend="+2%"      delay={200} />
                  <KpiCard icon={<IconWallet className="w-6 h-6" />}   title="Ingresos (Hoy)"       value={kpi.revenue} trend="+12.5%"   isCurrency delay={300} />
                  <KpiCard icon={<IconReturn className="w-6 h-6" />}   title="Devoluciones"         value={kpi.returns} trend="-1%"      delay={400} />
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

/* ============================== ICONS ============================== */
const IconDashboard: FC<SVGProps<SVGSVGElement>> = (p) => (
  <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);
const IconChart: FC<SVGProps<SVGSVGElement>> = (p) => (
  <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3" />
  </svg>
);
const IconPackage: FC<SVGProps<SVGSVGElement>> = (p) => (
  <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);
const IconWallet: FC<SVGProps<SVGSVGElement>> = (p) => (
  <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 12V8H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4Z"/>
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M18 12a2 2 0 0 0-2 2h-4a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4h-4a2 2 0 0 1-2-2"/>
  </svg>
);
const IconTruck: FC<SVGProps<SVGSVGElement>> = (p) => (
  <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
    <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
  </svg>
);
const IconSalesReport: FC<SVGProps<SVGSVGElement>> = (p) => (
  <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-3"/>
    <rect x="8" y="1" width="8" height="4" rx="1" ry="1"/><line x1="12" y1="16" x2="12" y2="12"/>
    <line x1="16" y1="16" x2="16" y2="9"/><line x1="8" y1="16" x2="8" y2="14"/>
  </svg>
);
const IconVendedores: FC<SVGProps<SVGSVGElement>> = (p) => (
  <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/>
    <path d="M20 8v6m-3-3h6"/>
  </svg>
);
const IconReturn: FC<SVGProps<SVGSVGElement>> = (p) => (
  <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/>
  </svg>
);
const IconRegistro: FC<SVGProps<SVGSVGElement>> = (p) => (
  <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
  </svg>
);
const IconResumen: FC<SVGProps<SVGSVGElement>> = (p) => (
  <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
  </svg>
);
const IconAsistencia: FC<SVGProps<SVGSVGElement>> = (p) => (
  <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="m9 16 2 2 4-4"/>
  </svg>
);
const IconEmbudo: FC<SVGProps<SVGSVGElement>> = (p) => (
  <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 2h18v4l-8 8v6l-4 2v-8L3 6V2z"/>
  </svg>
);
const IconPlaybook: FC<SVGProps<SVGSVGElement>> = (p) => (
  <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v15H6.5A2.5 2.5 0 0 1 4 14.5v-10A2.5 2.5 0 0 1 6.5 2z"/>
  </svg>
);
const IconUsersAdmin: FC<SVGProps<SVGSVGElement>> = (p) => (
  <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/>
    <circle cx="18" cy="18" r="3"/><line x1="20.5" y1="15.5" x2="23" y2="13"/>
  </svg>
);