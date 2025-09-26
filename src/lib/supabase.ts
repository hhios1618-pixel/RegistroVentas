// src/lib/supabase.ts — UNIFICADO (client + admin + SSR) sin romper build
import { createClient, type SupabaseClient as SBC } from '@supabase/supabase-js';
import type { CookieOptions } from '@supabase/ssr'; // solo tipos

const URL  = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const SRV  = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const HAS_PUBLIC_KEYS = Boolean(URL && ANON);
const HAS_SERVICE_KEY = Boolean(SRV);

if (!HAS_PUBLIC_KEYS) {
  console.warn('⚠️ NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY no definidos. Supabase en modo mock.');
}
if (!HAS_SERVICE_KEY) {
  console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY no configurada - supabaseAdmin en modo mock.');
}

type SupabaseMockResponse<T> = {
  data: T | null;
  error: null;
  status?: number;
  statusText?: string;
  count?: number | null;
};

type SupabaseMockQuery<T = unknown> = {
  select: (...args: any[]) => SupabaseMockQuery<T>;
  eq: (...args: any[]) => SupabaseMockQuery<T>;
  gte: (...args: any[]) => SupabaseMockQuery<T>;
  lt: (...args: any[]) => SupabaseMockQuery<T>;
  lte: (...args: any[]) => SupabaseMockQuery<T>;
  gt: (...args: any[]) => SupabaseMockQuery<T>;
  order: (...args: any[]) => SupabaseMockQuery<T>;
  limit: (...args: any[]) => SupabaseMockQuery<T>;
  range: (...args: any[]) => SupabaseMockQuery<T>;
  ilike: (...args: any[]) => SupabaseMockQuery<T>;
  contains: (...args: any[]) => SupabaseMockQuery<T>;
  in: (...args: any[]) => SupabaseMockQuery<T>;
  not: (...args: any[]) => SupabaseMockQuery<T>;
  maybeSingle: () => Promise<SupabaseMockResponse<T>>;
  single: () => Promise<SupabaseMockResponse<T>>;
  insert: (...args: any[]) => Promise<SupabaseMockResponse<T>>;
  update: (...args: any[]) => Promise<SupabaseMockResponse<T>>;
  upsert: (...args: any[]) => Promise<SupabaseMockResponse<T>>;
  delete: (...args: any[]) => Promise<SupabaseMockResponse<T>>;
};

function createMockQuery<T = unknown>(): SupabaseMockQuery<T> {
  const resolveValue: SupabaseMockResponse<T[]> = { data: [], error: null, status: 200, statusText: 'OK', count: 0 };
  const builder: SupabaseMockQuery<T> = {
    select: () => builder,
    eq: () => builder,
    gte: () => builder,
    lt: () => builder,
    lte: () => builder,
    gt: () => builder,
    order: () => builder,
    limit: () => builder,
    range: () => builder,
    ilike: () => builder,
    contains: () => builder,
    in: () => builder,
    not: () => builder,
    maybeSingle: async () => ({ data: null, error: null, status: 200, statusText: 'OK', count: null }),
    single: async () => ({ data: null, error: null, status: 200, statusText: 'OK', count: null }),
    insert: async () => ({ data: null, error: null, status: 200, statusText: 'OK', count: null }),
    update: async () => ({ data: null, error: null, status: 200, statusText: 'OK', count: null }),
    upsert: async () => ({ data: null, error: null, status: 200, statusText: 'OK', count: null }),
    delete: async () => ({ data: null, error: null, status: 200, statusText: 'OK', count: null }),
  };
  (builder as any).then = (onFulfilled?: (value: SupabaseMockResponse<T[]>) => any, onRejected?: (reason: unknown) => any) =>
    Promise.resolve(resolveValue).then(onFulfilled, onRejected);
  (builder as any).catch = (onRejected?: (reason: unknown) => any) => Promise.resolve(resolveValue).catch(onRejected);
  (builder as any).finally = (onFinally?: () => void) => Promise.resolve(resolveValue).finally(onFinally);
  return builder;
}

function createMockSupabaseClient(): SBC {
  const mock = {
    from: () => createMockQuery(),
    rpc: async () => ({ data: null, error: null }),
    channel: () => ({ on: () => ({ subscribe: () => ({ unsubscribe: () => undefined }) }) }),
    removeChannel: async () => ({ error: null }),
    getChannels: () => [],
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } }, error: null }),
      signOut: async () => ({ error: null }),
    },
  } as unknown as SBC;

  return mock;
}

/* =========================================================
   1) Cliente universal (seguro en client/server sin sesión propia)
   ========================================================= */
export const supabaseClient: SBC = HAS_PUBLIC_KEYS
  ? createClient(URL, ANON, {
      // Evita doble sesión (tu sesión real es la cookie httpOnly fenix_session)
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
  : createMockSupabaseClient();

/* =========================================================
   2) Admin (server-only) — usa SERVICE ROLE KEY
   ========================================================= */
let _admin: SBC | null = null;
export function supabaseAdmin(): SBC {
  if (typeof window !== 'undefined') {
    throw new Error('supabaseAdmin() es server-only. Úsalo en Route Handlers o RSC.');
  }
  if (!_admin) {
    _admin = HAS_PUBLIC_KEYS && HAS_SERVICE_KEY
      ? createClient(URL, SRV, { auth: { persistSession: false } })
      : createMockSupabaseClient();
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

  if (!HAS_PUBLIC_KEYS) {
    return createMockSupabaseClient();
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
  hasServiceKey: HAS_SERVICE_KEY,
  isConfigured: HAS_PUBLIC_KEYS,
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
