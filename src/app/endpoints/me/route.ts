// src/app/endpoints/me/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { supabaseAdmin, withSupabaseRetry, isSupabaseTransientError } from '@/lib/supabase';
import type { PostgrestSingleResponse } from '@supabase/supabase-js';

const JWT_SECRET = process.env.JWT_SECRET!;
const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'fenix_session';

type JwtPayloadMinimal = { sub: string };

type PersonRow = {
  id: string;
  full_name: string | null;
  role: string | null;
  fenix_role: string | null;
  privilege_level: number | null;
  active: boolean | null;
  email: string | null;
  local: string | null;
  username: string | null;
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
    } catch (e) {
      return NextResponse.json({ ok: false, error: 'invalid_token' }, { status: 401 });
    }

    if (!payload?.sub) {
      return NextResponse.json({ ok: false, error: 'invalid_token_payload' }, { status: 401 });
    }

    const admin = supabaseAdmin();

    // Sin genéricos en withSupabaseRetry ni en .from(); fijamos el tipo por la firma de retorno
    const queryResult = await withSupabaseRetry(async (): Promise<PostgrestSingleResponse<PersonRow>> => {
      const res = await admin
        .from('people')
        .select('id, full_name, role, fenix_role, privilege_level, active, email, local, username')
        .eq('id', payload.sub)
        .maybeSingle();
      return res as PostgrestSingleResponse<PersonRow>;
    });

    const { data: person, error } = queryResult;

    if (error) {
      console.error('Error consultando usuario:', error);
      return NextResponse.json({ ok: false, error: 'db_error' }, { status: 500 });
    }

    if (!person) {
      return NextResponse.json({ ok: false, error: 'person_not_found' }, { status: 404 });
    }

    if (person.active === false) {
      return NextResponse.json({ ok: false, error: 'user_disabled' }, { status: 403 });
    }

    const rawRole = person.fenix_role || person.role || undefined;
    const normalizedRole = normalizeRole(rawRole);

    return NextResponse.json(
      {
        ok: true,
        id: person.id,
        username: person.username,
        full_name: person.full_name,
        email: person.email,
        role: normalizedRole,
        raw_role: rawRole ?? null,
        privilege_level: person.privilege_level ?? 1,
        local: person.local ?? null,
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