// src/middleware.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME || 'fenix_session';

/** Rutas públicas (sin sesión) */
const PUBLIC_PREFIXES = [
  '/login',
  '/endpoints/auth',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
  '/manifest.json',
  '/_next',     // assets Next
  '/public',    // estáticos propios
];

/** Extensiones de archivos estáticos */
const STATIC_EXTS = new Set([
  'png','jpg','jpeg','webp','svg','gif','ico',
  'css','js','map','txt','woff','woff2','ttf','otf',
  'mp4','webm',
]);

function isPublic(pathname: string) {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));
}
function isStaticAsset(pathname: string) {
  const idx = pathname.lastIndexOf('.');
  if (idx === -1) return false;
  const ext = pathname.slice(idx + 1).toLowerCase();
  return STATIC_EXTS.has(ext);
}

/* =========================
   Allowlists por rol
   ========================= */

/** ASESOR: captura asesores, devoluciones (si aplica), asistencia personal */
const ASESOR_ALLOW: RegExp[] = [
  /^\/asesoras(?:\/.*)?$/,                    // legacy/alias si lo usas
  /^\/dashboard\/Asesores(?:\/.*)?$/,         // legacy
  /^\/dashboard\/captura(?:\/.*)?$/,          // legacy
  /^\/captura\/asesores(?:\/.*)?$/,           // nueva ruta
  /^\/devoluciones(?:\/.*)?$/,                // módulo devoluciones
  /^\/asistencia(?:\/.*)?$/,                  // marcar + mi-resumen
  /^\/playbook(?:\/.*)?$/,
  /^\/$/,                                     // home
];

/** PROMOTOR: solo captura promotores + playbook (sin asistencia) */
const PROMOTOR_ALLOW: RegExp[] = [
  /^\/dashboard\/promotores(?:\/.*)?$/,       // legacy
  /^\/captura\/promotores(?:\/.*)?$/,         // nueva ruta
  /^\/playbook(?:\/.*)?$/,
  /^\/$/,                                     // home
];

/* =========================
   Decodificación JWT (Edge-safe)
   ========================= */
function b64urlToJSON(b64url: string): any | null {
  try {
    const pad = '='.repeat((4 - (b64url.length % 4)) % 4);
    const b64 = (b64url + pad).replace(/-/g, '+').replace(/_/g, '/');
    const jsonStr = atob(b64); // Edge runtime: atob disponible
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

function readRoleFromCookie(req: NextRequest): string | null {
  const raw = req.cookies.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const parts = raw.split('.');
  if (parts.length < 2) return null;
  const payload = b64urlToJSON(parts[1]);
  const r = payload?.role ?? payload?.rol ?? payload?.r;
  return r ? String(r).toUpperCase() : null;
}

/* =========================
   Middleware principal
   ========================= */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Preflight / públicos / estáticos
  if (req.method === 'OPTIONS' || isPublic(pathname) || isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value);

  // Endpoints server: requieren sesión
  if (pathname.startsWith('/endpoints/')) {
    if (!hasSession) return NextResponse.json({ ok: false, error: 'no_session' }, { status: 401 });
    return NextResponse.next();
  }

  // Si no hay sesión → /login
  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectTo', pathname + (req.nextUrl.search || ''));
    return NextResponse.redirect(url);
  }

  // Con sesión: control por rol
  const role = readRoleFromCookie(req);

  if (role === 'PROMOTOR' || role === 'PROMOTORA') {
    const allowed = PROMOTOR_ALLOW.some((rx) => rx.test(pathname));
    if (!allowed) {
      const url = req.nextUrl.clone();
      url.pathname = '/dashboard/promotores'; // aterrizaje promotor
      url.searchParams.delete('redirectTo');
      return NextResponse.redirect(url);
    }
  }

  if (role === 'ASESOR' || role === 'VENDEDOR' || role === 'VENDEDORA') {
    const allowed = ASESOR_ALLOW.some((rx) => rx.test(pathname));
    if (!allowed) {
      const url = req.nextUrl.clone();
      // Aterrizaje asesor: si ya usas /captura/asesores, puedes cambiarlo aquí
      url.pathname = '/captura/asesores';
      url.searchParams.delete('redirectTo');
      return NextResponse.redirect(url);
    }
  }

  // Otros roles (admin, líder, coordinador, etc.) pasan libre
  return NextResponse.next();
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json).*)',
};