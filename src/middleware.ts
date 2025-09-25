// src/middleware.ts — HS256 portable para Node/Edge/Vercel (usa Uint8Array)
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { authEnv } from '@/lib/auth/env';
import { normalizeRole, getRoleHomeRoute, canAccessRoute } from '@/lib/auth/roles';

const { sessionCookieName: SESSION_COOKIE, jwtSecret: JWT_SECRET } = authEnv;

const PUBLIC_PREFIXES = [
  '/login',
  '/post-login',          // deja pública la página de transición post-login
  '/endpoints/auth',
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

const FINANCIAL_ALLOW_IDS = new Set<string>([
  '32c53c5d-cf04-425c-a50d-4c016df61d7f',
  'c23ba0b8-d289-4a0e-94f1-fc4b7a7fb88d',
  '07b93705-f631-4b67-b52a-f7c30bc2ba5b',
  '28b63f71-babb-4ee0-8c2a-8530007735b7',
]);

const enc = new TextEncoder();

function isPublic(pathname: string): boolean {
  if (STATIC_FILE_REGEX.test(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));
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

/** Verificación HS256 usando copias `Uint8Array` (evita problemas de BufferSource por realm) */
type JwtPayload = Record<string, unknown>;

async function verifyJWT_HS256(token: string | null | undefined): Promise<JwtPayload | null> {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [h64, p64, s64] = parts;

  let header: JwtPayload | null;
  let payload: JwtPayload | null;
  try {
    header = JSON.parse(bytesToString(b64urlToBytes(h64))) as JwtPayload;
    payload = JSON.parse(bytesToString(b64urlToBytes(p64))) as JwtPayload;
  } catch {
    return null;
  }
  const alg = typeof header?.alg === 'string' ? header.alg : null;
  const typ = typeof header?.typ === 'string' ? header.typ : null;
  if (alg !== 'HS256' || typ !== 'JWT') return null;

  try {
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(JWT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    // 👇 Copias nuevas de tipo Uint8Array (brand seguro)
    const dataU8 = new Uint8Array(enc.encode(`${h64}.${p64}`));
    const sigU8  = new Uint8Array(b64urlToBytes(s64));

    const ok = await crypto.subtle.verify(
      { name: 'HMAC', hash: 'SHA-256' },
      key,
      sigU8,   // signature: BufferSource
      dataU8   // data: BufferSource
    );
    if (!ok) return null;

    const exp = typeof payload?.exp === 'number' ? payload.exp : null;
    if (exp !== null) {
      const nowSec = Math.floor(Date.now() / 1000);
      if (nowSec >= exp) return null;
    }

    return payload;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[middleware verify error]', error);
    }
    return null;
  }
}

function noStore(res: NextResponse) {
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.headers.set('Pragma', 'no-cache');
  res.headers.set('Expires', '0');
  return res;
}

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

  const payloadRole = typeof payload.role === 'string' ? payload.role : null;
  const payloadSub = typeof payload.sub === 'string' ? payload.sub : null;

  if (pathname === '/') {
    const url = req.nextUrl.clone();
    url.pathname = getRoleHomeRoute(normalizeRole(payloadRole));
    return noStore(NextResponse.redirect(url));
  }

  if (pathname.startsWith('/dashboard/financial-control')) {
    if (!payloadSub || !FINANCIAL_ALLOW_IDS.has(payloadSub)) {
      const url = req.nextUrl.clone();
      url.pathname = '/dashboard';
      return noStore(NextResponse.redirect(url));
    }
  }

  if (isApi) {
    return noStore(NextResponse.next());
  }

  const role = normalizeRole(payloadRole);
  if (!canAccessRoute(role, pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = getRoleHomeRoute(role);
    url.searchParams.delete('redirectTo');
    return noStore(NextResponse.redirect(url));
  }

  return noStore(NextResponse.next());
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json).*)',
};