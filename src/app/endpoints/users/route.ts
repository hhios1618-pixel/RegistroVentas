import { NextResponse } from 'next/server';
import { createClient, type PostgrestError } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('supabaseKey is required.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function randomPassword(length = 10) {
  const chars = 'ABCDEFGHJKLmnopqrstuvwxyz23456789$%*!@#';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

const errorMessage = (err: unknown, fallback: string) => {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'string' && err.trim()) return err;
  return fallback;
};

// GET /endpoints/users
export async function GET(req: Request) {
  try {
    const supabase = getAdmin();

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    const role = (searchParams.get('role') || '').trim().toUpperCase();
    const branch = (searchParams.get('branch') || '').trim();
    const activeParam = searchParams.get('active');
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') || 20)));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // NOTE: branch_id es alias de local
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
        branch_id:local,
        phone,
        vehicle_type
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false });

    if (q) {
      query = query.or(
        `full_name.ilike.%${q}%,username.ilike.%${q}%,email.ilike.%${q}%,local.ilike.%${q}%,phone.ilike.%${q}%`
      );
    }
    if (role) query = query.eq('fenix_role', role);
    if (branch === '__none__') {
      query = query.is('local', null);
    } else if (branch) {
      query = query.eq('local', branch);
    }
    if (activeParam === 'true' || activeParam === 'false') query = query.eq('active', activeParam === 'true');

    const { data, error, count } = await query.range(from, to);
    if (error) throw error;

    return NextResponse.json({ ok: true, data, page, pageSize, total: count ?? 0 });
  } catch (err) {
    console.error('GET /endpoints/users error:', err);
    return NextResponse.json({ ok: false, error: errorMessage(err, 'List users failed') }, { status: 500 });
  }
}

// POST /endpoints/users
export async function POST(req: Request) {
  try {
    const supabase = getAdmin();
    const body = (await req.json()) as Record<string, unknown>;

    const full_name: string = String(body.full_name ?? '').trim();
    const fenix_role: string = String(body.fenix_role ?? 'USER').trim().toUpperCase();
    const privilege_level: number = Number(body.privilege_level ?? 1);
    const local: string | null = typeof body.branch_id === 'string' && body.branch_id.trim()
      ? body.branch_id.trim()
      : null; // ← mapea branch_id → local
    const phone: string | null = typeof body.phone === 'string' ? body.phone.trim() || null : null;
    const vehicle_type: string | null = typeof body.vehicle_type === 'string'
      ? body.vehicle_type.trim() || null
      : null;

    if (!full_name) return NextResponse.json({ ok: false, error: 'full_name es requerido' }, { status: 400 });

    const base = full_name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '.')
      .replace(/\.+/g, '.')
      .replace(/^\./, '')
      .replace(/\.$/, '');
    const suffix = Math.random().toString(16).slice(2, 6);
    const username: string = (typeof body.username === 'string' && body.username.trim()
      ? body.username
      : `${base}_${suffix}`).toLowerCase();

    const domain = (process.env.LOGIN_DOMAIN || 'fenix.local').trim();
    const email: string = (typeof body.email === 'string' && body.email.trim()
      ? body.email
      : `${username}@${domain}`).toLowerCase();

    const plain = typeof body.password === 'string' && body.password.length >= 6
      ? body.password
      : randomPassword(10);
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(plain, salt);

    const insertPayload = {
      full_name,
      fenix_role,
      privilege_level,
      local,            // ← columna real
      phone,
      vehicle_type,
      username,
      email,
      active: true,
      password_hash,
      initial_password_plain_text: plain,
    };

    const { data, error } = await supabase.from('people').insert(insertPayload).select('*').single();
    if (error) {
      const pgError = error as PostgrestError;
      const msg = pgError?.code === '23505' ? 'Username o email ya existen' : pgError?.message;
      throw new Error(msg || 'Create user failed');
    }

    return NextResponse.json({ ok: true, data });
  } catch (err) {
    console.error('POST /endpoints/users error:', err);
    return NextResponse.json({ ok: false, error: errorMessage(err, 'Create user failed') }, { status: 500 });
  }
}
