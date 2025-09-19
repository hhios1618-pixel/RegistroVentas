// src/app/dashboard/layout.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import useSWR from 'swr';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';

import { Sidebar } from '@/components/nav/Sidebar';
import { normalizeRole, type Role } from '@/components/nav/roles';

const fetcher = (u: string) => fetch(u).then((r) => r.json());

export default function DashboardLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  // === DATA FETCHING ===
  const { data: me, error } = useSWR('/endpoints/me', fetcher, {
    refreshInterval: 30000, // Refresh cada 30 segundos
    revalidateOnFocus: true,
  });
  
  const role: Role = normalizeRole(me?.role);
  const name = me?.full_name || 'Usuario';
  
  // === ESTADO DEL SIDEBAR ===
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  
  const pathname = usePathname();
  
  // === EFECTOS ===
  
  // Cerrar sidebar al cambiar de ruta
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);
  
  // Detectar tamaño de pantalla
  useEffect(() => {
    const checkDesktop = () => {
      const desktop = window.matchMedia('(min-width: 1024px)').matches;
      setIsDesktop(desktop);
      
      // En desktop, el sidebar siempre está visible
      if (desktop) {
        setSidebarOpen(false); // Reset mobile state
      }
    };
    
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);
  
  // Controlar overflow del body en móvil
  useEffect(() => {
    if (!isDesktop) {
      document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen, isDesktop]);
  
  // === HANDLERS ===
  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);
  
  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);
  
  // === LOADING STATE ===
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card text-center max-w-md">
          <div className="text-apple-red-400 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="apple-h3 mb-2">Error de conexión</h2>
          <p className="apple-caption mb-4">No se pudo cargar la información del usuario.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="btn-primary"
          >
            Reintentar
          </button>
        </div>
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
  
  return (
    <div className="min-h-screen flex bg-transparent">
      {/* === SIDEBAR === */}
      <Sidebar 
        userRole={role} 
        userName={name} 
        isOpen={sidebarOpen}
        onClose={closeSidebar}
      />
      
      {/* === BACKDROP MÓVIL === */}
      <AnimatePresence>
        {sidebarOpen && !isDesktop && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            onClick={closeSidebar}
          />
        )}
      </AnimatePresence>
      
      {/* === CONTENIDO PRINCIPAL === */}
      <main className="flex-1 lg:ml-72 min-h-screen flex flex-col">
        {/* === TOPBAR MÓVIL === */}
        <div className="lg:hidden sticky top-0 z-30">
          <div className="glass backdrop-blur-apple-lg border-b border-white/10">
            <div className="flex items-center justify-between px-4 py-3">
              {/* Botón de menú */}
              <button
                onClick={toggleSidebar}
                className="btn-ghost btn-sm p-2"
                aria-label="Abrir menú de navegación"
              >
                <Menu size={20} />
              </button>
              
              {/* Info del usuario */}
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-apple-footnote font-medium text-white truncate max-w-32">
                    {name}
                  </div>
                  <div className="text-apple-caption2 text-app-muted">
                    Fenix Store
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-apple-blue-500/30 to-apple-green-500/30 flex items-center justify-center text-apple-footnote font-semibold text-white border border-white/20">
                  {name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* === CONTENIDO DE LA PÁGINA === */}
        <div className="flex-1 relative">
          {/* Efectos de fondo para el contenido */}
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-apple-blue-950/5 to-transparent pointer-events-none" />
          
          {/* Contenido real */}
          <div className="relative z-10 p-4 sm:p-6 lg:p-8">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              {children}
            </motion.div>
          </div>
        </div>
        
        {/* === FAB MÓVIL === */}
        <AnimatePresence>
          {!sidebarOpen && !isDesktop && (
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ 
                type: 'spring', 
                stiffness: 400, 
                damping: 25,
                delay: 0.1 
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleSidebar}
              className="fixed bottom-6 left-6 z-50 w-14 h-14 glass rounded-full flex items-center justify-center shadow-apple-lg border border-white/20 lg:hidden"
              aria-label="Abrir menú de navegación"
            >
              <Menu size={24} className="text-white" />
            </motion.button>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
