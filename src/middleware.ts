// src/middleware.ts — VERSIÓN FINAL (Edge-safe HS256 con DataView)
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { authEnv } from '@/lib/auth/env';

/* ==========================
   Config
   ========================== */
const { sessionCookieName: SESSION_COOKIE, jwtSecret: JWT_SECRET } = authEnv;

const PUBLIC_PREFIXES = [
  '/login',
  '/endpoints/auth', // login/logout
  '/favicon.ico',
  '/icon.svg',
  '/1.mp4',
  '/robots.txt',
  '/sitemap.xml',
  '/manifest.json',
  '/_next',
  '/public',
];

const STATIC_FILE_REGEX = /\.(?:png|jpg|jpeg|gif|svg|webp|ico|mp4|webm|txt|json)$/i;

/** IDs autorizados para el panel financiero (mover a DB cuando quieras) */
const FINANCIAL_ALLOW_IDS = new Set<string>([
  '32c53c5d-cf04-425c-a50d-4c016df61d7f',
  'c23ba0b8-d289-4a0e-94f1-fc4b7a7fb88d',
  '07b93705-f631-4b67-b52a-f7c30bc2ba5b',
  '28b63f71-babb-4ee0-8c2a-8530007735b7',
]);

/** Allowlist de prefijos por rol */
const ROLE_ROUTES: Record<string, string[]> = {
  ADMIN: ['/dashboard'],
  COORDINADOR: ['/dashboard', '/logistica', '/asistencia'],
  LIDER: ['/dashboard', '/asistencia'],
  ASESOR: ['/dashboard/asesores', '/asistencia', '/mi/resumen'],
  VENDEDOR: ['/dashboard/asesores', '/asistencia', '/mi/resumen'],
  VENDEDORA: ['/dashboard/asesores', '/asistencia', '/mi/resumen'],
  PROMOTOR: ['/dashboard/promotores', '/mi/resumen'],
  PROMOTORA: ['/dashboard/promotores', '/mi/resumen'],
};

/** Ruta home por rol */
const ROLE_HOME: Record<string, string> = {
  ADMIN: '/dashboard',
  COORDINADOR: '/logistica',
  LIDER: '/dashboard/vendedores',
  ASESOR: '/dashboard/asesores/HOME',
  VENDEDOR: '/dashboard/asesores/HOME',
  VENDEDORA: '/dashboard/asesores/HOME',
  PROMOTOR: '/dashboard/promotores',
  PROMOTORA: '/dashboard/promotores',
};

/* ==========================
   Helpers (Edge-safe)
   ========================== */
const enc = new TextEncoder();

function isPublic(pathname: string): boolean {
  if (STATIC_FILE_REGEX.test(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix));
}

function b64urlToBytes(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(b64url.length / 4) * 4, '=');
  const binary = atob(b64);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
  return arr;
}

function bytesToString(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) out += String.fromCharCode(bytes[i]);
  return out;
}

/** Verificación HS256 en Edge/Node (WebCrypto) */
async function verifyJWT_HS256(token: string | null | undefined): Promise<any | null> {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [h64, p64, s64] = parts;

  let header: any;
  let payload: any;
  try {
    header = JSON.parse(bytesToString(b64urlToBytes(h64)));
    payload = JSON.parse(bytesToString(b64urlToBytes(p64)));
  } catch {
    return null;
  }
  if (!header || header.alg !== 'HS256' || header.typ !== 'JWT') return null;

  try {
    // 1) Importar clave HS256
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(JWT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );

    // 2) Preparar BufferSource como DataView (válido en todos los runtimes webcrypto)
    const dataBytes = enc.encode(`${h64}.${p64}`);
    const sigBytes  = b64urlToBytes(s64);

    const dataView = new DataView(
      dataBytes.buffer,
      dataBytes.byteOffset,
      dataBytes.byteLength
    );
    const sigView = new DataView(
      sigBytes.buffer,
      sigBytes.byteOffset,
      sigBytes.byteLength
    );

    // 3) Verificar firma
    const ok = await crypto.subtle.verify(
      { name: 'HMAC', hash: 'SHA-256' },
      key,
      sigView,   // signature: BufferSource
      dataView   // data: BufferSource
    );
    if (!ok) return null;

    // 4) Expiración
    if (typeof payload.exp === 'number') {
      const nowSec = Math.floor(Date.now() / 1000);
      if (nowSec >= payload.exp) return null;
    }

    return payload;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[middleware verify error]', error);
    }
    return null;
  }
}

function isRouteAllowed(roleRaw: string | null | undefined, pathname: string): boolean {
  const role = String(roleRaw || '').toUpperCase();
  if (role === 'ADMIN') return true;
  const allow = ROLE_ROUTES[role] || [];
  return allow.some((prefix) => pathname.startsWith(prefix));
}

function getRoleHome(roleRaw: string | null | undefined): string {
  const role = String(roleRaw || '').toUpperCase();
  return ROLE_HOME[role] || '/dashboard';
}

function noStore(res: NextResponse) {
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.headers.set('Pragma', 'no-cache');
  res.headers.set('Expires', '0');
  return res;
}

/* ==========================
   Middleware
   ========================== */
export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const isApi = pathname.startsWith('/endpoints/');

  if (req.method === 'OPTIONS' || isPublic(pathname)) {
    return NextResponse.next();
  }

  const sessionCookie = req.cookies.get(SESSION_COOKIE)?.value ?? null;

  if (!sessionCookie) {
    if (isApi) {
      return NextResponse.json({ ok: false, error: 'no_session' }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectTo', pathname + (search || ''));
    return noStore(NextResponse.redirect(url));
  }

  const payload = await verifyJWT_HS256(sessionCookie);
  if (!payload) {
    if (isApi) {
      return NextResponse.json({ ok: false, error: 'invalid_token' }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    const res = NextResponse.redirect(url);
    res.cookies.set({
      name: SESSION_COOKIE,
      value: '',
      path: '/',
      maxAge: 0,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    return noStore(res);
  }

  if (pathname === '/') {
    const url = req.nextUrl.clone();
    url.pathname = getRoleHome(payload.role);
    return noStore(NextResponse.redirect(url));
  }

  if (pathname.startsWith('/dashboard/financial-control')) {
    const uid = payload.sub as string | undefined;
    if (!uid || !FINANCIAL_ALLOW_IDS.has(uid)) {
      const url = req.nextUrl.clone();
      url.pathname = '/dashboard';
      return noStore(NextResponse.redirect(url));
    }
  }

  if (!isRouteAllowed(payload.role, pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = getRoleHome(payload.role);
    url.searchParams.delete('redirectTo');
    return noStore(NextResponse.redirect(url));
  }

  return noStore(NextResponse.next());
}

export const config = {
  matcher:
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json).*)',
};
