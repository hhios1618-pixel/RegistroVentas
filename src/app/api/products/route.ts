// app/api/products/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs'; // necesario para usar SERVICE_ROLE en Vercel

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ROLE = process.env.SUPABASE_SERVICE_ROLE!; // mismo nombre que en el resto del proyecto

// Si prefieres errores explícitos en vez de non-null assertion, usa:
// if (!SUPABASE_URL) throw new Error('Missing env: NEXT_PUBLIC_SUPABASE_URL');
// if (!SUPABASE_ROLE) throw new Error('Missing env: SUPABASE_SERVICE_ROLE');

const supabase = createClient(SUPABASE_URL, SUPABASE_ROLE, {
  auth: { persistSession: false },
});

export async function GET(req: Request) {
  // OJO: usar el global URL, no tu constante
  const { searchParams } = new globalThis.URL(req.url);

  const q = (searchParams.get('q') ?? '').trim();
  const limit = Number(searchParams.get('limit') ?? 8);

  if (q.length < 2) {
    return NextResponse.json({ items: [] }, { status: 200 });
  }

  const { data, error } = await supabase
    .from('products')
    .select('code, name, retail_price, stock')
    .or(`code.ilike.%${q}%,name.ilike.%${q}%`)
    .order('name', { ascending: true })
    .limit(limit);

  if (error) {
    return NextResponse.json({ items: [], error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] }, { status: 200 });
}