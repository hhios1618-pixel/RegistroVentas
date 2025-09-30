// src/app/endpoints/users/[id]/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY||
  process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('supabaseKey is required.');
  return createClient(url, key);
}

const errorMessage = (err: unknown, fallback: string) => {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'string' && err.trim()) return err;
  return fallback;
};

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
  } catch (err) {
    console.error('GET /users/:id error:', err);
    return NextResponse.json(
      { ok: false, error: errorMessage(err, 'Fetch user failed') },
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
    const body = (await req.json()) as Record<string, unknown>;
    const supabase = getAdmin();

    // Solo campos que existen en "people"
    const payload: Record<string, unknown> = {};

    if (typeof body.full_name === 'string') {
      payload.full_name = body.full_name;
    }

    if (typeof body.email === 'string') {
      payload.email = body.email.toLowerCase();
    }

    // role / fenix_role
    const fenixRoleRaw = body.fenix_role ?? body.role;
    if (typeof fenixRoleRaw === 'string' && fenixRoleRaw.trim()) {
      payload.fenix_role = fenixRoleRaw.toUpperCase();
    }

    // privilege_level (solo si es número finito)
    if (body.privilege_level !== undefined && body.privilege_level !== null) {
      const n = Number(body.privilege_level);
      if (Number.isFinite(n)) payload.privilege_level = n;
    }

    if (typeof body.active === 'boolean') {
      payload.active = body.active;
    }

    if (body.branch_id !== undefined || body.local !== undefined) {
      const raw = body.branch_id ?? body.local;
      const normalized = typeof raw === 'string' ? raw.trim() : raw;
      payload.local = normalized ? String(normalized) : null;
    }

    if (body.phone !== undefined) {
      const phone = typeof body.phone === 'string' ? body.phone.trim() : body.phone;
      payload.phone = phone ? String(phone) : null;
    }

    if (body.vehicle_type !== undefined) {
      const vehicle = typeof body.vehicle_type === 'string' ? body.vehicle_type.trim() : body.vehicle_type;
      payload.vehicle_type = vehicle ? String(vehicle) : null;
    }

    // Si no hay cambios, devolver success vacío para evitar UPDATE innecesario
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
  } catch (err) {
    console.error('PATCH /users/:id error:', err);
    return NextResponse.json(
      { ok: false, error: errorMessage(err, 'Update failed') },
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
    const body = (await req.json()) as Record<string, unknown>;
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
      const newPassword = typeof body.newPassword === 'string' ? body.newPassword.trim() : '';
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
  } catch (err) {
    console.error('POST /users/:id error:', err);
    return NextResponse.json(
      { ok: false, error: errorMessage(err, 'Action failed') },
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
  } catch (err) {
    console.error('DELETE /users/:id error:', err);
    return NextResponse.json(
      { ok: false, error: errorMessage(err, 'Delete failed') },
      { status: 500 }
    );
  }
}
