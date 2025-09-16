'use client';

import Link from 'next/link';
import { useMemo, type SVGProps, type FC, type ReactNode } from 'react';
import useSWR from 'swr';

type Role = 'admin' | 'promotor' | 'coordinador' | 'lider' | 'asesor' | 'unknown';
type Cap =
  | 'view:kpis' | 'view:sales-report' | 'view:resumen-asesores' | 'view:reporte-asistencia'
  | 'view:logistica' | 'view:registro-asesores' | 'view:registro-promotores'
  | 'view:resumen-promotores' | 'view:devoluciones' | 'view:asistencia'
  | 'view:playbook' | 'view:users-admin' | 'view:mi-resumen';

const ROLE_CAPS: Record<Role, Cap[]> = {
  admin: [
    'view:kpis','view:sales-report','view:resumen-asesores','view:resumen-promotores','view:reporte-asistencia',
    'view:logistica','view:registro-asesores','view:registro-promotores','view:devoluciones','view:asistencia',
    'view:playbook','view:users-admin','view:mi-resumen'
  ],
  coordinador: [
    'view:kpis','view:logistica','view:asistencia','view:reporte-asistencia','view:resumen-asesores','view:playbook'
  ],
  lider: [
    'view:kpis','view:resumen-asesores','view:resumen-promotores','view:reporte-asistencia','view:logistica','view:asistencia','view:sales-report','view:playbook'
  ],
  asesor: [
    'view:resumen-asesores','view:registro-asesores','view:asistencia','view:playbook','view:mi-resumen'
  ],
  promotor: [
    'view:resumen-promotores','view:registro-promotores'
  ],
  unknown: [],
};

const can = (role: Role, cap: Cap) => (ROLE_CAPS[role] ?? []).includes(cap);
const fetcher = (url: string) => fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(new Error('fetch error'))));
const normalizeRole = (raw?: string): Role => {
  const r = (raw || '').trim().toUpperCase();
  if (['GERENCIA','ADMIN','ADMINISTRADOR'].includes(r)) return 'admin';
  if (['PROMOTOR','PROMOTORA'].includes(r)) return 'promotor';
  if (['COORDINADOR','COORDINADORA','COORDINACION'].includes(r)) return 'coordinador';
  if (['LIDER','JEFE','SUPERVISOR'].includes(r)) return 'lider';
  if (['ASESOR','VENDEDOR','VENDEDORA'].includes(r)) return 'asesor';
  return 'unknown';
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: me } = useSWR('/endpoints/me', fetcher);
  const userRole = useMemo(() => normalizeRole(me?.role), [me?.role]);
  const userName = me?.full_name || 'Usuario';

  return (
    <div className="flex min-h-screen bg-[#0D1117] text-[#C9D1D9] font-sans">
      <Sidebar userRole={userRole} userName={userName} />
      <main className="flex-1 lg:ml-64">
        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}

