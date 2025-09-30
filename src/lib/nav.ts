// src/lib/nav.ts
import type { ReactNode } from 'react';

export type Role = 'admin' | 'coordinador' | 'lider' | 'asesor' | 'promotor' | 'unknown';
export type Cap =
  | 'view:dashboard'
  | 'view:reportes:ventas-asesores'
  | 'view:reportes:ventas-promotores'
  | 'view:reportes:asistencia'
  | 'view:logistica'
  | 'view:captura:asesores'
  | 'view:captura:promotores'
  | 'view:devoluciones'
  | 'view:asistencia:marcar'
  | 'view:asistencia:mi-resumen'
  | 'view:asistencia:resumen'       // resumen sucursal o global
  | 'view:admin:usuarios'
  | 'view:admin:sucursales'
  | 'view:admin:asistencia:resumen' // gerencial global
  | 'view:playbook';

export const ROLE_CAPS: Record<Role, Cap[]> = {
  admin: [
    'view:dashboard',
    'view:reportes:ventas-asesores',
    'view:reportes:ventas-promotores',
    'view:reportes:asistencia',
    'view:logistica',
    'view:captura:asesores',
    'view:captura:promotores',
    'view:devoluciones',
    'view:asistencia:marcar',
    'view:asistencia:mi-resumen',
    'view:asistencia:resumen',
    'view:admin:usuarios',
    'view:admin:sucursales',
    'view:admin:asistencia:resumen',
    'view:playbook',
  ],
  coordinador: [
    'view:dashboard',
    'view:logistica',
    'view:asistencia:marcar',
    'view:asistencia:mi-resumen',
    'view:reportes:asistencia',
    'view:playbook',
  ],
  lider: [
    'view:dashboard',
    'view:logistica',
    'view:reportes:ventas-asesores',
    'view:reportes:asistencia',
    'view:asistencia:marcar',
    'view:asistencia:mi-resumen',
    'view:asistencia:resumen',
    'view:playbook',
  ],
  asesor: [
    'view:dashboard',
    'view:captura:asesores',
    'view:devoluciones',
    'view:asistencia:marcar',
    'view:asistencia:mi-resumen',
    'view:playbook',
  ],
  promotor: [
    'view:dashboard',
    'view:captura:promotores',
    'view:playbook',
  ],
  unknown: [],
};

export type LinkItem = { cap: Cap; href: string; label: string; icon?: ReactNode; shortcut?: string };
export type Section = { title: string; links: LinkItem[] };

export const NAV_SECTIONS: Section[] = [
  {
    title: 'Análisis y Reportes',
    links: [
      { cap: 'view:reportes:ventas-asesores',     href: '/reportes/ventas-asesores', label: 'Ventas Asesores', shortcut: '2' },
      { cap: 'view:reportes:ventas-promotores',   href: '/reportes/ventas-promotores', label: 'Ventas Promotores', shortcut: '7' },
      { cap: 'view:reportes:asistencia',          href: '/reportes/asistencia', label: 'Reporte Asistencia', shortcut: 'R' },
    ],
  },
  {
    title: 'Operaciones',
    links: [
      { cap: 'view:logistica',           href: '/logistica',              label: 'Logística', shortcut: '1' },
      { cap: 'view:captura:asesores',    href: '/captura/asesores',       label: 'Captura Asesores', shortcut: '6' },
      { cap: 'view:captura:promotores',  href: '/captura/promotores',     label: 'Captura Promotores' },
      { cap: 'view:devoluciones',        href: '/devoluciones',           label: 'Devoluciones', shortcut: '4' },
    ],
  },
  {
    title: 'Asistencia',
    links: [
      { cap: 'view:asistencia:marcar',   href: '/asistencia/marcar',      label: 'Marcar asistencia', shortcut: 'A' },
      { cap: 'view:asistencia:mi-resumen', href: '/asistencia/mi-resumen', label: 'Mi resumen' },
      { cap: 'view:asistencia:resumen',  href: '/asistencia/resumen',     label: 'Resumen de Sucursal' },
    ],
  },
  {
    title: 'Administración',
    links: [
      { cap: 'view:playbook',                     href: '/dashboard/asesores/playbook-whatsapp', label: 'Central Operativa', shortcut: '5' },
      { cap: 'view:admin:asistencia:resumen',     href: '/admin/asistencia/resumen',     label: 'Resumen Asistencia (Gerencia)' },
      { cap: 'view:admin:usuarios',               href: '/admin/usuarios',               label: 'Usuarios', shortcut: '8' },
      { cap: 'view:admin:sucursales',             href: '/admin/sucursales',             label: 'Sucursales' },
    ],
  },
];

// Utilidad
export const can = (role: Role, cap: Cap) => (ROLE_CAPS[role] ?? []).includes(cap);
