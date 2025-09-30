'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, BarChart3, Users, UserPlus, Package,
  RotateCcw, Calendar, FileText, Settings,
  LogOut, ChevronRight, Sparkles, Activity, ShieldCheck
} from 'lucide-react';
import type { FC, ReactNode } from 'react';
import { useState, useEffect } from 'react';
import LogoutButton from '@/components/LogoutButton';
import { ThemeToggle } from '@/components/ThemeToggle';

// Importa roles SOLO desde lib/auth/roles
import { can, ROUTES, type Role } from '@/lib/auth/roles';
import { FINANCIAL_CONTROL_IDS } from '@/lib/auth/financial';

type NavLinkItem = {
  href: string;
  icon: ReactNode;
  label: string;
  shortcut?: string;
  req?: Parameters<typeof can>[1];
  badge?: string | number;
  requiresPersonId?: string[];
};

type SidebarProps = {
  userRole: Role;
  userName: string;
  isOpen?: boolean;
  onClose?: () => void;
};

type MeResponse = {
  ok?: boolean;
  id?: string;
  full_name?: string;
  role?: string;
  privilege_level?: number;
  email?: string;
  raw_role?: string;
  local?: string | null;
} | null;

const isActive = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(href + '/');

const NavLink: FC<{ item: NavLinkItem; active?: boolean; onClick?: () => void }> = 
({ item, active, onClick }) => (
  <motion.div
    whileHover={{ x: 2 }}
    whileTap={{ scale: 0.98 }}
    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
  >
    <Link
      href={item.href}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={[
        'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-apple-body font-medium',
        'transition-all duration-300 ease-apple',
        'hover:bg-[color:var(--hover-surface)] hover:backdrop-blur-sm dark:hover:bg-white/10',
        active
          ? 'text-[color:var(--app-foreground)] dark:text-white bg-gradient-to-r from-apple-blue-500/10 to-apple-green-500/10 dark:from-apple-blue-600/20 dark:to-apple-blue-500/10 border border-[color:var(--app-border-strong)] dark:border-apple-blue-500/30 shadow-[0_8px_24px_rgba(36,99,235,0.18)] dark:shadow-primary'
          : 'text-apple-gray-600 hover:text-[color:var(--app-foreground)] dark:text-apple-gray-300 dark:hover:text-white',
      ].join(' ')}
    >
      {active && (
        <motion.div
          layoutId="activeIndicator"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-apple-blue-400 to-apple-blue-600 rounded-r-full"
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        />
      )}
      <div className={[
        'relative flex items-center justify-center w-5 h-5 transition-transform duration-300',
        active ? 'text-apple-blue-400' : 'text-current group-hover:scale-110',
      ].join(' ')}>
        {item.icon}
      </div>
      <span className="flex-1 truncate">{item.label}</span>
      {item.shortcut && (
        <kbd className={[
          'text-apple-caption2 font-mono px-1.5 py-0.5 rounded border transition-all duration-300',
          active
            ? 'text-apple-blue-300 border-apple-blue-400/40 bg-apple-blue-400/10'
            : 'text-apple-gray-500 border-apple-gray-700 group-hover:text-apple-gray-300 group-hover:border-apple-gray-600',
        ].join(' ')}>
          {item.shortcut}
        </kbd>
      )}
      <ChevronRight
        size={14}
        className={[
          'transition-all duration-300 opacity-0 group-hover:opacity-60',
          active ? 'text-apple-blue-400' : 'text-current',
        ].join(' ')}
      />
    </Link>
  </motion.div>
);

const SectionHeader: FC<{ title: string; icon?: ReactNode }> = ({ title, icon }) => (
  <div className="flex items-center gap-2 px-3 py-2 mb-2">
    {icon && (<div className="text-apple-gray-500">{icon}</div>)}
    <h3 className="text-apple-caption1 font-semibold text-apple-gray-500 tracking-wider uppercase">{title}</h3>
  </div>
);

