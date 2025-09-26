export const runtime = 'nodejs';
// src/app/endpoints/auth/login/route.ts - ENDPOINT UNIFICADO
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';
import { authEnv } from '@/lib/auth/env';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const { jwtSecret: JWT_SECRET, sessionCookieName: COOKIE_NAME, sessionDays: COOKIE_DAYS } = authEnv;
const DEFAULT_PASSWORD = process.env.DEFAULT_PASSWORD || 'FENIX2025!';
const DEV_LOGIN_FALLBACK_ENABLED = process.env.DEV_LOGIN_FALLBACK !== 'false';
const DEV_LOGIN_ALLOW_UNKNOWN = process.env.DEV_LOGIN_ALLOW_UNKNOWN !== 'false';

const hasSupabaseConfig = Boolean(SUPABASE_URL && SUPABASE_SERVICE_KEY);
if (!hasSupabaseConfig) {
  console.warn('[auth/login] SUPABASE_SERVICE_ROLE_KEY o NEXT_PUBLIC_SUPABASE_URL no definidos; usando fallback local.');
}

// Cliente Supabase con service role para operaciones administrativas (si hay credenciales)
const supabaseAdmin = hasSupabaseConfig
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })
  : null;

type PersonRecord = {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role?: string | null;
  fenix_role?: string | null;
  privilege_level?: number | null;
  active?: boolean | null;
  password_hash?: string | null;
};

type DevUser = {
  id: string;
  username: string;
  email: string;
  role: string;
  full_name: string;
  username_norm: string;
  email_norm: string;
  username_flat: string;
  email_flat: string;
};

let devUsersCache: DevUser[] | null = null;

function loadDevUsers(): DevUser[] {
  if (devUsersCache) return devUsersCache;

  const csvPath = path.join(process.cwd(), 'provisioned-users.csv');
  try {
    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.split(/\r?\n/).filter(Boolean);
    const rows = lines.slice(1); // remove header

    devUsersCache = rows.map((line) => {
      const [username = '', email = '', id = '', , , , roleRaw = 'ASESOR'] = line
        .split(',')
        .map((segment) => segment.trim());
      const role = String(roleRaw || 'ASESOR').toUpperCase();
      const usernameNorm = normalizeLoginInput(username);
      const emailNorm = normalizeLoginInput(email);
      const usernameFlat = usernameNorm.replace(/[._+-]/g, '');
      const emailFlat = emailNorm.replace(/[._+-]/g, '');
      const fullName = username
        .replace(/[_\.]+/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());

      return {
        id: id || username,
        username,
        email,
        role,
        full_name: fullName || username,
        username_norm: usernameNorm,
        email_norm: emailNorm,
        username_flat: usernameFlat,
        email_flat: emailFlat,
      } satisfies DevUser;
    });

    console.log(`[auth/login] Fallback cargó ${devUsersCache.length} usuarios de provisioned-users.csv`);
  } catch (error) {
    console.warn('[auth/login] No se pudo leer provisioned-users.csv para fallback local.', error);
    devUsersCache = [];
  }

  return devUsersCache;
}

function validateDevCredentials(username: string, password: string): PersonRecord {
  if (!DEV_LOGIN_FALLBACK_ENABLED) {
    throw new Error('Usuario no encontrado');
  }

  const users = loadDevUsers();
  if (!users.length) {
    throw new Error('Servicio de autenticación no disponible');
  }

  const normalizedInput = normalizeLoginInput(username);
  const flatInput = normalizedInput.replace(/[._+-]/g, '');
  const match = users.find(
    (user) =>
      user.username_norm === normalizedInput ||
      user.email_norm === normalizedInput ||
      (!!flatInput && (user.username_flat === flatInput || user.email_flat === flatInput))
  );

  const partialMatch = match ?? users.find((user) => {
    if (!normalizedInput) return false;
    if (user.username_norm.startsWith(normalizedInput) || user.email_norm.startsWith(normalizedInput)) {
      return true;
    }
    if (flatInput && (user.username_flat.startsWith(flatInput) || user.email_flat.startsWith(flatInput))) {
      return true;
    }
    return false;
  });

  let selected: PersonRecord | null = null;

  if (partialMatch) {
    selected = {
      id: partialMatch.id,
      username: partialMatch.username,
      email: partialMatch.email,
      full_name: partialMatch.full_name,
      role: partialMatch.role,
      fenix_role: partialMatch.role,
      privilege_level: 1,
      active: true,
      password_hash: null,
    } satisfies PersonRecord;
  } else {
    console.warn('[auth/login] Fallback no encontró coincidencias para:', {
      username,
      normalizedInput,
      flatInput,
    });

    if (DEV_LOGIN_ALLOW_UNKNOWN && normalizedInput) {
      selected = {
        id: `dev-${flatInput || normalizedInput}`,
        username: username || normalizedInput,
        email: `${flatInput || normalizedInput}@fenix.dev`,
        full_name: (username || normalizedInput)
          .replace(/[._+-]+/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase()),
        role: 'ASESOR',
        fenix_role: 'ASESOR',
        privilege_level: 1,
        active: true,
        password_hash: null,
      } satisfies PersonRecord;

      console.warn('[auth/login] Generando usuario sintético para dev:', selected.username);
    }
  }

  if (!selected) {
    throw new Error('Usuario no encontrado');
  }

  if (password !== DEFAULT_PASSWORD) {
    throw new Error('Contraseña incorrecta');
  }

  return selected;
}

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

  if (supabaseAdmin) {
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

    if (!person.password_hash) {
      throw new Error('Usuario sin contraseña configurada. Contacte al administrador.');
    }

    const isValidPassword = await bcrypt.compare(password, person.password_hash);
    if (!isValidPassword) {
      throw new Error('Contraseña incorrecta');
    }

    return person;
  }

  return validateDevCredentials(username, password);
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
