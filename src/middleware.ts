// middleware.ts
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

// ✅ IDs (people.id) autorizados para el panel financiero
const FINANCIAL_ALLOW_IDS = new Set([
  '32c53c5d-cf04-425c-a50d-4c016df61d7f', // Rolando Arispe (ronaldo.arispe_32c5)
  'c23ba0b8-d289-4a0e-94f1-fc4b7a7fb88d', // Hugo Hormazabal (hugo.hormazabal_c23b)
  '07b93705-f631-4b67-b52a-f7c30bc2ba5b', // Julieta Rosas (julieta.rosas_07b9)
  '28b63f71-babb-4ee0-8c2a-8530007735b7', // Daniela Vasquez (daniela.vasquez_28b6)
]);

// Rutas permitidas por rol (regex)
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

// ---------- utils ----------
function isPublic(pathname: string) {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));
}

// Edge-safe base64url decode → JSON
function b64urlToJSON(b64url: string): any | null {
  try {
    const pad = '='.repeat((4 - (b64url.length % 4)) % 4);
    const b64 = (b64url + pad).replace(/-/g, '+').replace(/_/g, '/');
    // atob existe en runtime Edge; si no, usamos TextDecoder como fallback
    let jsonStr: string;
    if (typeof atob === 'function') {
      // decodeURIComponent/escape maneja unicode correctamente
      jsonStr = decodeURIComponent(escape(atob(b64)));
    } else {
      const bin = Uint8Array.from(
        Buffer.from(b64, 'base64'),
        (c) => c
      );
      jsonStr = new TextDecoder().decode(bin);
    }
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

function readPayload(req: NextRequest): any | null {
  const raw = req.cookies.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const parts = raw.split('.');
  if (parts.length < 2) return null;
  return b64urlToJSON(parts[1]);
}

function readRoleFromCookie(req: NextRequest): string | null {
  const payload = readPayload(req);
  const r = payload?.role ?? payload?.rol ?? payload?.r;
  return r ? String(r).toUpperCase() : null;
}

function readUserIdFromCookie(req: NextRequest): string | null {
  const p = readPayload(req);
  return p?.sub ? String(p.sub) : null; // sub = people.id
}

// ---------- middleware ----------
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // públicos / preflight
  if (req.method === 'OPTIONS' || isPublic(pathname)) {
    return NextResponse.next();
  }

  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value);

  // endpoints (requieren sesión)
  if (pathname.startsWith('/endpoints/')) {
    if (!hasSession) {
      return NextResponse.json({ ok: false, error: 'no_session' }, { status: 401 });
    }
    const res = NextResponse.next();
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.headers.set('Pragma', 'no-cache');
    res.headers.set('Expires', '0');
    return res;
  }

  // sin sesión -> login
  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectTo', pathname + (req.nextUrl.search || ''));
    const res = NextResponse.redirect(url);
    res.headers.set('Cache-Control', 'no-store');
    return res;
  }

  // con sesión en "/" -> redirige por rol
  if (pathname === '/') {
    const role = readRoleFromCookie(req);
    const url = req.nextUrl.clone();
    if (role === 'PROMOTOR' || role === 'PROMOTORA') {
      url.pathname = '/dashboard/promotores';
    } else if (role === 'ASESOR' || role === 'VENDEDOR' || role === 'VENDEDORA') {
      url.pathname = '/dashboard/asesores/HOME';
    } else {
      url.pathname = '/dashboard';
    }
    const res = NextResponse.redirect(url);
    res.headers.set('Cache-Control', 'no-store');
    return res;
  }

  // 🔐 Gate duro por people.id para /dashboard/financial-control
  if (pathname.startsWith('/dashboard/financial-control')) {
    const uid = readUserIdFromCookie(req); // payload.sub
    if (!uid || !FINANCIAL_ALLOW_IDS.has(uid)) {
      const url = req.nextUrl.clone();
      url.pathname = '/dashboard';
      const res = NextResponse.redirect(url);
      res.headers.set('Cache-Control', 'no-store');
      return res;
    }
  }

  // Reglas por rol
  const role = readRoleFromCookie(req);

  if (role === 'PROMOTOR' || role === 'PROMOTORA') {
    const allowed = PROMOTOR_ALLOW.some((rx) => rx.test(pathname));
    if (!allowed) {
      const url = req.nextUrl.clone();
      url.pathname = '/dashboard/promotores';
      url.searchParams.delete('redirectTo');
      const res = NextResponse.redirect(url);
      res.headers.set('Cache-Control', 'no-store');
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
      res.headers.set('Cache-Control', 'no-store');
      return res;
    }
  }

  // admin / líder / coordinador / logística → pasa
  const res = NextResponse.next();
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.headers.set('Pragma', 'no-cache');
  res.headers.set('Expires', '0');
  return res;
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json).*)',
};