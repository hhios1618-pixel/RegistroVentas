// app/endpoints/products/route.ts  (misma funcionalidad; solo lazy init + runtime node)
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const srv = process.env.SUPABASE_SERVICE_ROLE; // mismo nombre que en el resto
  if (!url) throw new Error('Missing env: NEXT_PUBLIC_SUPABASE_URL');
  if (!srv) throw new Error('Missing env: SUPABASE_SERVICE_ROLE');
  return createClient(url, srv, { auth: { persistSession: false } });
}

export async function GET(req: Request) {
  const { searchParams } = new globalThis.URL(req.url);
  const q = (searchParams.get('q') ?? '').trim();
  const limit = Number(searchParams.get('limit') ?? 8);

  if (q.length < 2) {
    return NextResponse.json({ items: [] }, { status: 200 });
  }

  const supabase = getSupabaseAdmin(); // ← lazy init

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