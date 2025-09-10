// src/app/endpoints/auth/basic-login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE!;

const DEFAULT_PASSWORD = process.env.DEFAULT_PASSWORD || 'FENIX2025!';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'fenix_session';
const COOKIE_DAYS = Number(process.env.SESSION_DAYS || '30');

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ ok: false, error: 'Faltan credenciales' }, { status: 400 });
    }

    const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

    // Busca por username exacto o por email (case-insensitive)
    const isEmail = String(username).includes('@');
    const base = admin
      .from('people')
      .select('id, username, email, full_name, role, fenix_role, privilege_level, active, password_hash')
      .limit(1);

    const { data, error } = isEmail
      ? await base.ilike('email', username.trim())
      : await base.eq('username', username.trim());

    if (error) throw error;

    const person = data?.[0];
    if (!person) {
      return NextResponse.json({ ok: false, error: 'Usuario no encontrado' }, { status: 404 });
    }
    if (person.active === false) {
      return NextResponse.json({ ok: false, error: 'Usuario deshabilitado' }, { status: 403 });
    }

    // Validación: acepta DEFAULT_PASSWORD global o hash por usuario si existe
    let passOk = password === DEFAULT_PASSWORD;
    if (!passOk && person.password_hash) {
      try {
        passOk = await bcrypt.compare(password, person.password_hash);
      } catch {}
    }
    if (!passOk) {
      return NextResponse.json({ ok: false, error: 'Usuario o contraseña incorrectos' }, { status: 401 });
    }

    // Firma token con rol normalizado (preferimos fenix_role)
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
    });

    // ✅ solo Secure en producción (en dev la cookie no viajaría con http://localhost)
    const SECURE = process.env.NODE_ENV === 'production';

    res.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: SECURE,
      sameSite: 'lax',
      path: '/',
      maxAge: expSec,
    });

    return res;
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'error' }, { status: 500 });
  }
}