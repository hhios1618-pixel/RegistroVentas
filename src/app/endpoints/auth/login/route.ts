export const runtime = 'nodejs';
// src/app/endpoints/auth/login/route.ts - ENDPOINT UNIFICADO
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { authEnv } from '@/lib/auth/env';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const { jwtSecret: JWT_SECRET, sessionCookieName: COOKIE_NAME, sessionDays: COOKIE_DAYS } = authEnv;

// Validación de configuración
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !JWT_SECRET) {
  throw new Error('Faltan variables de entorno críticas para autenticación');
}

// Cliente Supabase con service role para operaciones administrativas
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

/**
 * Normaliza roles a los valores esperados por el frontend
 */
function normalizeRole(rawRole?: string): string {
  const role = String(rawRole || '').trim().toUpperCase();
  
  if (['GERENCIA', 'GERENTE', 'ADMIN', 'ADMINISTRADOR'].includes(role)) return 'ADMIN';
  if (['PROMOTOR', 'PROMOTORA'].includes(role)) return 'PROMOTOR';
  if (['COORDINADOR', 'COORDINADORA', 'COORDINACION'].includes(role)) return 'COORDINADOR';
  if (['LIDER', 'JEFE', 'SUPERVISOR'].includes(role)) return 'LIDER';
  if (['ASESOR', 'VENDEDOR', 'VENDEDORA'].includes(role)) return 'ASESOR';
  if (['LOGISTICA', 'RUTAS', 'DELIVERY'].includes(role)) return 'LOGISTICA';
  
  return 'ASESOR'; // Rol por defecto más seguro
}

/**
 * Normaliza el input recibido (username/email) para compararlo contra columnas *_norm
 */
function normalizeLoginInput(raw: string): string {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // elimina diacríticos
    .replace(/[^a-z0-9@._+-]/g, '');
}

/**
 * Valida credenciales del usuario
 */
async function validateCredentials(username: string, password: string) {
  const normalizedInput = normalizeLoginInput(username);

  if (!normalizedInput) {
    throw new Error('Usuario no encontrado');
  }

  const { data, error } = await supabaseAdmin
    .from('people')
    .select('id, username, email, full_name, role, fenix_role, privilege_level, active, password_hash')
    .or(`username_norm.eq.${normalizedInput},email_norm.eq.${normalizedInput}`)
    .limit(1);

  if (error) {
    console.error('Error consultando usuario:', error);
    throw new Error('Error interno del servidor');
  }

  const person = data?.[0];
  if (!person) {
    throw new Error('Usuario no encontrado');
  }

  if (person.active === false) {
    throw new Error('Usuario deshabilitado');
  }

  // Validar contraseña
  if (!person.password_hash) {
    throw new Error('Usuario sin contraseña configurada. Contacte al administrador.');
  }

  const isValidPassword = await bcrypt.compare(password, person.password_hash);
  if (!isValidPassword) {
    throw new Error('Contraseña incorrecta');
  }

  return person;
}

/**
 * Genera JWT con información del usuario
 */
function generateJWT(person: any): string {
  const role = normalizeRole(person.fenix_role || person.role);
  const now = Math.floor(Date.now() / 1000);
  const expSeconds = COOKIE_DAYS * 24 * 60 * 60;

  const payload = {
    sub: person.id,                    // ID del usuario (people.id)
    usr: person.username,              // Username
    email: person.email,               // Email
    name: person.full_name,            // Nombre completo
    role: role,                        // Rol normalizado
    lvl: person.privilege_level ?? 1,  // Nivel de privilegios
    iat: now,                          // Issued at
    exp: now + expSeconds,             // Expiration
  };

  return jwt.sign(payload, JWT_SECRET);
}

/**
 * Configura cookie de sesión segura
 */
function setSecureCookie(response: NextResponse, token: string) {
  const expSeconds = COOKIE_DAYS * 24 * 60 * 60;
  const isProduction = process.env.NODE_ENV === 'production';

  response.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: expSeconds,
  });
}

/**
 * POST /endpoints/auth/login
 * Endpoint unificado de autenticación
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // Validaciones básicas
    if (!username || !password) {
      return NextResponse.json(
        { ok: false, error: 'Usuario y contraseña son requeridos' },
        { status: 400 }
      );
    }

    if (typeof username !== 'string' || typeof password !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'Formato de credenciales inválido' },
        { status: 400 }
      );
    }

    // Validar credenciales
    const person = await validateCredentials(username.trim(), password);

    // Generar JWT
    const token = generateJWT(person);

    // Preparar respuesta
    const response = NextResponse.json({
      ok: true,
      user: {
        id: person.id,
        username: person.username,
        email: person.email,
        name: person.full_name,
        role: normalizeRole(person.fenix_role || person.role),
      },
    });

    // Configurar cookie segura
    setSecureCookie(response, token);

    // Log de auditoría (sin información sensible)
    console.log(`Login exitoso: ${person.username} (${person.id})`);

    return response;

  } catch (error: any) {
    // Log de error (sin información sensible)
    console.error('Error en login:', {
      message: error.message,
      timestamp: new Date().toISOString(),
    });

    // Respuesta genérica para evitar información leak
    const isKnownError = [
      'Usuario no encontrado',
      'Usuario deshabilitado',
      'Contraseña incorrecta',
      'Usuario sin contraseña configurada. Contacte al administrador.',
    ].includes(error.message);

    return NextResponse.json(
      {
        ok: false,
        error: isKnownError ? error.message : 'Error de autenticación',
      },
      { status: isKnownError ? 401 : 500 }
    );
  }
}

/**
 * GET /endpoints/auth/login
 * Método no permitido
 */
export async function GET() {
  return NextResponse.json(
    { ok: false, error: 'Método no permitido' },
    { status: 405 }
  );
}
