import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

// Cliente admin perezoso: solo se crea cuando llega la request
function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // acepta SERVICE_ROLE o SERVICE_ROLE_KEY
  const key =
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE(_KEY)'
    );
  }
  return createClient(url, key);
}

// util simple para passwords aleatorios
function randomPassword(length = 10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@$%!';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// === GET /endpoints/users/[id] ===
export async function GET(_req: Request, { params }: any) {
  const { id } = params as { id: string };
  const supabase = getAdmin();

  const { data, error } = await supabase.from('people').select('*').eq('id', id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ user: data });
}

// === PUT /endpoints/users/[id] ===
export async function PUT(req: Request, { params }: any) {
  const { id } = params as { id: string };
  const supabase = getAdmin();
  const body: any = await req.json();

  const patch: Record<string, any> = {
    full_name: body.full_name,
    role: body.role,
    fenix_role: body.fenix_role,
    privilege_level: body.privilege_level,
    branch_id: body.branch_id,
    phone: body.phone,
    active: body.active,
    email: body.email,
    username: body.username,
  };

  const wantsReset =
    body?.reset_password === true ||
    (typeof body?.password === 'string' && body.password.length > 0);

  let tempPasswordToReturn: string | undefined;

  if (wantsReset) {
    const pwd: string =
      typeof body.password === 'string' && body.password.length > 0
        ? body.password
        : randomPassword(10);

    patch.password_hash = await bcrypt.hash(pwd, 10);
    patch.initial_password_plain_text = null;
    tempPasswordToReturn = typeof body.password === 'string' ? undefined : pwd;
  }

  const { error } = await supabase.from('people').update(patch).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({
    ok: true,
    reset_password: wantsReset,
    temp_password: tempPasswordToReturn,
  });
}

// === DELETE /endpoints/users/[id] ===
export async function DELETE(_req: Request, { params }: any) {
  const { id } = params as { id: string };
  const supabase = getAdmin();

  const { error } = await supabase.from('people').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}