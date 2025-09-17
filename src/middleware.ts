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

// ====== ALLOWLISTS (⚠️ sin "/") ======
const ASESOR_ALLOW: RegExp[] = [
  /^\/dashboard\/asesores\/HOME(?:\/.*)?$/,
  /^\/dashboard\/asesores\/registro(?:\/.*)?$/,
  /^\/dashboard\/asesores\/devoluciones(?:\/.*)?$/,
  /^\/dashboard\/asesores\/playbook-whatsapp(?:\/.*)?$/,
  /^\/asistencia(?:\/.*)?$/,
  /^\/mi\/resumen(?:\/.*)?$/,
];

const PROMOTOR_ALLOW: RegExp[] = [
  /^\/dashboard\/promotores(?:\/.*)?$/,
  /^\/dashboard\/promotores\/registro(?:\/.*)?$/,
];

function b64urlToJSON(b64url: string): any | null {
  try {
    const pad = '='.repeat((4 - (b64url.length % 4)) % 4);
    const b64 = (b64url + pad).replace(/-/g, '+').replace(/_/g, '/');
    const jsonStr = Buffer.from(b64, 'base64').toString('utf8');
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

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (req.method === 'OPTIONS' || isPublic(pathname) || isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value);

  // Endpoints
  if (pathname.startsWith('/endpoints/')) {
    if (!hasSession) {
      return NextResponse.json({ ok:false, error:'no_session' }, { status:401 });
    }
    const res = NextResponse.next();
    res.headers.set('Cache-Control','no-store, no-cache, must-revalidate, proxy-revalidate');
    res.headers.set('Pragma','no-cache'); res.headers.set('Expires','0');
    return res;
  }

  // Sin sesión → a /login
  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectTo', pathname + (req.nextUrl.search || ''));
    const res = NextResponse.redirect(url);
    res.headers.set('Cache-Control','no-store');
    return res;
  }

  // Con sesión en "/" → redirige según rol (✅ evita ver landing vieja)
  if (pathname === '/') {
    const role = readRoleFromCookie(req);
    const url = req.nextUrl.clone();
    if (role === 'PROMOTOR' || role === 'PROMOTORA') {
      url.pathname = '/dashboard/promotores';
    } else if (role === 'ASESOR' || role === 'VENDEDOR' || role === 'VENDEDORA') {
      url.pathname = '/dashboard/asesores/HOME';
    } else {
      // admin/líder/coordinador/logística: ajusta si tienes home específica
      url.pathname = '/dashboard';
    }
    const res = NextResponse.redirect(url);
    res.headers.set('Cache-Control','no-store');
    return res;
  }

  // Reglas por rol en otras rutas
  const role = readRoleFromCookie(req);

  if (role === 'PROMOTOR' || role === 'PROMOTORA') {
    const allowed = PROMOTOR_ALLOW.some((rx) => rx.test(pathname));
    if (!allowed) {
      const url = req.nextUrl.clone();
      url.pathname = '/dashboard/promotores';
      url.searchParams.delete('redirectTo');
      const res = NextResponse.redirect(url);
      res.headers.set('Cache-Control','no-store');
      return res;
    }
  }

  if (role === 'ASESOR' || role === 'VENDEDOR' || role === 'VENDEDORA') {
    const allowed = ASESOR_ALLOW.some((rx) => rx.test(pathname));
    if (!allowed) {
      const url = req.nextUrl.clone();
      url.pathname = '/dashboard/asesores/HOME';
      url.searchParams.delete('redirectTo');
      const res = NextResponse.redirect(url);
      res.headers.set('Cache-Control','no-store');
      return res;
    }
  }

  // Admin / líder / coordinador / logística → pasa
  const res = NextResponse.next();
  res.headers.set('Cache-Control','no-store, no-cache, must-revalidate, proxy-revalidate');
  res.headers.set('Pragma','no-cache'); res.headers.set('Expires','0');
  return res;
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json).*)',
};