export const Sidebar: FC<SidebarProps> = ({
  userRole,
  userName,
  isOpen = false,
  onClose,
}) => {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<MeResponse>(null);
  const [meLoaded, setMeLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/endpoints/me', { cache: 'no-store' });
        setCurrentUser(res.ok ? await res.json() : null);
      } catch {
        setCurrentUser(null);
      } finally {
        setMeLoaded(true);
      }
    })();
  }, []);

  const SECTIONS: { title: string; icon?: ReactNode; items: NavLinkItem[] }[] = [
    {
      title: 'Principal',
      icon: <Home size={12} />,
      items: [
        { href: ROUTES.DASH, icon: <Home size={18} />, label: 'Inicio', shortcut: 'H' },
        {
          href: '/dashboard/financial-control',
          icon: <Activity size={18} />,
          label: 'Control Financiero',
          shortcut: 'F',
          requiresPersonId: [...FINANCIAL_CONTROL_IDS],
        },
        {
          href: ROUTES.PERMISOS_ADMIN,
          icon: <ShieldCheck size={18} />,
          label: 'Autorizaciones',
          requiresPersonId: [...FINANCIAL_CONTROL_IDS],
        },
      ],
    },
    {
      title: 'Reportes',
      icon: <BarChart3 size={12} />,
      items: [
        { href: ROUTES.SALES_REPORT, icon: <BarChart3 size={18} />, label: 'Ventas', shortcut: '2', req: 'view:sales-report' },
        { href: ROUTES.REPORTE_VENDEDORES, icon: <Users size={18} />, label: 'Vendedores', shortcut: '7', req: 'view:resumen-asesores' },
        { href: ROUTES.REPORTE_PROMOTORES, icon: <Users size={18} />, label: 'Promotores', req: 'view:resumen-promotores' },
        { href: ROUTES.ASISTENCIA_PANEL, icon: <Calendar size={18} />, label: 'Asistencia', shortcut: 'R', req: 'view:reporte-asistencia' },
      ],
    },
    {
      title: 'Operaciones',
      icon: <Package size={12} />,
      items: [
        { href: ROUTES.LOGISTICA, icon: <Package size={18} />, label: 'Logística', shortcut: '1', req: 'view:logistica' },
        { href: ROUTES.INVENTARIO, icon: <Package size={18} />, label: 'Inventario', shortcut: 'I', req: 'view:inventario' },
        { href: ROUTES.REGISTRO_ASESORES, icon: <UserPlus size={18} />, label: 'Registro asesores', shortcut: '6', req: 'view:registro-asesores' },
        { href: ROUTES.REGISTRO_PROMOTORES, icon: <UserPlus size={18} />, label: 'Registro promotores', req: 'view:registro-promotores' },
        { href: ROUTES.DEVOLUCIONES, icon: <RotateCcw size={18} />, label: 'Devoluciones', shortcut: '4', req: 'view:devoluciones' },
        { href: ROUTES.ASISTENCIA, icon: <Calendar size={18} />, label: 'Marcar asistencia', shortcut: 'A', req: 'view:asistencia' },
        { href: ROUTES.MI_RESUMEN, icon: <FileText size={18} />, label: 'Mi resumen', req: 'view:mi-resumen' },
      ],
    },
    {
      title: 'Administración',
      icon: <Settings size={12} />,
      items: [
        { href: ROUTES.PLAYBOOK, icon: <FileText size={18} />, label: 'Central Operativa', shortcut: '5', req: 'view:playbook' },
        { href: ROUTES.USERS_ADMIN, icon: <Settings size={18} />, label: 'Usuarios', shortcut: '8', req: 'view:users-admin' },
      ],
    },
  ];

  return (
    <AnimatePresence>
      <motion.aside
        initial={{ x: -288 }}
        animate={{ x: isOpen || typeof window === 'undefined' || window.innerWidth >= 1024 ? 0 : -288 }}
        exit={{ x: -288 }}
        transition={{ type: 'spring', stiffness: 400, damping: 40 }}
        className="fixed left-0 top-0 h-screen w-72 z-50 flex flex-col glass backdrop-blur-apple-lg border-r border-[color:var(--app-border)] dark:border-white/10 transition-colors duration-500 lg:translate-x-0 lg:static lg:z-30"
      >
        <div className="p-6 border-b border-[color:var(--app-border)] dark:border-white/10 transition-colors duration-500">
          <Link href={ROUTES.DASH} className="group flex items-center gap-3" onClick={onClose}>
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 bg-gradient-to-br from-apple-blue-500/20 to-apple-green-500/20 rounded-xl border border-white/20" />
              <div className="relative w-full h-full flex items-center justify-center">
                <Image src="/1.png" alt="Fenix" width={24} height={24} className="object-contain" priority />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="apple-h3 text-white group-hover:text-apple-blue-300 transition-colors duration-300">Fenix OS</div>
              <div className="text-apple-caption text-apple-gray-500 -mt-0.5">Sistema de gestión</div>
            </div>
            <Sparkles size={16} className="text-apple-blue-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </Link>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto scrollbar-thin transition-colors duration-500">
          {SECTIONS.map((section) => {
            const items = section.items.filter((item) => {
              if (item.requiresPersonId) {
                if (!meLoaded) return false;
                return !!currentUser?.id && item.requiresPersonId.includes(currentUser.id);
              }
              return !item.req || can(userRole, item.req);
            });

            if (!items.length) return null;

            return (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="space-y-1"
              >
                <SectionHeader title={section.title} icon={section.icon} />
                <div className="space-y-1">
                  {items.map((item) => (
                    <NavLink
                      key={item.href}
                      item={item}
                      active={isActive(pathname, item.href)}
                      onClick={onClose}
                    />
                  ))}
                </div>
              </motion.div>
            );
          })}
        </nav>

        <div className="p-4 mt-auto space-y-3 border-t border-[color:var(--app-border)] dark:border-white/10">
          <ThemeToggle />

          <motion.div
            whileHover={{ scale: 1.02 }}
            className="flex items-center gap-3 p-3 rounded-xl transition-all duration-300 bg-[color:var(--glass-card-bg,rgba(255,255,255,0.7))] hover:bg-[color:var(--hover-surface)] dark:bg-white/5 dark:hover:bg-white/10"
          >
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-apple-blue-500/30 to-apple-green-500/30 flex items-center justify-center text-apple-body font-semibold text-[color:var(--app-foreground)] dark:text-white border border-[color:var(--app-border)] dark:border-white/20">
                {userName?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-apple-green-500 rounded-full border-2 border-[color:var(--app-bg)] dark:border-black" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-apple-body font-medium text-[color:var(--app-foreground)] dark:text-white truncate">{userName || 'Usuario'}</div>
              <div className="text-apple-caption text-apple-gray-500 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-apple-green-400 animate-pulse" />
                En línea
              </div>
            </div>
          </motion.div>

          <LogoutButton className="w-full btn-ghost justify-start gap-3 text-apple-gray-500 hover:text-[color:var(--app-foreground)] dark:hover:text-white hover:bg-[color:var(--hover-surface)] dark:hover:bg-apple-red-600/10 hover:border-[color:var(--app-border-strong)] dark:hover:border-apple-red-500/30">
            <LogOut size={18} />
            <span>Cerrar sesión</span>
          </LogoutButton>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
};
