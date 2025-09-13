// src/middleware.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME || 'fenix_session';

const PUBLIC_PREFIXES = [
  '/login',
  '/endpoints/auth',
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
  return !!ext && [
    'png','jpg','jpeg','webp','svg','gif','ico',
    'css','js','map','txt','woff','woff2','ttf','otf',
    'mp4','webm',
  ].includes(ext);
}

// ✅ Allowlists
const ASESOR_ALLOW: RegExp[] = [
  /^\/asesoras(?:\/.*)?$/,
  /^\/playbook-whatsapp(?:\/.*)?$/,
  /^\/asistencia(?:\/.*)?$/,
  /^\/dashboard\/captura(?:\/.*)?$/,
  /^\/dashboard\/devoluciones(?:\/.*)?$/,
];

// --- LISTA CORREGIDA PARA PROMOTOR ---
const PROMOTOR_ALLOW: RegExp[] = [
  /^\/dashboard\/promotores(?:\/.*)?$/, // <-- RUTA NUEVA Y CORRECTA
  /^\/dashboard\/registro(?:\/.*)?$/,   // Mantenemos esta como la ruta oficial de registro
  /^\/dashboard\/captura(?:\/.*)?$/,
  /^\/playbook-whatsapp(?:\/.*)?$/,
  /^\/dashboard\/usuarios(?:\/.*)?$/,
  /^\/$/,
];

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

  if (req.method === 'OPTIONS' || isPublic(pathname) || isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value);

  if (pathname.startsWith('/endpoints/')) {
    if (!hasSession) return NextResponse.json({ ok:false, error:'no_session' }, { status:401 });
    return NextResponse.next();
  }

  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectTo', pathname + (req.nextUrl.search || ''));
    return NextResponse.redirect(url);
  }

  const role = readRoleFromCookie(req);

  if (role === 'PROMOTOR' || role === 'PROMOTORA') {
    const allowed = PROMOTOR_ALLOW.some((rx) => rx.test(pathname));
    if (!allowed) {
      const url = req.nextUrl.clone();
      // --- REDIRECCIÓN CORREGIDA ---
      url.pathname = '/dashboard/promotores'; // Redirigir a la nueva página de resumen
      url.searchParams.delete('redirectTo');
      return NextResponse.redirect(url);
    }
  }

  if (role === 'ASESOR' || role === 'VENDEDOR' || role === 'VENDEDORA') {
    const allowed = ASESOR_ALLOW.some((rx) => rx.test(pathname));
    if (!allowed) {
      const url = req.nextUrl.clone();
      url.pathname = '/asesoras';
      url.searchParams.delete('redirectTo');
      return NextResponse.redirect(url);
    }
  }

  // Los roles como GERENCIA/admin no entran en los 'if' anteriores y pasan directamente
  return NextResponse.next();
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json).*)',
};