// src/app/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState, type FC, type SVGProps, type ReactNode } from 'react';
import useSWR from 'swr';

/* ============================== THEME ============================== */
const DynamicGlobalStyles = () => (
  <style jsx global>{`
    :root {
      --bg-dark: #0D1117;
      --bg-medium: #10151d;
      --bg-elev: #0f1420;
      --border-color: #263041;
      --text-primary: #C9D1D9;
      --text-secondary: #8B949E;
      --accent-cyan: #22d3ee;
      --accent-cyan-dark: #0ea5b7;
      --glow: 0 10px 30px rgba(34,211,238,.15);
    }
    body { background-color: var(--bg-dark); color: var(--text-primary); }
    @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .fade-in-animation { animation: fade-in 0.5s ease-out forwards; }
    .glass-pane { background: linear-gradient(180deg, rgba(18,24,33,.7), rgba(16,21,29,.6)); backdrop-filter: blur(10px); border: 1px solid var(--border-color); }
  `}</style>
);

/* ============================== TYPES & CAPS ============================== */
type Role = 'admin' | 'promotor' | 'coordinador' | 'lider' | 'asesor' | 'unknown';
type Cap =
  | 'view:kpis' | 'view:sales-report' | 'view:resumen-asesores' | 'view:reporte-asistencia'
  | 'view:logistica' | 'view:registro-ventas' | 'view:captura-embudo'
  | 'view:devoluciones' | 'view:asistencia' | 'view:playbook' | 'view:users-admin';

const ROLE_CAPS: Record<Role, Cap[]> = {
  admin: ['view:kpis','view:sales-report','view:resumen-asesores','view:reporte-asistencia','view:logistica','view:registro-ventas','view:captura-embudo','view:devoluciones','view:asistencia','view:playbook','view:users-admin'],
  coordinador: ['view:kpis','view:logistica','view:asistencia','view:captura-embudo','view:reporte-asistencia','view:playbook'],
  lider: ['view:kpis','view:resumen-asesores','view:reporte-asistencia','view:logistica','view:asistencia','view:captura-embudo','view:sales-report','view:playbook'],
  asesor: ['view:sales-report','view:registro-ventas','view:captura-embudo','view:asistencia','view:playbook'],
  promotor: ['view:registro-ventas','view:captura-embudo','view:playbook'],
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

/* ============================== HEADER ============================== */
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
    let start: number; const dur = 900;
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
    <div className="w-10 h-10 flex items-center justify-center bg-[#0e1521] rounded-lg mr-4 text-cyan-400 ring-1 ring-[var(--border-color)]">{icon}</div>
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
                <rect x={40 + i * 65} y={220 - h} width="40" height={h} rx="2" className="transition-all" fill="var(--accent-cyan-dark)" />
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
            <div className={`p-2 rounded-full bg-[#0e1521] ring-1 ring-[var(--border-color)] ${i === 0 ? 'text-cyan-400' : 'text-[var(--text-secondary)]'}`}>{n.icon}</div>
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
            <div className="w-full bg-[#0e1521] rounded-full h-1.5">
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

  // Atajos (opcional; no depende del sidebar)
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
      <main className="min-h-screen">
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
    </>
  );
}

/* ============================== ICONS ============================== */
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
const IconReturn: FC<SVGProps<SVGSVGElement>> = (p) => (
  <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/>
  </svg>
);
const IconTruck: FC<SVGProps<SVGSVGElement>> = (p) => (
  <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
    <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
  </svg>
);
const IconUsersAdmin: FC<SVGProps<SVGSVGElement>> = (p) => (
  <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/>
    <circle cx="18" cy="18" r="3"/><line x1="20.5" y1="15.5" x2="23" y2="13"/>
  </svg>
);
const IconEmbudo: FC<SVGProps<SVGSVGElement>> = (p) => (
  <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 2h18v4l-8 8v6l-4 2v-8L3 6V2z"/>
  </svg>
);