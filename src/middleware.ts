// src/middleware.ts
import { NextResponse, NextRequest } from 'next/server';

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

// Decodifica el payload del JWT de la cookie (sin verificación criptográfica)
function readRoleFromCookie(req: NextRequest): string | null {
  const raw = req.cookies.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const parts = raw.split('.');
  if (parts.length < 2) return null;
  try {
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

  // Dejar pasar público y assets
  if (isPublic(pathname) || isStaticAsset(pathname)) return NextResponse.next();

  // Requiere sesión (cookie)
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectTo', pathname + (req.nextUrl.search || ''));
    return NextResponse.redirect(url);
  }

  // RBAC básico por rol
  const role = readRoleFromCookie(req);

  // PROMOTOR → /promotores/registro
  if (role === 'PROMOTOR' && !pathname.startsWith('/promotores/registro')) {
    const url = req.nextUrl.clone();
    url.pathname = '/promotores/registro';
    url.searchParams.delete('redirectTo');
    return NextResponse.redirect(url);
  }

  // ASESOR → /asesoras
  if (role === 'ASESOR' && !pathname.startsWith('/asesoras')) {
    const url = req.nextUrl.clone();
    url.pathname = '/asesoras';
    url.searchParams.delete('redirectTo');
    return NextResponse.redirect(url);
  }

  // Otros roles: pasan (admin, gerencia, coordinador, líder, etc.)
  return NextResponse.next();
}

// Aplica a todo salvo estáticos internos
export const config = {
  matcher:
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json).*)',
};