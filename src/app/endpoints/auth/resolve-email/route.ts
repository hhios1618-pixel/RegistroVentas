// src/app/endpoints/auth/resolve-email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DEFAULT_DOMAIN = process.env.LOGIN_DOMAIN || 'fenix.local';

// --- helpers (mismos que el script de provisión) ---
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

// email determinístico: <sanitized>-<id6>@DOMAIN
function computeEmail(username: string, id: string, domain: string) {
  const id6 = (id || '').replace(/-/g, '').slice(0, 6) || crypto.randomBytes(3).toString('hex');
  let local = sanitizeLocalPart(username);
  const maxLocal = 64 - 1 - id6.length; // límite local-part RFC
  if (local.length > maxLocal) local = local.slice(0, maxLocal);
  return `${local}-${id6}@${domain}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const usernameRaw = (body?.username ?? '') as string;

    if (!usernameRaw || typeof usernameRaw !== 'string') {
      return NextResponse.json({ ok: false, error: 'username requerido' }, { status: 400 });
    }

    // Si vino un email directo, úsalo
    if (usernameRaw.includes('@')) {
      return NextResponse.json({ ok: true, email: usernameRaw.trim().toLowerCase(), source: 'input' });
    }

    const username = usernameRaw.trim();
    const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

    // person puede ser null
    let person: Record<string, any> | null = null;

    // exacto
    {
      const { data } = await admin
        .from('people')
        .select('id, username, active, role, user_id, email')
        .eq('username', username)
        .single();
      if (data) person = data;
    }

    // fallback case-insensitive
    if (!person) {
      const { data: arr } = await admin
        .from('people')
        .select('id, username, active, role, user_id, email')
        .ilike('username', username)
        .limit(1);
      person = (arr && arr[0]) ? arr[0] : null;
    }

    if (!person) {
      return NextResponse.json({ ok: false, error: 'username no encontrado' }, { status: 404 });
    }
    if (person.active === false) {
      return NextResponse.json({ ok: false, error: 'usuario deshabilitado' }, { status: 403 });
    }

    let email: string | null = person.email ?? null;
    let source: 'db' | 'computed' = 'db';
    if (!email || !email.includes('@')) {
      email = computeEmail(person.username as string, person.id as string, DEFAULT_DOMAIN);
      source = 'computed';
    }

    return NextResponse.json({ ok: true, email, source, user_id: person.user_id ?? null });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'error' }, { status: 500 });
  }
}