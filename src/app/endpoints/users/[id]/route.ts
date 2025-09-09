// src/app/endpoints/users/[id]/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('supabaseKey is required.');
  return createClient(url, key);
}

/* ========== GET /endpoints/users/:id ========== */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const supabase = getAdmin();

    const { data, error } = await supabase
      .from('people')
      .select(`
        id, full_name, fenix_role, privilege_level,
        username, email, active, created_at
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    console.error('GET /users/:id error:', err);
    return NextResponse.json(
      { ok: false, error: err?.message || 'Fetch user failed' },
      { status: 500 }
    );
  }
}

/* ========== PATCH /endpoints/users/:id ========== */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const supabase = getAdmin();

    // Solo campos que existen en "people"
    const payload: Record<string, any> = {};

    if (typeof body.full_name === 'string') {
      payload.full_name = body.full_name;
    }

    if (typeof body.email === 'string') {
      payload.email = body.email.toLowerCase();
    }

    // role / fenix_role
    let fenix_role: string | undefined = body.fenix_role ?? body.role;
    if (typeof fenix_role === 'string' && fenix_role.trim()) {
      payload.fenix_role = fenix_role.toUpperCase();
    }

    // privilege_level (solo si es número finito)
    if (body.privilege_level !== undefined && body.privilege_level !== null) {
      const n = Number(body.privilege_level);
      if (Number.isFinite(n)) payload.privilege_level = n;
    }

    if (typeof body.active === 'boolean') {
      payload.active = body.active;
    }

    // NO enviar campos que no existan (branch_id, phone, vehicle_type, etc.)
    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ ok: true, data: null });
    }

    const { data, error } = await supabase
      .from('people')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    console.error('PATCH /users/:id error:', err);
    return NextResponse.json(
      { ok: false, error: err?.message || 'Update failed' },
      { status: 500 }
    );
  }
}

/* ========== POST /endpoints/users/:id (acciones) ========== */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const supabase = getAdmin();

    if (body.action === 'toggle') {
      const { data: one, error: e1 } = await supabase
        .from('people')
        .select('active')
        .eq('id', id)
        .single();
      if (e1) throw e1;

      const next = !one?.active;
      const { error: e2 } = await supabase
        .from('people')
        .update({ active: next })
        .eq('id', id);
      if (e2) throw e2;

      return NextResponse.json({ ok: true, active: next });
    }

    if (body.action === 'reset-password') {
      const newPassword: string = (body.newPassword || '').trim();
      if (!newPassword || newPassword.length < 6) {
        return NextResponse.json(
          { ok: false, error: 'La contraseña debe tener al menos 6 caracteres' },
          { status: 400 }
        );
      }
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(newPassword, salt);

      const { error } = await supabase
        .from('people')
        .update({
          password_hash,
          initial_password_plain_text: newPassword,
        })
        .eq('id', id);

      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      { ok: false, error: 'Acción no soportada' },
      { status: 400 }
    );
  } catch (err: any) {
    console.error('POST /users/:id error:', err);
    return NextResponse.json(
      { ok: false, error: err?.message || 'Action failed' },
      { status: 500 }
    );
  }
}

/* ========== DELETE /endpoints/users/:id ========== */
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const supabase = getAdmin();

    const { error } = await supabase.from('people').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('DELETE /users/:id error:', err);
    return NextResponse.json(
      { ok: false, error: err?.message || 'Delete failed' },
      { status: 500 }
    );
  }
}