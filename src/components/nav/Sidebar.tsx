'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LogoutButton from '@/components/LogoutButton';
import type { FC, ReactNode, SVGProps } from 'react';
import { can, ROUTES, type Role } from './roles';

/* ───────────────────────────────── NavItem ───────────────────────────────── */
type NavLinkItem = {
  href: string;
  icon: ReactNode;
  label: string;
  shortcut?: string;
  req?: Parameters<typeof can>[1];
};

const isActive = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(href + '/');

const NavLink: FC<{ item: NavLinkItem; active?: boolean }> = ({ item, active }) => (
  <Link
    href={item.href}
    aria-current={active ? 'page' : undefined}
    className={[
      'relative flex items-center px-3.5 py-2.5 text-sm rounded-lg transition-colors',
      'border',
      active
        ? 'bg-white/10 border-white/15 text-white'
        : 'bg-transparent border-transparent text-[#C9D1D9] hover:bg-white/5 hover:border-white/10',
    ].join(' ')}
  >
    {active && (
      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-cyan-400" />
    )}
    <span className={`mr-3 ${active ? 'text-cyan-300' : 'text-[#8B949E]'}`}>{item.icon}</span>
    <span className="flex-1 truncate">{item.label}</span>
    {item.shortcut && (
      <span className="text-[10px] font-mono text-white/60 border border-white/15 rounded px-1.5 py-0.5">
        {item.shortcut}
      </span>
    )}
  </Link>
);

