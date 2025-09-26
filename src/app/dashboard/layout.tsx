'use client';

import { useEffect, useState, useCallback } from 'react';
import useSWR from 'swr';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';

import { Sidebar } from '@/components/nav/Sidebar';
import { normalizeRole, type Role } from '@/lib/auth/roles';

const fetcher = (u: string) => fetch(u).then((r) => r.json());

export default function DashboardLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  // === DATA FETCHING (sin cambios) ===
  const { data: me, error } = useSWR('/endpoints/me', fetcher, {
    refreshInterval: 30000,
    revalidateOnFocus: true,
  });
  
  const role: Role = normalizeRole(me?.role);
  const name = me?.full_name || 'Usuario';
  
  // === ESTADO DEL SIDEBAR (sin cambios) ===
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const pathname = usePathname();
  
  // === EFECTOS (simplificados para claridad) ===
  useEffect(() => {
    setSidebarOpen(false); // Cierra el menú móvil al navegar
  }, [pathname]);

  useEffect(() => {
    // Bloquea el scroll del body cuando el menú móvil está abierto
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  // === HANDLERS (sin cambios) ===
  const toggleSidebar = useCallback(() => setSidebarOpen(prev => !prev), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  // === LOADING & ERROR STATES (sin cambios) ===
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        {/* ... Código de estado de error ... */}
      </div>
    );
  }
  
  if (!me) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card text-center">
          <div className="animate-spin w-8 h-8 border-2 border-apple-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="apple-caption">Cargando...</p>
        </div>
      </div>
    );
  }

  // === ESTRUCTURA JSX CORREGIDA ===
  return (
    <div className="min-h-screen flex bg-black">
      {/* El Sidebar ahora se renderiza de dos maneras:
        1. Fijo y visible en desktop (controlado por clases DENTRO del componente Sidebar).
        2. Controlado por estado en móvil.
      */}
      <Sidebar 
        userRole={role} 
        userName={name} 
        isOpen={sidebarOpen}
        onClose={closeSidebar}
      />
      
      {/* CONTENIDO PRINCIPAL
        - `flex-1`: Esta es la clase CLAVE. Le dice a este div que crezca y ocupe todo el espacio restante.
        - `flex flex-col`: Lo convierte en un contenedor de columnas para el topbar y el contenido.
        - `overflow-y-auto`: Asegura que solo esta área tenga scroll, manteniendo el sidebar fijo.
      */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* === TOPBAR MÓVIL (sin cambios) === */}
        <header className="lg:hidden sticky top-0 z-30">
          <div className="glass backdrop-blur-apple-lg border-b border-white/10">
            <div className="flex items-center justify-between px-4 py-3">
              <button onClick={toggleSidebar} className="btn-ghost btn-sm p-2" aria-label="Abrir menú">
                <Menu size={20} />
              </button>
              <div className="flex items-center gap-3">
                 <div className="text-right">
                   <div className="text-apple-footnote font-medium text-white truncate max-w-32">{name}</div>
                   <div className="text-apple-caption2 text-app-muted">Fenix Store</div>
                 </div>
                 <div className="w-8 h-8 rounded-full bg-gradient-to-br from-apple-blue-500/30 to-apple-green-500/30 flex items-center justify-center text-apple-footnote font-semibold text-white border border-white/20">
                   {name?.charAt(0)?.toUpperCase() || 'U'}
                 </div>
               </div>
            </div>
          </div>
        </header>
        
        {/* === ENVOLTORIO DEL CONTENIDO DE LA PÁGINA === */}
        <main className="flex-1 relative p-4 sm:p-6 lg:p-8">
          {/* Efectos de fondo */}
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-apple-blue-950/5 to-transparent pointer-events-none" />
          
          <motion.div
            key={pathname} // Anima en cada cambio de ruta
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="relative z-10"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
