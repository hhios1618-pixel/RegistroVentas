'use client';

import Link from 'next/link';
import { useMemo, type SVGProps, type FC, type ReactNode } from 'react';
import useSWR from 'swr';

// --- TIPOS, CAPACIDADES Y UTILIDADES ---
type Role = 'admin' | 'promotor' | 'coordinador' | 'lider' | 'asesor' | 'unknown';
type Cap =
  | 'view:logistica' | 'view:sales-report' | 'view:vendedores' | 'view:returns' | 'view:playbook'
  | 'view:promotores:registro' | 'view:promotores:resumen' | 'view:kpis' | 'view:users-admin'
  | 'view:asistencia' | 'view:captura-embudo';

const ROLE_CAPS: Record<Role, Cap[]> = {
  admin: ['view:kpis','view:logistica','view:sales-report','view:vendedores','view:returns','view:promotores:registro','view:promotores:resumen','view:asistencia','view:captura-embudo','view:users-admin','view:playbook'],
  promotor: ['view:promotores:registro', 'view:promotores:resumen'],
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

// --- EL COMPONENTE LAYOUT ---
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: me, isLoading: meLoading } = useSWR('/endpoints/me', fetcher);
  const userRole = useMemo(() => normalizeRole(me?.raw_role), [me?.raw_role]);
  const userName = meLoading ? '...' : me?.full_name || 'Usuario';
  
  return (
    <div className="flex min-h-screen bg-[#0D1117] text-[#C9D1D9] font-sans">
      <Sidebar userRole={userRole} userName={userName} />
      <main className="flex-1 lg:ml-64">
        <div className="p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

// --- SUBCOMPONENTES DE UI ---

const NavLink: FC<{ link: { cap: Cap; href: string; icon: ReactNode; label: string; shortcut?: string; }; isActive?: boolean }> = ({ link, isActive = false }) => (
  <Link href={link.href} className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors group relative ${isActive ? 'bg-[#161B22] text-white' : 'text-[#C9D1D9] hover:bg-[#161B22]'}`}>
    {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-1 bg-emerald-400 rounded-r-full"></div>}
    <span className={`transition-colors ${isActive ? 'text-emerald-400' : 'text-[#8B949E] group-hover:text-emerald-400'}`}>{link.icon}</span>
    <span className="ml-3 flex-1">{link.label}</span>
    {link.shortcut && <span className="text-xs font-mono text-gray-500 border border-gray-700 rounded px-1.5 py-0.5">{link.shortcut}</span>}
  </Link>
);

const Sidebar: FC<{ userRole: Role; userName: string }> = ({ userRole, userName }) => {
  const navSections = [
      {
        title: 'Principal',
        links: [
            // ======================================================
            // AQUÍ ESTÁN LAS CORRECCIONES
            // ======================================================
            { cap: 'view:promotores:resumen', href: '/dashboard/promotores', icon: <IconResumen className="w-5 h-5" />, label: 'Resumen Promotores', shortcut: 'M' },
            { cap: 'view:promotores:registro', href: '/dashboard/registro', icon: <IconRegistro className="w-5 h-5" />, label: 'Registrar Venta', shortcut: 'R' },
            // ======================================================
        ]
      },
      {
        title: 'Administración',
        links: [
            { cap: 'view:asistencia', href: '/admin/asistencia/resumen', icon: <IconAsistencia className="w-5 h-5" />, label: 'Resumen Asistencia' },
            { cap: 'view:sales-report', href: '/dashboard/sales-report', icon: <IconSalesReport className="w-5 h-5" />, label: 'Reporte General' },
        ]
      }
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
        {navSections.map(section => {
          const accessibleLinks = section.links.filter(link => can(userRole, link.cap as Cap));
          if (accessibleLinks.length === 0) return null;
          return (
            <div key={section.title} className="pt-2">
              <h3 className="px-3 text-xs font-semibold text-[#8B949E] uppercase tracking-wider mb-2">{section.title}</h3>
              {accessibleLinks.map(link => <NavLink key={link.href} link={link as any} />)}
            </div>
          );
        })}
      </nav>
        <div className="p-4 border-t border-[#30363D]">
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#161B22] flex items-center justify-center font-bold text-emerald-400">{userName.charAt(0)}</div>
                <div>
                    <p className="text-sm font-semibold text-white">{userName}</p>
                    <p className="text-xs text-[#8B949E] capitalize">{userRole}</p>
                </div>
            </div>
        </div>
    </aside>
  );
};


// --- ICONOS ---
const IconRegistro: FC<SVGProps<SVGSVGElement>> = (props) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>);
const IconResumen: FC<SVGProps<SVGSVGElement>> = (props) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>);
const IconAsistencia: FC<SVGProps<SVGSVGElement>> = (props) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="m9 16 2 2 4-4"/></svg>);
const IconSalesReport: FC<SVGProps<SVGSVGElement>> = (props) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-3"/><rect x="8" y="1" width="8" height="4" rx="1" ry="1"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="16" y1="16" x2="16" y2="9"/><line x1="8" y1="16" x2="8" y2="14"/></svg>);