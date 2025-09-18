'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import LogoutButton from '@/components/LogoutButton';
import type { FC, ReactNode, SVGProps } from 'react';
import { can, ROUTES, type Role } from './roles';

/* ────────────────────────────── Tipos ────────────────────────────── */
type NavLinkItem = {
  href: string;
  icon: ReactNode;
  label: string;
  shortcut?: string;
  req?: Parameters<typeof can>[1];
};

const isActive = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(href + '/');

/* ────────────────────────────── Link ────────────────────────────── */
const NavLink: FC<{ item: NavLinkItem; active?: boolean }> = ({ item, active }) => (
  <Link
    href={item.href}
    aria-current={active ? 'page' : undefined}
    className={[
      'group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm',
      'transition-all duration-200',
      active
        ? 'font-semibold text-emerald-300' // NUEVO: El texto activo es de color esmeralda
        : 'text-slate-400 hover:text-white hover:bg-white/10', // NUEVO: Hover sutil para inactivos
    ].join(' ')}
  >
    {/* NUEVO: Fondo de resplandor para el link activo */}
    {active && (
      <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-900/50 via-emerald-900/20 to-transparent opacity-70" />
    )}
    
    {/* Contenido del Link (relativo para estar sobre el resplandor) */}
    <span className="relative grid place-items-center rounded-lg p-1.5">
      {item.icon}
    </span>
    <span className="relative flex-1 font-medium truncate">{item.label}</span>
    {item.shortcut && (
      <kbd
        className={[
          'relative text-[10px] font-mono px-1.5 py-0.5 rounded border transition-colors',
          active
            ? 'text-emerald-300/90 border-emerald-400/30 bg-emerald-400/10'
            : 'text-slate-500 border-slate-700/60 group-hover:text-slate-300 group-hover:border-slate-600',
        ].join(' ')}
      >
        {item.shortcut}
      </kbd>
    )}
  </Link>
);

