import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const URL       = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE   = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const DEFAULT_PASSWORD = process.env.DEFAULT_PASSWORD || 'FENIX2025!';
const JWT_SECRET   = process.env.JWT_SECRET || 'dev-secret';
const COOKIE_NAME  = process.env.SESSION_COOKIE_NAME || 'fenix_session';
const COOKIE_DAYS  = Number(process.env.SESSION_DAYS || '30');

// 🔥 HOTFIX: si está en "1", aceptamos DEFAULT para cualquiera
const TEMP_ALLOW_DEFAULT_ANY = process.env.TEMP_ALLOW_DEFAULT_ANY === '1';

type PersonRow = {
  id: string;
  username: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  fenix_role: string | null;
  privilege_level: number | null;
  active: boolean | null;
  password_hash: string | null;
  initial_password_plain_text: string | null;
  force_password_reset: boolean | null;
  last_password_change_at: string | null;
};

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) {
      return NextResponse.json({ ok: false, error: 'Faltan credenciales' }, { status: 400 });
    }

    const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

    const FIELDS =
      'id,username,email,full_name,role,fenix_role,privilege_level,active,' +
      'password_hash,initial_password_plain_text,force_password_reset,last_password_change_at';

    const isEmail = String(username).includes('@');
    const base = admin.from('people').select(FIELDS).limit(1);

    // Forzamos el tipo para evitar GenericStringError en TS
    const query = (isEmail
      ? await base.ilike('email', username.trim())
      : await base.eq('username', username.trim())
    ) as unknown as { data: PersonRow[] | null; error: any };

    if (query.error) throw query.error;

    const person = (query.data ?? [])[0];
    if (!person) {
      return NextResponse.json({ ok: false, error: 'Usuario no encontrado' }, { status: 404 });
    }
    if (person.active === false) {
      return NextResponse.json({ ok: false, error: 'Usuario deshabilitado' }, { status: 403 });
    }

    // ─────────────────────────── Validación de contraseña ───────────────────────────
    let passOk = false;

    // 1) Hotfix: permitir DEFAULT a cualquiera si el flag está activo
    if (TEMP_ALLOW_DEFAULT_ANY && password === DEFAULT_PASSWORD) {
      passOk = true;
    }

    // 2) Si tiene hash, validar bcrypt (esto convive con el hotfix)
    if (!passOk && person.password_hash) {
      try {
        passOk = await bcrypt.compare(password, person.password_hash);
      } catch {
        passOk = false;
      }
    }

    // 3) Si NO tiene hash, permitir DEFAULT (flujo normal)
    if (!passOk && !person.password_hash && password === DEFAULT_PASSWORD) {
      passOk = true;
    }

    // 4) Si está forzado o tiene initial_password_plain_text, permitir DEFAULT
    if (
      !passOk &&
      (person.force_password_reset === true || person.initial_password_plain_text !== null) &&
      password === DEFAULT_PASSWORD
    ) {
      passOk = true;
    }

    if (!passOk) {
      return NextResponse.json({ ok: false, error: 'Usuario o contraseña incorrectos' }, { status: 401 });
    }

    // ─────────────────────────── Token ───────────────────────────
    const role = String(person.fenix_role || person.role || 'USER').toUpperCase();
    const expSec = COOKIE_DAYS * 24 * 60 * 60;
    const now = Math.floor(Date.now() / 1000);

    const payload = {
      sub: person.id,
      usr: person.username,
      email: person.email,
      name: person.full_name,
      role,
      lvl: person.privilege_level ?? 1,
      iat: now,
      exp: now + expSec,
    };

    const token = jwt.sign(payload, JWT_SECRET);

    const res = NextResponse.json({
      ok: true,
      user: { id: person.id, username: person.username, role },
      // útil para avisar al front si está usando la master
      usingDefault: TEMP_ALLOW_DEFAULT_ANY && password === DEFAULT_PASSWORD,
    });

    res.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: expSec,
    });

    return res;
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'error' }, { status: 500 });
  }
}