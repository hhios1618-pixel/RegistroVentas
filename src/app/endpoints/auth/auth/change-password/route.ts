import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
   process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase service role key');
  return createClient(url, key);
}

/**
 * POST /endpoints/auth/change-password
 * body: { username: string, currentPassword: string, newPassword: string }
 * - Valida currentPassword (contra password_hash o, si no hay, contra initial_password_plain_text)
 * - Setea nuevo hash
 * - Limpia initial_password_plain_text
 * - Apaga force_password_reset
 */
export async function POST(req: Request) {
  try {
    const supabase = getAdmin();
    const body = await req.json();

    const username = String(body?.username || '').trim().toLowerCase();
    const currentPassword = String(body?.currentPassword || '');
    const newPassword = String(body?.newPassword || '');

    if (!username || !currentPassword || newPassword.length < 6) {
      return NextResponse.json(
        { ok: false, error: 'Datos inválidos' },
        { status: 400 }
      );
    }

    const { data: user, error } = await supabase
      .from('people')
      .select('id, username, password_hash, initial_password_plain_text')
      .eq('username', username)
      .single();

    if (error || !user) {
      return NextResponse.json({ ok: false, error: 'Usuario no encontrado' }, { status: 404 });
    }

    // permite validar con el hash o, si no hay hash, con la contraseña inicial en texto plano
    let valid = false;
    if (user.password_hash) {
      valid = await bcrypt.compare(currentPassword, user.password_hash);
    } else if (user.initial_password_plain_text) {
      valid = currentPassword === user.initial_password_plain_text;
    }

    if (!valid) {
      return NextResponse.json({ ok: false, error: 'Contraseña actual inválida' }, { status: 401 });
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    const { error: upErr } = await supabase
      .from('people')
      .update({
        password_hash: newHash,
        initial_password_plain_text: null,
        force_password_reset: false,
        last_password_change_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (upErr) throw upErr;

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'No se pudo cambiar la contraseña' },
      { status: 500 }
    );
  }
}