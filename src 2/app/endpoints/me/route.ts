// src/app/endpoints/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'fenix_session';

/** Mapea los valores de la DB a los códigos que usa el front */
function normalizeRole(raw?: string) {
  const r = (raw || '').toString().trim().toUpperCase();
  if (['GERENCIA', 'GERENTE', 'ADMIN', 'ADMINISTRADOR'].includes(r)) return 'admin';
  if (['PROMOTOR', 'PROMOTORA'].includes(r)) return 'promotor';
  if (['COORDINADOR', 'COORDINADORA', 'COORDINACION'].includes(r)) return 'coordinador';
  if (['LIDER', 'JEFE', 'SUPERVISOR'].includes(r)) return 'lider';
  if (['ASESOR', 'VENDEDOR', 'VENDEDORA'].includes(r)) return 'asesor';
  return 'asesor';
}

export async function GET(req: NextRequest) {
  try {
    // Leer cookie
    const sessionCookie = req.cookies.get(COOKIE_NAME);
    if (!sessionCookie?.value) {
      console.log('No se encontró cookie de sesión:', COOKIE_NAME);
      return NextResponse.json({ ok: false, error: 'no_session' }, { status: 401 });
    }

    // Verificar JWT
    let payload: any;
    try {
      payload = jwt.verify(sessionCookie.value, JWT_SECRET);
      console.log('JWT decodificado exitosamente:', { sub: payload.sub, role: payload.role, email: payload.email });
    } catch (jwtError) {
      console.error('Error verificando JWT:', jwtError);
      return NextResponse.json({ ok: false, error: 'invalid_token' }, { status: 401 });
    }

    // Supabase admin
    const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

    // Traer persona (⬅️ ahora incluye local e id explícito)
    const { data: person, error } = await admin
      .from('people')
      .select('id, full_name, role, fenix_role, privilege_level, active, email, local')
      .eq('id', payload.sub)
      .maybeSingle();

    if (error) {
      console.error('Error consultando people:', error);
      return NextResponse.json({ ok: false, error: 'db_error' }, { status: 500 });
    }
    if (!person) {
      console.log('Persona no encontrada en DB para ID:', payload.sub);
      return NextResponse.json({ ok: false, error: 'person_not_found' }, { status: 404 });
    }
    if (person.active === false) {
      console.log('Usuario deshabilitado:', person.id);
      return NextResponse.json({ ok: false, error: 'user_disabled' }, { status: 403 });
    }

    // Rol normalizado
    const rawRole = person.fenix_role || person.role;
    const role = normalizeRole(rawRole);

    const response = {
      ok: true,
      id: person.id,                        // ⬅️ agregado
      full_name: person.full_name,
      role,                                 // 'admin' | 'promotor' | 'coordinador' | 'lider' | 'asesor'
      privilege_level: person.privilege_level ?? 1,
      email: person.email,
      raw_role: rawRole,
      local: person.local ?? null,          // ⬅️ agregado (Sucursal declarada en people.local)
    };

    console.log('Respuesta exitosa para usuario:', response);

    return NextResponse.json(response, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err: any) {
    console.error('Error en endpoint /me:', err);
    return NextResponse.json(
      { ok: false, error: 'server_error', message: err?.message ?? 'error desconocido' },
      { status: 500 },
    );
  }
}