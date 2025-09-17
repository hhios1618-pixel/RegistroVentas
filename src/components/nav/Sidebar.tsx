'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LogoutButton from '@/components/LogoutButton';
import type { FC, ReactNode, SVGProps } from 'react';
import { can, ROUTES, type Role } from './roles';
import Image from 'next/image';

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
      'group relative flex items-center px-3 py-2.5 text-sm rounded-lg transition-all duration-200',
      'hover:transform hover:translate-x-1',
      active
        ? 'text-emerald-400 bg-emerald-500/10'
        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50',
    ].join(' ')}
  >
    {/* Active indicator */}
    {active && (
      <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r-full bg-emerald-400" />
    )}
    
    {/* Icon */}
    <span className={[
      'mr-3 transition-colors duration-200',
      active ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300'
    ].join(' ')}>
      {item.icon}
    </span>
    
    <span className="flex-1 font-medium truncate">
      {item.label}
    </span>
    
    {item.shortcut && (
      <span className={[
        'text-xs font-mono px-1.5 py-0.5 rounded border transition-colors duration-200',
        active 
          ? 'text-emerald-400/80 border-emerald-400/30 bg-emerald-400/5' 
          : 'text-slate-500 border-slate-600/50 group-hover:text-slate-400 group-hover:border-slate-500'
      ].join(' ')}>
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
      title: 'Análisis y Reportes',
      items: [
        { href: ROUTES.SALES_REPORT,       icon: <IconSalesReport className="w-4 h-4" />, label: 'Reporte de Ventas',     shortcut: '2', req: 'view:sales-report' },
        { href: ROUTES.REPORTE_VENDEDORES, icon: <IconResumen className="w-4 h-4" />,     label: 'Reporte Vendedores',    shortcut: '7', req: 'view:resumen-asesores' },
        { href: ROUTES.REPORTE_PROMOTORES, icon: <IconResumen className="w-4 h-4" />,     label: 'Reporte Promotores',                 req: 'view:resumen-promotores' },
        { href: ROUTES.ASISTENCIA_PANEL,   icon: <IconAsistencia className="w-4 h-4" />,  label: 'Reporte de Asistencia', shortcut: 'R', req: 'view:reporte-asistencia' },
      ],
    },
    {
      title: 'Operaciones',
      items: [
        { href: ROUTES.LOGISTICA,           icon: <IconTruck className="w-4 h-4" />,    label: 'Logística',           shortcut: '1', req: 'view:logistica' },
        { href: ROUTES.REGISTRO_ASESORES,   icon: <IconRegistro className="w-4 h-4" />, label: 'Registro Asesores',   shortcut: '6', req: 'view:registro-asesores' },
        { href: ROUTES.REGISTRO_PROMOTORES, icon: <IconRegistro className="w-4 h-4" />, label: 'Registro Promotores',              req: 'view:registro-promotores' },
        { href: ROUTES.DEVOLUCIONES,        icon: <IconReturn className="w-4 h-4" />,   label: 'Devoluciones',        shortcut: '4', req: 'view:devoluciones' },
        { href: ROUTES.ASISTENCIA,          icon: <IconAsistencia className="w-4 h-4" />,label: 'Asistencia',          shortcut: 'A', req: 'view:asistencia' },
        { href: ROUTES.MI_RESUMEN,          icon: <IconResumen className="w-4 h-4" />,  label: 'Mi resumen',                       req: 'view:mi-resumen' },
      ],
    },
    {
      title: 'Administración',
      items: [
        { href: ROUTES.PLAYBOOK,    icon: <IconPlaybook className="w-4 h-4" />,    label: 'Playbook',        shortcut: '5', req: 'view:playbook' },
        { href: ROUTES.USERS_ADMIN, icon: <IconUsersAdmin className="w-4 h-4" />, label: 'Admin Usuarios',  shortcut: '8', req: 'view:users-admin' },
      ],
    },
  ];

  return (
    <aside
      className={[
        'w-72 fixed left-0 top-0 h-screen z-30 hidden lg:flex flex-col',
        'bg-slate-950/95 backdrop-blur-sm',
        'border-r border-slate-800/60',
      ].join(' ')}
    >
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800/60">
        <Link href={ROUTES.DASH} className="flex items-center gap-3 group">
          {/* Logo */}
          <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
            <Image 
              src="/1.png" 
              alt="Fenix Store" 
              width={32} 
              height={32}
              className="w-full h-full object-contain"
            />
          </div>
          
          <div className="min-w-0">
            <div className="font-semibold text-white text-lg tracking-tight group-hover:text-emerald-400 transition-colors">
              Fenix Store
            </div>
            <div className="text-xs text-slate-500 -mt-0.5">
              Sistema de Gestión
            </div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-8 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {/* Dashboard */}
        <div>
          <NavLink
            item={{ 
              href: ROUTES.DASH, 
              icon: <IconDashboard className="w-4 h-4" />, 
              label: 'Dashboard', 
              shortcut: 'H' 
            }}
            active={isActive(pathname, ROUTES.DASH)}
          />
        </div>

        {/* Sections */}
        {SECTIONS.map((section) => {
          const items = section.items.filter((i) => !i.req || can(userRole, i.req as any));
          if (!items.length) return null;
          
          return (
            <div key={section.title} className="space-y-4">
              {/* Section Title */}
              <h3 className="px-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                {section.title}
              </h3>
              
              {/* Section Items */}
              <div className="space-y-1">
                {items.map((item) => (
                  <NavLink 
                    key={item.href} 
                    item={item} 
                    active={isActive(pathname, item.href)} 
                  />
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-slate-800/60">
        {/* User Info */}
        <div className="flex items-center gap-3 mb-4 p-2 rounded-lg hover:bg-slate-900/50 transition-colors">
          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-emerald-400 font-medium text-sm border border-slate-700">
            {userName?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-slate-200 truncate">
              {userName || 'Usuario'}
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
              En línea
            </div>
          </div>
        </div>
        
        {/* Logout */}
        <LogoutButton className="w-full px-3 py-2 text-sm font-medium text-slate-400 hover:text-white bg-transparent hover:bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 rounded-lg transition-all duration-200" />
      </div>
    </aside>
  );
};

/* ── Minimalist Icons ── */
const icon = (p: SVGProps<SVGSVGElement>) => ({
  ...p,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as SVGProps<SVGSVGElement>);

const IconDashboard = (p: SVGProps<SVGSVGElement>) => (
  <svg {...icon(p)} viewBox="0 0 24 24">
    <rect x="3" y="3" width="7" height="7"/>
    <rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/>
  </svg>
);

const IconSalesReport = (p: SVGProps<SVGSVGElement>) => (
  <svg {...icon(p)} viewBox="0 0 24 24">
    <line x1="12" y1="20" x2="12" y2="10"/>
    <line x1="18" y1="20" x2="18" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="16"/>
  </svg>
);

const IconResumen = (p: SVGProps<SVGSVGElement>) => (
  <svg {...icon(p)} viewBox="0 0 24 24">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <path d="m14 2 6 6"/>
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
    <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
    <path d="M15 18H9"/>
    <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
    <circle cx="17" cy="18" r="2"/>
    <circle cx="7" cy="18" r="2"/>
  </svg>
);

const IconRegistro = (p: SVGProps<SVGSVGElement>) => (
  <svg {...icon(p)} viewBox="0 0 24 24">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
    <path d="m9 14 2 2 4-4"/>
  </svg>
);

const IconReturn = (p: SVGProps<SVGSVGElement>) => (
  <svg {...icon(p)} viewBox="0 0 24 24">
    <path d="M9 14 4 9l5-5"/>
    <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"/>
  </svg>
);

const IconPlaybook = (p: SVGProps<SVGSVGElement>) => (
  <svg {...icon(p)} viewBox="0 0 24 24">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
  </svg>
);

const IconUsersAdmin = (p: SVGProps<SVGSVGElement>) => (
  <svg {...icon(p)} viewBox="0 0 24 24">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);