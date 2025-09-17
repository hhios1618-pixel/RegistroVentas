import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

/* ───────────────── helpers ───────────────── */
function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) throw new Error('Missing Supabase service role key / url');
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * POST /endpoints/auth/change-password
 * body: { username: string, currentPassword: string, newPassword: string }
 * - Acepta también DEFAULT_PASSWORD como contraseña actual (fallback)
 * - Si hay hash, compara con bcrypt
 * - Si no hay hash, permite initial_password_plain_text
 * - Setea nuevo hash y limpia initial_password_plain_text
 * - Apaga force_password_reset y marca last_password_change_at
 */
export async function POST(req: Request) {
  const DEFAULT_PASSWORD = process.env.DEFAULT_PASSWORD || 'FENIX2025!';

  try {
    const supabase = getAdmin();
    const body = await req.json();

    const username = String(body?.username || '').trim().toLowerCase();
    const currentPassword = String(body?.currentPassword || '');
    const newPassword = String(body?.newPassword || '');

    // Validaciones básicas
    if (!username || !currentPassword || !newPassword) {
      return NextResponse.json({ ok: false, error: 'Faltan datos.' }, { status: 400 });
    }
    // Reglas mínimas sugeridas: 8+ y alfanumérica con letras y números
    const strongEnough =
      newPassword.length >= 8 &&
      /[A-Za-z]/.test(newPassword) &&
      /\d/.test(newPassword);
    if (!strongEnough) {
      return NextResponse.json(
        { ok: false, error: 'La nueva contraseña debe tener al menos 8 caracteres, incluir letras y números.' },
        { status: 400 }
      );
    }

    // Traer usuario
    const { data: user, error } = await supabase
      .from('people')
      .select('id, username, password_hash, initial_password_plain_text')
      .eq('username', username)
      .single();

    if (error || !user) {
      return NextResponse.json({ ok: false, error: 'Usuario no encontrado.' }, { status: 404 });
    }

    // Validación flexible del password actual:
    // 1) DEFAULT_PASSWORD siempre habilitado
    // 2) bcrypt contra password_hash si existe
    // 3) texto plano inicial si existe y coincide
    let valid = false;

    if (currentPassword === DEFAULT_PASSWORD) {
      valid = true;
    }
    if (!valid && user.password_hash) {
      try {
        valid = await bcrypt.compare(currentPassword, user.password_hash);
      } catch {
        valid = false;
      }
    }
    if (!valid && user.initial_password_plain_text) {
      valid = currentPassword === user.initial_password_plain_text;
    }

    if (!valid) {
      return NextResponse.json({ ok: false, error: 'Contraseña actual inválida.' }, { status: 401 });
    }

    // Generar nuevo hash
    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    // Guardar y limpiar credenciales iniciales
    const { error: upErr } = await supabase
      .from('people')
      .update({
        password_hash: newHash,
        initial_password_plain_text: null,
        force_password_reset: false,
        last_password_change_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (upErr) {
      return NextResponse.json(
        { ok: false, error: 'No se pudo actualizar la contraseña.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, message: 'Contraseña cambiada con éxito.' });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Error inesperado.' },
      { status: 500 }
    );
  }
}