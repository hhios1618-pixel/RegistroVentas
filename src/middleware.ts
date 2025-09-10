// src/middleware.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME || 'fenix_session';

// Público + estáticos + endpoints de auth
const PUBLIC_PREFIXES = [
  '/login',
  '/endpoints/auth',     // login/logout/resolve-email/basic-login
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
  '/manifest.json',
  '/_next',
  '/public',
];

function isPublic(pathname: string) {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));
}

function isStaticAsset(pathname: string) {
  const ext = pathname.split('.').pop();
  return (
    !!ext &&
    [
      'png','jpg','jpeg','webp','svg','gif','ico',
      'css','js','map','txt','woff','woff2','ttf','otf',
      'mp4','webm',
    ].includes(ext)
  );
}

// ✅ ALLOWLIST para el rol ASESOR
const ASESOR_ALLOW: RegExp[] = [
  /^\/asesoras(?:\/.*)?$/,              // módulo asesoras
  /^\/playbook-whatsapp(?:\/.*)?$/,     // playbook
  /^\/asistencia(?:\/.*)?$/,            // asistencia
  /^\/dashboard\/captura(?:\/.*)?$/,    // captura
  /^\/dashboard\/devoluciones(?:\/.*)?$/,// devoluciones
];

// Decodifica el payload del JWT (sin verificación) para leer el rol
function readRoleFromCookie(req: NextRequest): string | null {
  const raw = req.cookies.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const parts = raw.split('.');
  if (parts.length < 2) return null;
  try {
    // Nota: si en algún entorno Edge no hay Buffer, cambia por atob() equivalente.
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
    const r = json?.role || json?.rol || json?.r;
    return r ? String(r).toUpperCase() : null;
  } catch {
    return null;
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Deja pasar público, assets y preflight
  if (req.method === 'OPTIONS' || isPublic(pathname) || isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const hasSession = Boolean(token);

  // 1) Endpoints internos: NO redirigir nunca. Responder JSON 401 si falta sesión.
  if (pathname.startsWith('/endpoints/')) {
    if (!hasSession) {
      return NextResponse.json({ ok: false, error: 'no_session' }, { status: 401 });
    }
    // (si quieres, puedes aplicar RBAC por endpoint aquí con readRoleFromCookie)
    return NextResponse.next();
  }

  // 2) Páginas: si no hay sesión => redirect a /login
  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectTo', pathname + (req.nextUrl.search || ''));
    return NextResponse.redirect(url);
  }

  // 3) RBAC básico SOLO para páginas (no afecta endpoints)
  const role = readRoleFromCookie(req);

  // PROMOTOR → /promotores/registro (como ya tenías)
  if (role === 'PROMOTOR' && !pathname.startsWith('/promotores/registro')) {
    const url = req.nextUrl.clone();
    url.pathname = '/promotores/registro';
    url.searchParams.delete('redirectTo');
    return NextResponse.redirect(url);
  }

  // 🔓 ASESOR → allowlist explícita
  if (role === 'ASESOR') {
    const allowed = ASESOR_ALLOW.some((rx) => rx.test(pathname));
    if (!allowed) {
      const url = req.nextUrl.clone();
      url.pathname = '/asesoras';
      url.searchParams.delete('redirectTo');
      return NextResponse.redirect(url);
    }
  }

  // Otros roles: pasan (admin, gerencia, coordinador, líder, etc.)
  return NextResponse.next();
}

// Aplica a todo salvo estáticos internos
export const config = {
  matcher:
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json).*)',
};