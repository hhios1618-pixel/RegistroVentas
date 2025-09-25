// src/lib/supabase.ts — UNIFICADO (client + admin + SSR) sin romper build
import { createClient, type SupabaseClient as SBC } from '@supabase/supabase-js';
import type { CookieOptions } from '@supabase/ssr'; // solo tipos

const URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SRV  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!URL || !ANON) {
  throw new Error('Faltan variables de entorno de Supabase (URL o ANON_KEY)');
}
if (!SRV) {
  // No tiramos error para no bloquear dev; solo warning
  console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY no configurada - supabaseAdmin limitado');
}

/* =========================================================
   1) Cliente universal (seguro en client/server sin sesión propia)
   ========================================================= */
export const supabaseClient: SBC = createClient(URL, ANON, {
  // Evita doble sesión (tu sesión real es la cookie httpOnly fenix_session)
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

/* =========================================================
   2) Admin (server-only) — usa SERVICE ROLE KEY
   ========================================================= */
let _admin: SBC | null = null;
export function supabaseAdmin(): SBC {
  if (typeof window !== 'undefined') {
    throw new Error('supabaseAdmin() es server-only. Úsalo en Route Handlers o RSC.');
  }
  if (!_admin) {
    _admin = createClient(URL, SRV, { auth: { persistSession: false } });
  }
  return _admin;
}

/* =========================================================
   3) SSR (server-only) — usa cookies de Next (cookies() es async en tu setup)
   ========================================================= */
export async function createServerSupabase(): Promise<SBC> {
  if (typeof window !== 'undefined') {
    throw new Error('createServerSupabase() es server-only.');
  }

  const [{ createServerClient }, { cookies }] = await Promise.all([
    import('@supabase/ssr'),
    import('next/headers'),
  ]);

  const cookieStore = await cookies(); // ← en tu entorno es Promise<ReadonlyRequestCookies>

  // Tipamos el retorno a SBC para evitar conflicto de generics (Database/public)
  const client = createServerClient(URL, ANON, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        cookieStore.set({ name, value: '', ...options, maxAge: 0 });
      },
    },
  }) as unknown as SBC;

  return client;
}

/* =========================================================
   Helpers y compatibilidad
   ========================================================= */
export type SupabaseClient = SBC;

export const SUPABASE_CONFIG = {
  url: URL,
  anonKey: ANON,
  hasServiceKey: Boolean(SRV),
} as const;

// Compat legacy
export const supabase = supabaseClient;
export default supabaseClient;

/* =========================================================
   Helpers para resiliencia de consultas (retry + detección errores transitorios)
   ========================================================= */

const TRANSIENT_PATTERNS = [/fetch failed/i, /ECONNRESET/i, /EAI_AGAIN/i, /ETIMEDOUT/i];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function isSupabaseTransientError(error: unknown): error is Error {
  if (!(error instanceof Error)) return false;
  const message = error.message || '';
  return TRANSIENT_PATTERNS.some((re) => re.test(message));
}

export async function withSupabaseRetry<T>(
  factory: () => Promise<T>,
  options: { retries?: number; delayMs?: number } = {}
): Promise<T> {
  const { retries = 2, delayMs = 400 } = options;
  let attempt = 0;
  let lastError: unknown;

  while (attempt <= retries) {
    try {
      return await factory();
    } catch (error) {
      lastError = error;
      if (!isSupabaseTransientError(error) || attempt === retries) {
        throw error;
      }
      await sleep(delayMs * Math.pow(2, attempt));
      attempt += 1;
    }
  }

  throw lastError;
}
