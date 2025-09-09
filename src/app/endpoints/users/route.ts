// src/app/endpoints/users/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

// ─────────────────────────────────────────────────────────────
// Supabase admin client (acepta SERVICE_ROLE o SERVICE_ROLE_KEY)
function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('supabaseKey is required.');
  }
  return createClient(url, key);
}

// Pass aleatoria simple
function randomPassword(length = 10) {
  const chars =
    'ABCDEFGHJKLmnopqrstuvwxyz23456789$%*!@#';
  return Array.from({ length }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
}

// ─────────────────────────────────────────────────────────────
// GET /endpoints/users  → lista paginada/filtrada
export async function GET(req: Request) {
  try {
    const supabase = getAdmin();

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    const role = (searchParams.get('role') || '').trim();
    const activeParam = searchParams.get('active'); // "true" | "false" | null
    const page = Number(searchParams.get('page') || 1);
    const pageSize = Number(searchParams.get('pageSize') || 20);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Puedes leer desde una view unificada si la tienes (v_users_admin)
    // Si no, usamos people directamente.
    let query = supabase
      .from('people')
      .select(
        `
        id,
        full_name,
        fenix_role,
        privilege_level,
        username,
        email,
        active,
        created_at,
        branch_id,
        phone
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false });

    if (q) {
      // busca en nombre/username/email
      query = query.or(
        `full_name.ilike.%${q}%,username.ilike.%${q}%,email.ilike.%${q}%`
      );
    }
    if (role) query = query.eq('fenix_role', role);
    if (activeParam === 'true' || activeParam === 'false') {
      query = query.eq('active', activeParam === 'true');
    }

    const { data, error, count } = await query.range(from, to);

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      data,
      page,
      pageSize,
      total: count ?? 0,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'List users failed' },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────
// POST /endpoints/users  → crear usuario (people)
// body: { full_name, fenix_role, privilege_level?, branch_id?, phone?, username?, email?, password? }
export async function POST(req: Request) {
  try {
    const supabase = getAdmin();
    const body = await req.json();

    const full_name: string = (body.full_name || '').trim();
    const fenix_role: string = (body.fenix_role || 'USER').trim().toUpperCase();
    const privilege_level: number = Number(body.privilege_level ?? 1);
    const branch_id: string | null = body.branch_id ?? null;
    const phone: string | null = body.phone ?? null;

    if (!full_name) {
      return NextResponse.json(
        { ok: false, error: 'full_name es requerido' },
        { status: 400 }
      );
    }

    // username / email sintéticos si no vienen
    const base = full_name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '.')
      .replace(/\.+/g, '.')
      .replace(/^\./, '')
      .replace(/\.$/, '');

    const suffix = Math.random().toString(16).slice(2, 6);
    const username: string =
      (body.username || `${base}_${suffix}`).toLowerCase();

    const domain =
      process.env.LOGIN_DOMAIN?.trim() || 'fenix.local';
    const email: string =
      (body.email || `${username}@${domain}`).toLowerCase();

    // password
    const plain =
      typeof body.password === 'string' && body.password.length >= 6
        ? body.password
        : randomPassword(10);
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(plain, salt);

    // Insert
    const insertPayload = {
      full_name,
      fenix_role,
      privilege_level,
      branch_id,
      phone,
      username,
      email,
      active: true,
      password_hash,
      initial_password_plain_text: plain, // puedes limpiar luego con un cron o endpoint
    };

    const { data, error } = await supabase
      .from('people')
      .insert(insertPayload)
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Create user failed' },
      { status: 500 }
    );
  }
}