/* ───────────────────────────────── Sidebar ───────────────────────────────── */
export const Sidebar: FC<{ userRole: Role; userName: string }> = ({ userRole, userName }) => {
  const pathname = usePathname();

  const SECTIONS: { title: string; items: NavLinkItem[] }[] = [
    {
      title: 'ANÁLISIS Y REPORTES',
      items: [
        { href: ROUTES.SALES_REPORT,       icon: <IconSalesReport className="w-5 h-5" />, label: 'Reporte de Ventas',     shortcut: '2', req: 'view:sales-report' },
        { href: ROUTES.REPORTE_VENDEDORES, icon: <IconResumen className="w-5 h-5" />,     label: 'Reporte Vendedores',    shortcut: '7', req: 'view:resumen-asesores' },
        { href: ROUTES.REPORTE_PROMOTORES, icon: <IconResumen className="w-5 h-5" />,     label: 'Reporte Promotores',                 req: 'view:resumen-promotores' },
        { href: ROUTES.ASISTENCIA_PANEL,   icon: <IconAsistencia className="w-5 h-5" />,  label: 'Reporte de Asistencia', shortcut: 'R', req: 'view:reporte-asistencia' },
      ],
    },
    {
      title: 'OPERACIONES',
      items: [
        { href: ROUTES.LOGISTICA,           icon: <IconTruck className="w-5 h-5" />,    label: 'Logística',           shortcut: '1', req: 'view:logistica' },
        { href: ROUTES.REGISTRO_ASESORES,   icon: <IconRegistro className="w-5 h-5" />, label: 'Registro Asesores',   shortcut: '6', req: 'view:registro-asesores' },
        { href: ROUTES.REGISTRO_PROMOTORES, icon: <IconRegistro className="w-5 h-5" />, label: 'Registro Promotores',              req: 'view:registro-promotores' },
        { href: ROUTES.DEVOLUCIONES,        icon: <IconReturn className="w-5 h-5" />,   label: 'Devoluciones',        shortcut: '4', req: 'view:devoluciones' },
        { href: ROUTES.ASISTENCIA,          icon: <IconAsistencia className="w-5 h-5" />,label: 'Asistencia',          shortcut: 'A', req: 'view:asistencia' },
        { href: ROUTES.MI_RESUMEN,          icon: <IconResumen className="w-5 h-5" />,  label: 'Mi resumen',                       req: 'view:mi-resumen' },
      ],
    },
    {
      title: 'ADMINISTRACIÓN',
      items: [
        { href: ROUTES.PLAYBOOK,    icon: <IconPlaybook className="w-5 h-5" />,    label: 'Playbook',        shortcut: '5', req: 'view:playbook' },
        { href: ROUTES.USERS_ADMIN, icon: <IconUsersAdmin className="w-5 h-5" />, label: 'Admin Usuarios',  shortcut: '8', req: 'view:users-admin' },
      ],
    },
  ];

  return (
    <aside
      className={[
        'w-72 fixed left-0 top-0 h-screen z-30 hidden lg:flex flex-col',
        'bg-[#0D1117]/95 backdrop-blur',
        'border-r border-[#30363D]',
      ].join(' ')}
    >
      {/* Brand */}
      <div className="p-4 border-b border-[#30363D]">
        <Link href={ROUTES.DASH} className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center font-extrabold text-black shadow-md">
            F
          </div>
          <span className="font-semibold text-white tracking-tight">Fenix Store</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-3 overflow-y-auto">
        <NavLink
          item={{ href: ROUTES.DASH, icon: <IconDashboard className="w-5 h-5" />, label: 'Dashboard', shortcut: 'H' }}
          active={isActive(pathname, ROUTES.DASH)}
        />

        {SECTIONS.map((sec) => {
          const items = sec.items.filter((i) => !i.req || can(userRole, i.req as any));
          if (!items.length) return null;
          return (
            <div key={sec.title} className="pt-1">
              <h3 className="px-3 text-[11px] font-semibold text-[#8B949E] uppercase tracking-widest mb-2">
                {sec.title}
              </h3>
              <div className="space-y-1">
                {items.map((i) => (
                  <NavLink key={i.href} item={i} active={isActive(pathname, i.href)} />
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Profile + Logout */}
      <div className="p-4 border-t border-[#30363D]">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-[#161B22] flex items-center justify-center font-bold text-emerald-400 ring-1 ring-[#30363D]">
            {userName?.charAt(0) || 'U'}
          </div>
        <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{userName || 'Usuario'}</p>
            <p className="text-[11px] text-[#8B949E] capitalize">Sesión activa</p>
          </div>
        </div>
        <LogoutButton className="w-full justify-center px-3 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition shadow-sm" />
      </div>
    </aside>
  );
};

/* ── Íconos (mismos paths, con stroke inherente) ── */
const icon = (p: SVGProps<SVGSVGElement>) => ({
  ...p,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as SVGProps<SVGSVGElement>);

const IconDashboard = (p: SVGProps<SVGSVGElement>) => (
  <svg {...icon(p)} viewBox="0 0 24 24">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);
const IconSalesReport = (p: SVGProps<SVGSVGElement>) => (
  <svg {...icon(p)} viewBox="0 0 24 24">
    <path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-3"/>
    <rect x="8" y="1" width="8" height="4" rx="1" ry="1"/>
    <line x1="12" y1="16" x2="12" y2="12"/>
    <line x1="16" y1="16" x2="16" y2="9"/>
    <line x1="8" y1="16" x2="8" y2="14"/>
  </svg>
);
const IconResumen = (p: SVGProps<SVGSVGElement>) => (
  <svg {...icon(p)} viewBox="0 0 24 24">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
);
const IconAsistencia = (p: SVGProps<SVGSVGElement>) => (
  <svg {...icon(p)} viewBox="0 0 24 24">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
    <path d="m9 16 2 2 4-4"/>
  </svg>
);
const IconTruck = (p: SVGProps<SVGSVGElement>) => (
  <svg {...icon(p)} viewBox="0 0 24 24">
    <rect x="1" y="3" width="15" height="13"/>
    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
    <circle cx="5.5" cy="18.5" r="2.5"/>
    <circle cx="18.5" cy="18.5" r="2.5"/>
  </svg>
);
const IconRegistro = (p: SVGProps<SVGSVGElement>) => (
  <svg {...icon(p)} viewBox="0 0 24 24">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
  </svg>
);
const IconReturn = (p: SVGProps<SVGSVGElement>) => (
  <svg {...icon(p)} viewBox="0 0 24 24">
    <polyline points="9 14 4 9 9 4"/>
    <path d="M20 20v-7a4 4 0 0 0-4-4H4"/>
  </svg>
);
const IconPlaybook = (p: SVGProps<SVGSVGElement>) => (
  <svg {...icon(p)} viewBox="0 0 24 24">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
    <path d="M6.5 2H20v15H6.5A2.5 2.5 0 0 1 4 14.5v-10A2.5 2.5 0 0 1 6.5 2z"/>
  </svg>
);
const IconUsersAdmin = (p: SVGProps<SVGSVGElement>) => (
  <svg {...icon(p)} viewBox="0 0 24 24">
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="8.5" cy="7" r="4"/>
    <path d="M20 8v6m-3-3h6"/>
  </svg>
);