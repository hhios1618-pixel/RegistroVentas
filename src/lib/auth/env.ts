// src/lib/auth/env.ts

/**
 * Configuración compartida para autenticación (Node y Middleware)
 */
const RAW_JWT_SECRET =
  process.env.JWT_SECRET ||
  process.env.NEXT_PUBLIC_JWT_SECRET ||
  'dev-secret';

const RAW_SESSION_COOKIE = process.env.SESSION_COOKIE_NAME || 'fenix_session';
const RAW_SESSION_DAYS = Number(process.env.SESSION_DAYS || '30');

export const authEnv = {
  jwtSecret: RAW_JWT_SECRET,
  sessionCookieName: RAW_SESSION_COOKIE,
  sessionDays: Number.isFinite(RAW_SESSION_DAYS) ? RAW_SESSION_DAYS : 30,
  usingFallbackSecret: !process.env.JWT_SECRET && !process.env.NEXT_PUBLIC_JWT_SECRET,
} as const;

if (authEnv.usingFallbackSecret && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET no está definido. Configúralo antes de desplegar.');
}

