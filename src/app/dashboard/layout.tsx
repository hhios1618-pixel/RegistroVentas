// src/app/dashboard/layout.tsx
'use client';

import Link from 'next/link';
import { useMemo, type SVGProps, type FC, type ReactNode } from 'react';
import useSWR from 'swr';

// --- TIPOS, CAPACIDADES Y UTILIDADES (Como en tu página principal) ---
type Role = 'admin' | 'promotor' | 'coordinador' | 'lider' | 'asesor' | 'unknown';
type Cap =
  | 'view:logistica' | 'view:sales-report' | 'view:vendedores' | 'view:returns' | 'view:playbook'
  | 'view:promotores:registro' | 'view:promotores:resumen' | 'view:kpis' | 'view:users-admin'
  | 'view:asistencia' | 'view:captura-embudo';

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

// --- COMPONENTES DE UI (Sidebar, etc.) ---
// ... (Aquí van todos los subcomponentes como NavLink, Sidebar, HeaderBar, y los Iconos)
// ... Te los pongo al final para no hacer el código principal tan largo.

// --- EL COMPONENTE LAYOUT ---
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: me, isLoading: meLoading } = useSWR('/endpoints/me', fetcher);
  const userRole = useMemo(() => normalizeRole(me?.role), [me]);
  const userName = meLoading ? '...' : me?.full_name || 'Usuario';
  
  return (
    <>
      <DynamicGlobalStyles />
      <div className="flex min-h-screen bg-bg-dark font-sans">
        <Sidebar userRole={userRole} userName={userName} />
        <main className="flex-1 ml-64 pt-16">
          <div className="p-8 max-w-7xl mx-auto space-y-8">
            {/* El contenido de cada `page.tsx` se renderizará aquí */}
            {children}
          </div>
        </main>
      </div>
    </>
  );
}


/* ========================================================================
   SUBCOMPONENTES Y ESTILOS (Copiados de tu página principal)
   ======================================================================== */

const DynamicGlobalStyles = () => ( <style jsx global>{`...`}</style> ); // Opcional si ya es global

const NavLink: FC<{ link: { cap: Cap; href: string; icon: ReactNode; label: string; shortcut: string; }; isActive?: boolean }> = ({ link, isActive = false }) => (
  <Link href={link.href} className={`flex items-center px-4 py-2.5 text-sm font-medium rounded-md transition-colors group relative ${isActive ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800'}`}>
    {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 bg-cyan-400 rounded-r-full"></div>}
    <span className={`transition-colors ${isActive ? 'text-cyan-400' : 'text-gray-500 group-hover:text-cyan-400'}`}>{link.icon}</span>
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
        { cap: 'view:promotores:resumen', href: '/promotores', icon: <IconResumen className="w-5 h-5" />, label: 'Resumen Promotores', shortcut: '7' },
      ]
    },
    {
      title: 'Operaciones y Captura',
      links: [
        { cap: 'view:logistica', href: '/logistica', icon: <IconTruck className="w-5 h-5" />, label: 'Logística', shortcut: '1' },
        { cap: 'view:returns', href: '/dashboard/devoluciones', icon: <IconReturn className="w-5 h-5" />, label: 'Devoluciones', shortcut: '4' },
        { cap: 'view:promotores:registro', href: '/dashboard/registro', icon: <IconRegistro className="w-5 h-5" />, label: 'Registro Ventas', shortcut: '6' },
        { cap: 'view:captura-embudo', href: '/dashboard/captura', icon: <IconEmbudo className="w-5 h-5" />, label: 'Captura / Embudo', shortcut: 'C' },
        { cap: 'view:asistencia', href: '/asistencia', icon: <IconAsistencia className="w-5 h-5" />, label: 'Asistencia', shortcut: 'A' },
      ]
    },
    {
      title: 'Administración',
      links: [
        { cap: 'view:playbook', href: '/playbook-whatsapp', icon: <IconPlaybook className="w-5 h-5" />, label: 'Playbook', shortcut: '5' },
        { cap: 'view:asistencia', href: '/admin/asistencia/resumen', icon: <IconAsistencia className="w-5 h-5" />, label: 'Resumen Asistencia', shortcut: 'R' },
        { cap: 'view:users-admin', href: '/dashboard/usuarios', icon: <IconUsersAdmin className="w-5 h-5" />, label: 'Admin Usuarios', shortcut: '8' },
      ]
    }
  ];

  return (
    <aside className="w-64 fixed top-0 left-0 h-screen bg-[#0D1117] flex flex-col border-r border-[#30363D] z-30">
      <div className="p-4 border-b border-[#30363D]">
         <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center font-extrabold text-black">F</div>
            <span className="font-semibold text-white">Fenix Store</span>
        </Link>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navSections.map(section => {
          const accessibleLinks = section.links.filter(link => can(userRole, link.cap as Cap));
          if (accessibleLinks.length === 0) return null;
          return (
            <div key={section.title} className="pt-4">
              <h3 className="px-4 text-xs font-semibold text-[#8B949E] uppercase tracking-wider mb-2">{section.title}</h3>
              {accessibleLinks.map(link => <NavLink key={link.href} link={link as any} />)}
            </div>
          );
        })}
      </nav>
    </aside>
  );
};


const IconDashboard: FC<SVGProps<SVGSVGElement>> = (props) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>);
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