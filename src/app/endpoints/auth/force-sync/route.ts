// src/app/endpoints/auth/force-sync/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE!;

// === Config desde .env ===
const DEFAULT_DOMAIN = process.env.LOGIN_DOMAIN || 'fenix.local';
const DEFAULT_PASSWORD = process.env.DEFAULT_PASSWORD || 'FENIX2025!';
const FORCE_DOMAIN = true; // siempre forzar @fenix.local

// --- helpers ---
const toAscii = (s: string) =>
  (s ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x00-\x7F]/g, '');

function sanitizeLocalPart(username: string) {
  const base = toAscii(username.trim().toLowerCase())
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9._%+-]/g, '.')
    .replace(/\.+/g, '.')
    .replace(/^\.|\.$/g, '');
  return base || 'u';
}

function computeEmail(username: string, id: string, domain: string) {
  const id6 =
    (id || '').replace(/-/g, '').slice(0, 6) ||
    crypto.randomBytes(3).toString('hex');
  let local = sanitizeLocalPart(username);
  const maxLocal = 64 - 1 - id6.length;
  if (local.length > maxLocal) local = local.slice(0, maxLocal);
  return `${local}-${id6}@${domain}`;
}

// --- endpoint ---
export async function POST(req: NextRequest) {
  try {
    const { username } = await req.json();
    if (!username)
      return NextResponse.json({ ok: false, error: 'username requerido' }, { status: 400 });

    const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

    // buscar usuario en people
    const { data: person, error } = await admin
      .from('people')
      .select('id, username, active, role, user_id, email')
      .eq('username', username.trim())
      .single();

    if (error || !person)
      return NextResponse.json({ ok: false, error: 'username no encontrado' }, { status: 404 });

    if (person.active === false)
      return NextResponse.json({ ok: false, error: 'usuario deshabilitado' }, { status: 403 });

    if (!person.user_id)
      return NextResponse.json({ ok: false, error: 'sin user_id; reprovisiona primero' }, { status: 409 });

    // siempre forzar email determinístico en @fenix.local
    const targetEmail = computeEmail(person.username, person.id, DEFAULT_DOMAIN);

    // actualizar Auth
    const upd = await admin.auth.admin.updateUserById(person.user_id, {
      email: targetEmail,
      password: DEFAULT_PASSWORD,
      user_metadata: { role: person.role, username: person.username }
    });
    if (upd.error) throw upd.error;

    // actualizar people.email si es distinto
    if (!person.email || person.email !== targetEmail) {
      const { error: e2 } = await admin
        .from('people')
        .update({ email: targetEmail })
        .eq('id', person.id);
      if (e2) throw e2;
    }

    return NextResponse.json({
      ok: true,
      email: targetEmail,
      user_id: person.user_id,
      password: DEFAULT_PASSWORD
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? 'error' },
      { status: 500 }
    );
  }
}