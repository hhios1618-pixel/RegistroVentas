// src/app/endpoints/me/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import {
  supabaseAdmin,
  withSupabaseRetry,
  isSupabaseTransientError,
  SUPABASE_CONFIG,
} from '@/lib/supabase';
import { authEnv } from '@/lib/auth/env';
import type { PostgrestSingleResponse } from '@supabase/supabase-js';

const { jwtSecret: JWT_SECRET, sessionCookieName: COOKIE_NAME } = authEnv;

type JwtPayloadMinimal = {
  sub: string;            // auth.users.id
  usr?: string | null;    // username (si lo pones en el JWT)
  email?: string | null;  // email de auth
  name?: string | null;
  role?: string | null;
  lvl?: number | null;
};

type PersonRow = {
  id: string;             // public.people.id
  user_id: string | null; // link a auth.users.id
  full_name: string | null;
  role: string | null;
  fenix_role: string | null;
  privilege_level: number | null;
  active: boolean | null;
  email: string | null;
  login_email: string | null;
  local: string | null;
  username: string | null;
  site_id: string | null; // <-- agregado
};

function normalizeRole(rawRole?: string): string {
  const role = String(rawRole || '').trim().toUpperCase();
  if (['GERENCIA', 'GERENTE', 'ADMIN', 'ADMINISTRADOR'].includes(role)) return 'ADMIN';
  if (['PROMOTOR', 'PROMOTORA'].includes(role)) return 'PROMOTOR';
  if (['COORDINADOR', 'COORDINADORA', 'COORDINACION'].includes(role)) return 'COORDINADOR';
  if (['LIDER', 'JEFE', 'SUPERVISOR'].includes(role)) return 'LIDER';
  if (['ASESOR', 'VENDEDOR', 'VENDEDORA'].includes(role)) return 'ASESOR';
  if (['LOGISTICA', 'RUTAS', 'DELIVERY'].includes(role)) return 'LOGISTICA';
  return 'ASESOR';
}

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get(COOKIE_NAME);
    if (!sessionCookie?.value) {
      return NextResponse.json({ ok: false, error: 'no_session' }, { status: 401 });
    }

    let payload: JwtPayloadMinimal;
    try {
      payload = jwt.verify(sessionCookie.value, JWT_SECRET) as JwtPayloadMinimal;
    } catch {
      return NextResponse.json({ ok: false, error: 'invalid_token' }, { status: 401 });
    }
    if (!payload?.sub) {
      return NextResponse.json({ ok: false, error: 'invalid_token_payload' }, { status: 401 });
    }

    // Modo dev sin Supabase configurado
    if (!SUPABASE_CONFIG.isConfigured) {
      const normalizedRole = normalizeRole(payload.role || undefined);
      return NextResponse.json(
        {
          ok: true,
          auth_user_id: payload.sub,
          person_pk: null,
          username: payload.usr ?? null,
          full_name: payload.name ?? payload.usr ?? 'Usuario Fenix',
          email: payload.email ?? null,
          login_email: payload.email ?? null,
          role: normalizedRole,
          raw_role: payload.role ?? null,
          privilege_level: typeof payload.lvl === 'number' ? payload.lvl : 1,
          local: null,
          site_id: null,
          site_name: null,
        },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const admin = supabaseAdmin();

    // ---------- Resolución robusta de people ----------
    const email = payload.email ?? null;
    const username = payload.usr ?? null;
    const authUserId = payload.sub;

    // IMPORTANTE: ahora incluye site_id
    const selectCols =
      'id, user_id, full_name, role, fenix_role, privilege_level, active, email, login_email, local, username, site_id';

    let person: PersonRow | null = null;
    let resp: PostgrestSingleResponse<PersonRow>;

    // 1) login_email == email
    if (!person && email) {
      resp = await withSupabaseRetry(async () =>
        (await admin
          .from('people')
          .select(selectCols)
          .eq('login_email', email)
          .maybeSingle()) as PostgrestSingleResponse<PersonRow>
      );
      if (resp.data) person = resp.data;
      else if (resp.error) console.warn('[me] login_email lookup error:', resp.error.message);
    }

    // 2) email == email
    if (!person && email) {
      resp = await withSupabaseRetry(async () =>
        (await admin
          .from('people')
          .select(selectCols)
          .eq('email', email)
          .maybeSingle()) as PostgrestSingleResponse<PersonRow>
      );
      if (resp.data) person = resp.data;
      else if (resp.error) console.warn('[me] email lookup error:', resp.error.message);
    }

    // 3) username == usr
    if (!person && username) {
      resp = await withSupabaseRetry(async () =>
        (await admin
          .from('people')
          .select(selectCols)
          .eq('username', username)
          .maybeSingle()) as PostgrestSingleResponse<PersonRow>
      );
      if (resp.data) person = resp.data;
      else if (resp.error) console.warn('[me] username lookup error:', resp.error.message);
    }

    // 4) user_id == auth.users.id
    if (!person) {
      resp = await withSupabaseRetry(async () =>
        (await admin
          .from('people')
          .select(selectCols)
          .eq('user_id', authUserId)
          .maybeSingle()) as PostgrestSingleResponse<PersonRow>
      );
      if (resp.data) person = resp.data;
      else if (resp.error) console.warn('[me] user_id lookup error:', resp.error.message);
    }

    // 5) id == auth.users.id (legacy)
    if (!person) {
      resp = await withSupabaseRetry(async () =>
        (await admin
          .from('people')
          .select(selectCols)
          .eq('id', authUserId)
          .maybeSingle()) as PostgrestSingleResponse<PersonRow>
      );
      if (resp.data) person = resp.data;
      else if (resp.error) console.warn('[me] id==sub lookup error:', resp.error.message);
    }

    if (!person) {
      return NextResponse.json(
        {
          ok: false,
        error: 'person_not_found_for_user',
          details: { email, username, auth_user_id: authUserId },
        },
        { status: 404 }
      );
    }

    if (person.active === false) {
      return NextResponse.json({ ok: false, error: 'user_disabled' }, { status: 403 });
    }

    const rawRole = person.fenix_role || person.role || undefined;
    const normalizedRole = normalizeRole(rawRole);

    // Resolver nombre de sucursal (opcional)
    let siteName: string | null = null;
    if (person.site_id) {
      const { data: siteRow, error: sErr } = await admin
        .from('sites')
        .select('name')
        .eq('id', person.site_id)
        .maybeSingle();
      if (sErr) {
        console.warn('[me] site lookup error:', sErr.message);
      }
      siteName = siteRow?.name ?? null;
    }

    return NextResponse.json(
      {
        ok: true,
        auth_user_id: authUserId, // id de auth.users
        person_pk: person.id,     // id de public.people (usar para check-in)
        username: person.username,
        full_name: person.full_name,
        email: person.email,
        login_email: person.login_email ?? person.email,
        role: normalizedRole,
        raw_role: rawRole ?? null,
        privilege_level: person.privilege_level ?? 1,
        local: person.local ?? null,
        site_id: person.site_id ?? null,  // <-- ahora viaja
        site_name: siteName,              // <-- opcional para UI
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error: any) {
    if (isSupabaseTransientError?.(error)) {
      console.error('[me] Supabase temporalmente no disponible:', error?.message);
      return NextResponse.json({ ok: false, error: 'supabase_unavailable' }, { status: 503 });
    }
    console.error('Error en endpoint /me:', error);
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json({ ok: false, error: 'Método no permitido' }, { status: 405 });
}
export async function PUT() {
  return NextResponse.json({ ok: false, error: 'Método no permitido' }, { status: 405 });
}
export async function DELETE() {
  return NextResponse.json({ ok: false, error: 'Método no permitido' }, { status: 405 });
}