/* ────────────────────────────── Sidebar ────────────────────────────── */
export const Sidebar: FC<{ userRole: Role; userName: string }> = ({ userRole, userName }) => {
  const pathname = usePathname();

  // (Las secciones no cambian, se omite por brevedad)
  const SECTIONS: { title: string; items: NavLinkItem[] }[] = [
    {
      title: 'Reportes',
      items: [
        { href: ROUTES.SALES_REPORT,       icon: <IconSalesReport className="w-4 h-4" />, label: 'Ventas',               shortcut: '2', req: 'view:sales-report' },
        { href: ROUTES.REPORTE_VENDEDORES, icon: <IconResumen className="w-4 h-4" />,     label: 'Vendedores',           shortcut: '7', req: 'view:resumen-asesores' },
        { href: ROUTES.REPORTE_PROMOTORES, icon: <IconResumen className="w-4 h-4" />,     label: 'Promotores',                         req: 'view:resumen-promotores' },
        { href: ROUTES.ASISTENCIA_PANEL,   icon: <IconAsistencia className="w-4 h-4" />,  label: 'Asistencia (panel)',   shortcut: 'R', req: 'view:reporte-asistencia' },
      ],
    },
    {
      title: 'Operaciones',
      items: [
        { href: ROUTES.LOGISTICA,           icon: <IconTruck className="w-4 h-4" />,    label: 'Logística',           shortcut: '1', req: 'view:logistica' },
        { href: ROUTES.REGISTRO_ASESORES,   icon: <IconRegistro className="w-4 h-4" />, label: 'Registro asesores',   shortcut: '6', req: 'view:registro-asesores' },
        { href: ROUTES.REGISTRO_PROMOTORES, icon: <IconRegistro className="w-4 h-4" />, label: 'Registro promotores',              req: 'view:registro-promotores' },
        { href: ROUTES.DEVOLUCIONES,        icon: <IconReturn className="w-4 h-4" />,   label: 'Devoluciones',        shortcut: '4', req: 'view:devoluciones' },
        { href: ROUTES.ASISTENCIA,          icon: <IconAsistencia className="w-4 h-4" />,label: 'Marcar asistencia',   shortcut: 'A', req: 'view:asistencia' },
        { href: ROUTES.MI_RESUMEN,          icon: <IconResumen className="w-4 h-4" />,  label: 'Mi resumen',                       req: 'view:mi-resumen' },
      ],
    },
    {
      title: 'Administración',
      items: [
        { href: ROUTES.PLAYBOOK,    icon: <IconPlaybook className="w-4 h-4" />,    label: 'Playbook',       shortcut: '5', req: 'view:playbook' },
        { href: ROUTES.USERS_ADMIN, icon: <IconUsersAdmin className="w-4 h-4" />, label: 'Usuarios',        shortcut: '8', req: 'view:users-admin' },
      ],
    },
  ];

  return (
    <aside
      id="app-sidebar"
      className={[
        'w-72 fixed left-0 top-0 h-dvh z-50 flex flex-col',
        // NUEVO: Efecto de cristal esmerilado (Glassmorphism)
        'bg-black/70 backdrop-blur-xl',
        'border-r border-white/10', // Borde sutil que complementa el efecto cristal
        'transition-transform duration-200 ease-out -translate-x-full',
        'data-[open=true]:translate-x-0',
        'lg:translate-x-0 lg:static lg:h-screen lg:z-30',
      ].join(' ')}
    >
      {/* Brand */}
      <div className="p-5 border-b border-white/10">
        <Link href={ROUTES.DASH} className="flex items-center gap-3 group">
          <div className="w-9 h-9 relative">
            <Image src="/1.png" alt="Fenix" fill className="object-contain" priority />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-white text-base tracking-tight group-hover:text-emerald-300 transition-colors">
              Fenix OS
            </div>
            <div className="text-[11px] text-slate-500 -mt-0.5">Panel de gestión</div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3.5 py-5 space-y-7 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700/60 scrollbar-track-transparent">
        {/* Home */}
        <NavLink
          item={{ href: ROUTES.DASH, icon: <IconDashboard className="w-4 h-4" />, label: 'Inicio', shortcut: 'H' }}
          active={pathname === ROUTES.DASH}
        />

        {SECTIONS.map((section) => {
          const items = section.items.filter((i) => !i.req || can(userRole, i.req as any));
          if (!items.length) return null;
          return (
            <div key={section.title} className="space-y-2">
              <h3 className="px-3.5 text-[10px] font-semibold text-slate-500 tracking-[0.14em] uppercase">
                {section.title}
              </h3>
              <div className="space-y-1.5">
                {items.map((item) => (
                  <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} />
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 mb-3 p-2 rounded-xl hover:bg-white/10 transition-colors">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500/25 to-cyan-500/25 grid place-items-center text-emerald-300 font-semibold text-sm ring-1 ring-emerald-500/20">
            {userName?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-slate-100 truncate">{userName || 'Usuario'}</div>
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              En línea
            </div>
          </div>
        </div>
        <LogoutButton className="w-full px-3 py-2 text-sm font-medium text-slate-200 bg-white/5 hover:bg-white/10 ring-1 ring-white/10 hover:ring-white/20 rounded-lg transition-all" />
      </div>
    </aside>
  );
};

/* ── Iconos (Sin cambios) ── */
const icon = (p: SVGProps<SVGSVGElement>) => ({
  ...p,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as SVGProps<SVGSVGElement>);

const IconDashboard = (p: SVGProps<SVGSVGElement>) => (
  <svg {...icon(p)} viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
);
const IconSalesReport = (p: SVGProps<SVGSVGElement>) => (
  <svg {...icon(p)} viewBox="0 0 24 24"><line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" /></svg>
);
const IconResumen = (p: SVGProps<SVGSVGElement>) => (
  <svg {...icon(p)} viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="m14 2 6 6" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
);
const IconAsistencia = (p: SVGProps<SVGSVGElement>) => (
  <svg {...icon(p)} viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><path d="m9 16 2 2 4-4" /></svg>
);
const IconTruck = (p: SVGProps<SVGSVGElement>) => (
  <svg {...icon(p)} viewBox="0 0 24 24"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" /><path d="M15 18H9" /><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" /><circle cx="17" cy="18" r="2" /><circle cx="7" cy="18" r="2" /></svg>
);
const IconRegistro = (p: SVGProps<SVGSVGElement>) => (
  <svg {...icon(p)} viewBox="0 0 24 24"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /><path d="m9 14 2 2 4-4" /></svg>
);
const IconReturn = (p: SVGProps<SVGSVGElement>) => (
  <svg {...icon(p)} viewBox="0 0 24 24"><path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11" /></svg>
);
const IconPlaybook = (p: SVGProps<SVGSVGElement>) => (
  <svg {...icon(p)} viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
);
const IconUsersAdmin = (p: SVGProps<SVGSVGElement>) => (
  <svg {...icon(p)} viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
);