// src/components/nav/roles.ts
export const ROUTES = {
  DASH: '/dashboard', // ← único cambio

  // Análisis / Reportes
  SALES_REPORT: '/dashboard/sales-report',
  REPORTE_VENDEDORES: '/dashboard/vendedores',         // ✅ vendedores (asesores)
  REPORTE_PROMOTORES: '/dashboard/promotores/admin',    // ✅ promotores
  ASISTENCIA_PANEL: '/dashboard/admin/resumen',         // ✅ asistencia

  // Operación
  REGISTRO_ASESORES: '/dashboard/asesores/registro',
  REGISTRO_PROMOTORES: '/dashboard/promotores/registro',
  DEVOLUCIONES: '/dashboard/asesores/devoluciones',
  ASISTENCIA: '/asistencia',
  LOGISTICA: '/logistica',
  MI_RESUMEN: '/mi/resumen',
  PLAYBOOK: '/dashboard/asesores/playbook-whatsapp',
  USERS_ADMIN: '/dashboard/admin/usuarios',
} as const;

export type Role =
  | 'admin' | 'promotor' | 'coordinador' | 'lider' | 'asesor' | 'unknown';

export type Cap =
  | 'view:kpis'
  | 'view:sales-report'
  | 'view:resumen-asesores'
  | 'view:resumen-promotores'
  | 'view:reporte-asistencia'
  | 'view:logistica'
  | 'view:registro-asesores'
  | 'view:registro-promotores'
  | 'view:devoluciones'
  | 'view:asistencia'
  | 'view:playbook'
  | 'view:users-admin'
  | 'view:mi-resumen';

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
    'view:kpis','view:resumen-asesores','view:resumen-promotores','view:reporte-asistencia','view:logistica',
    'view:asistencia','view:sales-report','view:playbook'
  ],
  asesor: [
    'view:resumen-asesores','view:registro-asesores','view:asistencia','view:playbook','view:mi-resumen'
  ],
  promotor: [
    'view:registro-promotores','view:mi-resumen'
  ],
  unknown: [],
};

export const can = (role: Role, cap: Cap) => (ROLE_CAPS[role] ?? []).includes(cap);

export const normalizeRole = (raw?: string): Role => {
  const r = (raw || '').trim().toUpperCase();
  if (['GERENCIA','ADMIN','ADMINISTRADOR'].includes(r)) return 'admin';
  if (['PROMOTOR','PROMOTORA'].includes(r)) return 'promotor';
  if (['COORDINADOR','COORDINADORA','COORDINACION'].includes(r)) return 'coordinador';
  if (['LIDER','JEFE','SUPERVISOR'].includes(r)) return 'lider';
  if (['ASESOR','VENDEDOR','VENDEDORA'].includes(r)) return 'asesor';
  return 'unknown';
};