// src/components/nav/roles.ts — shim para no romper imports antiguos
export {
  normalizeRole,
  getRoleHomeRoute,
  canAccessRoute,
  type Role
} from '@/lib/auth/roles';