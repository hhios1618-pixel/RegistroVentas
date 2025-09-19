// src/app/endpoints/admin/provision/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ADMIN_KEY = process.env.ADMIN_PROVISION_KEY!;

const toEmail = (u: string) => `${u}@fenix.local`;

export async function POST(req: NextRequest) {
  // Protección admin simple por header
  const key = req.headers.get('x-admin-key');
  if (!key || key !== ADMIN_KEY) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { ok: false, error: 'username y password obligatorios' },
        { status: 400 }
      );
    }

    const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

    // 1) Buscar persona en tabla people
    const { data: person, error: personErr } = await admin
      .from('people')
      .select('id, role, active, user_id')
      .eq('username', username)
      .single();

    if (personErr || !person) {
      return NextResponse.json({ ok: false, error: 'No existe en people' }, { status: 404 });
    }

    const email = toEmail(username);

    // 2) Crear o actualizar usuario en Supabase Auth
    if (person.user_id) {
      const { error: updErr } = await admin.auth.admin.updateUserById(person.user_id, {
        password,
        email,
        user_metadata: { role: person.role, username }
      });
      if (updErr) throw updErr;
    } else {
      const { data: created, error: crtErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // no envía correo real
        user_metadata: { role: person.role, username }
      });
      if (crtErr) throw crtErr;

      // 3) Vincular user_id en people
      const { error: linkErr } = await admin
        .from('people')
        .update({ user_id: created.user?.id ?? null })
        .eq('id', person.id);

      if (linkErr) throw linkErr;
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'error' }, { status: 500 });
  }
}