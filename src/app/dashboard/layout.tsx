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

  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Cierra el drawer al navegar
  useEffect(() => { setOpen(false); }, [pathname]);

  // 🔒 Controla el sidebar con transform inline (gana a Tailwind)
  useEffect(() => {
    const el = document.getElementById('app-sidebar') as HTMLElement | null;
    if (!el) return;

    const isDesktop = window.matchMedia('(min-width: 1024px)').matches;

    if (isDesktop) {
      // en desktop el sidebar siempre visible
      el.style.transform = '';
      document.body.style.overflow = '';
      return;
    }

    if (open) {
      el.style.transform = 'translateX(0)';   // abre
      document.body.style.overflow = 'hidden'; // bloquea scroll detrás
    } else {
      el.style.transform = ''; // vuelve a la clase -translate-x-full
      document.body.style.overflow = '';
    }
  }, [open]);

  // Re-sincroniza al cambiar tamaño
  useEffect(() => {
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
    <div className="flex min-h-screen bg-[#0D1117] text-[#C9D1D9]">
      {/* Sidebar (tu mismo componente; su <aside> DEBE tener id="app-sidebar"
          y clases con -translate-x-full en móvil, lg:translate-x-0 en desktop) */}
      <Sidebar userRole={role} userName={name} />

      {/* Backdrop móvil */}
      <div
        onClick={() => setOpen(false)}
        aria-hidden
        className={[
          'fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity z-40',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
          'lg:hidden',
        ].join(' ')}
      />

      {/* Contenido */}
      <main className="relative flex-1 lg:ml-72">
        {/* Topbar móvil con botón */}
        <div className="lg:hidden sticky top-0 z-40 bg-[#0D1117]/90 backdrop-blur-md border-b border-white/10">
          <div className="flex items-center justify-between px-3 py-2">
            <button
              onClick={() => setOpen((s) => !s)}
              aria-label="Abrir menú"
              className="inline-flex items-center gap-2 rounded-md border border-white/15 px-3 py-2 active:scale-[.98]"
            >
              <span className="block w-5 h-0.5 bg-white rounded" />
              <span className="block w-5 h-0.5 bg-white rounded mt-1" />
              <span className="block w-5 h-0.5 bg-white rounded mt-1" />
              <span className="text-sm ml-2 opacity-80">Menú</span>
            </button>
            <div className="text-sm opacity-70 truncate pr-1">Fenix • {name}</div>
          </div>
        </div>

        {/* (Opcional) FAB para abrir desde abajo; quítalo si no lo necesitas */}
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir menú (FAB)"
          className="fixed left-3 bottom-3 z-[60] inline-flex lg:hidden items-center justify-center w-12 h-12 rounded-full border border-white/15 bg-[#111827]/90 backdrop-blur-md active:scale-95"
        >
          <span className="block w-6 h-0.5 bg-white rounded" />
          <span className="block w-6 h-0.5 bg-white rounded mt-1" />
          <span className="block w-6 h-0.5 bg-white rounded mt-1" />
        </button>

        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}