const NavLink: FC<{ link: { href: string; icon: ReactNode; label: string; shortcut?: string }; isActive?: boolean }> =
({ link, isActive = false }) => (
  <Link
    href={link.href}
    className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors group relative ${
      isActive ? 'bg-[#161B22] text-white' : 'text-[#C9D1D9] hover:bg-[#161B22]'
    }`}
  >
    {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-1 bg-emerald-400 rounded-r-full" />}
    <span className={`transition-colors ${isActive ? 'text-emerald-400' : 'text-[#8B949E] group-hover:text-emerald-400'}`}>{link.icon}</span>
    <span className="ml-3 flex-1">{link.label}</span>
    {link.shortcut && <span className="text-xs font-mono text-gray-500 border border-gray-700 rounded px-1.5 py-0.5">{link.shortcut}</span>}
  </Link>
);

const Sidebar: FC<{ userRole: Role; userName: string }> = ({ userRole, userName }) => {
  const sections = [
    {
      title: 'Análisis y Reportes',
      links: [
        can(userRole,'view:sales-report')        && { href: '/dashboard/sales-report',        icon: <IconSalesReport className="w-5 h-5" />, label: 'Reporte de Ventas', shortcut: '2' },
        can(userRole,'view:resumen-asesores')    && { href: '/dashboard/asesores/HOME',       icon: <IconResumen className="w-5 h-5" />,     label: 'Resumen Asesores',   shortcut: '7' },
        can(userRole,'view:resumen-promotores')  && { href: '/dashboard/promotores',          icon: <IconResumen className="w-5 h-5" />,     label: 'Resumen Promotores' },
        can(userRole,'view:reporte-asistencia')  && { href: '/dashboard/admin/resumen',       icon: <IconAsistencia className="w-5 h-5" />,  label: 'Reporte de Asistencia', shortcut: 'R' },
      ].filter(Boolean),
    },
    {
      title: 'Operaciones',
      links: [
        can(userRole,'view:logistica')           && { href: '/logistica',                      icon: <IconTruck className="w-5 h-5" />,       label: 'Logística',          shortcut: '1' },
        can(userRole,'view:registro-asesores')   && { href: '/dashboard/asesores/registro',    icon: <IconRegistro className="w-5 h-5" />,    label: 'Registro Asesores',  shortcut: '6' },
        can(userRole,'view:registro-promotores') && { href: '/dashboard/promotores/registro',  icon: <IconRegistro className="w-5 h-5" />,    label: 'Registro Promotores' },
        can(userRole,'view:devoluciones')        && { href: '/dashboard/asesores/devoluciones',icon: <IconReturn className="w-5 h-5" />,      label: 'Devoluciones',       shortcut: '4' },
        can(userRole,'view:asistencia')          && { href: '/asistencia',                     icon: <IconAsistencia className="w-5 h-5" />,  label: 'Asistencia',         shortcut: 'A' },
        can(userRole,'view:mi-resumen')          && { href: '/mi/resumen',                     icon: <IconResumen className="w-5 h-5" />,     label: 'Mi resumen' },
      ].filter(Boolean),
    },
    {
      title: 'Administración',
      links: [
        can(userRole,'view:playbook')            && { href: '/dashboard/asesores/playbook-whatsapp', icon: <IconPlaybook className="w-5 h-5" />, label: 'Playbook', shortcut: '5' },
        can(userRole,'view:users-admin')         && { href: '/dashboard/admin/usuarios',       icon: <IconUsersAdmin className="w-5 h-5" />,  label: 'Admin Usuarios',     shortcut: '8' },
      ].filter(Boolean),
    },
  ];

  return (
    <aside className="w-64 fixed top-0 left-0 h-screen bg-[#0D1117] flex-col border-r border-[#30363D] z-30 hidden lg:flex">
      <div className="p-4 border-b border-[#30363D]">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center font-extrabold text-black">F</div>
          <span className="font-semibold text-white">Fenix Store</span>
        </Link>
      </div>
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {sections.map((sec) => {
          const links = sec.links as { href: string; icon: ReactNode; label: string; shortcut?: string }[];
          if (!links || links.length === 0) return null;
          return (
            <div key={sec.title} className="pt-2">
              <h3 className="px-3 text-xs font-semibold text-[#8B949E] uppercase tracking-wider mb-2">{sec.title}</h3>
              {links.map((l) => <NavLink key={l.href} link={l} />)}
            </div>
          );
        })}
      </nav>
      <div className="p-4 border-t border-[#30363D]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#161B22] flex items-center justify-center font-bold text-emerald-400">
            {userName.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{userName}</p>
            <p className="text-xs text-[#8B949E] capitalize">{userRole}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

// ICONOS (igual que ya tenías)
const IconTruck: FC<SVGProps<SVGSVGElement>> = (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>);
const IconRegistro: FC<SVGProps<SVGSVGElement>> = (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>);
const IconResumen: FC<SVGProps<SVGSVGElement>> = (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>);
const IconAsistencia: FC<SVGProps<SVGSVGElement>> = (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="m9 16 2 2 4-4"/></svg>);
const IconSalesReport: FC<SVGProps<SVGSVGElement>> = (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-3"/><rect x="8" y="1" width="8" height="4" rx="1" ry="1"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="16" y1="16" x2="16" y2="9"/><line x1="8" y1="16" x2="8" y2="14"/></svg>);
const IconReturn: FC<SVGProps<SVGSVGElement>> = (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>);
const IconPlaybook: FC<SVGProps<SVGSVGElement>> = (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v15H6.5A2.5 2.5 0 0 1 4 14.5v-10A2.5 2.5 0 0 1 6.5 2z"/></svg>);
const IconUsersAdmin: FC<SVGProps<SVGSVGElement>> = (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6m-3-3h6"/></svg>);