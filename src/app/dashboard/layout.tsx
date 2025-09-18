// Tu DashboardLayout.tsx
'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/nav/Sidebar';
import { normalizeRole, type Role } from '@/components/nav/roles';

const fetcher = (u: string) => fetch(u).then((r) => r.json());

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: me } = useSWR('/endpoints/me', fetcher);
  const role: Role = normalizeRole(me?.role);
  const name = me?.full_name || 'Usuario';
  
  // (Toda tu lógica de estado y efectos permanece sin cambios)
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    // ... tu lógica para controlar el sidebar ...
    const el = document.getElementById('app-sidebar') as HTMLElement | null;
    if (!el) return;
    const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
    if (isDesktop) {
      el.style.transform = '';
      document.body.style.overflow = '';
      return;
    }
    if (open) {
      el.style.transform = 'translateX(0)';
      document.body.style.overflow = 'hidden';
    } else {
      el.style.transform = '';
      document.body.style.overflow = '';
    }
  }, [open]);
  useEffect(() => {
    // ... tu lógica de resize ...
    const onResize = () => {
      const el = document.getElementById('app-sidebar') as HTMLElement | null;
      if (!el) return;
      const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
      if (isDesktop) {
        el.style.transform = '';
        document.body.style.overflow = '';
      } else {
        el.style.transform = open ? 'translateX(0)' : '';
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [open]);


  return (
    // CAMBIO: Se quitan las clases de color de fondo y texto de este div.
    // Ahora heredará el fondo 'bg-slate-950' del body, haciendo que el margen
    // 'lg:ml-72' sea invisible.
    <div className="flex min-h-screen">
      <Sidebar userRole={role} userName={name} />

      {/* Backdrop móvil (sin cambios) */}
      <div
        onClick={() => setOpen(false)}
        aria-hidden
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity z-40 lg:hidden data-[state=closed]:opacity-0 data-[state=open]:opacity-100 data-[state=closed]:pointer-events-none data-[state=open]:pointer-events-auto"
        data-state={open ? 'open' : 'closed'}
      />

      {/* Contenido (sin cambios en la estructura) */}
      <main className="relative flex-1 lg:ml-72">
        {/* Topbar móvil con botón (sin cambios) */}
        <div className="lg:hidden sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-white/10">
          <div className="flex items-center justify-between px-3 py-2">
            {/* ... tu botón ... */}
             <button
              onClick={() => setOpen((s) => !s)}
              aria-label="Abrir menú"
              className="inline-flex items-center gap-2 rounded-md border border-white/15 px-3 py-2 active:scale-[.98]"
            >
              <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
              <span className="text-sm ml-1 opacity-80">Menú</span>
            </button>
            <div className="text-sm opacity-70 truncate pr-1">Fenix • {name}</div>
          </div>
        </div>

        {/* FAB (sin cambios) */}
        {!open && (
           <button
            onClick={() => setOpen(true)}
            aria-label="Abrir menú (FAB)"
            className="fixed left-3 bottom-3 z-[60] inline-flex lg:hidden items-center justify-center w-12 h-12 rounded-full border border-white/15 bg-slate-800/80 backdrop-blur-md active:scale-95"
           >
            <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
           </button>
        )}
       
        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}