// app/api/products/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  const limit = Number(searchParams.get('limit') || 8);

  if (q.length < 2) {
    return NextResponse.json({ items: [] }, { status: 200 });
  }

  // Buscar por código o nombre
  const { data, error } = await supabase
    .from('products')
    .select('code, name, retail_price, stock')
    .or(`code.ilike.%${q}%,name.ilike.%${q}%`)
    .order('name', { ascending: true })
    .limit(limit);

  if (error) return NextResponse.json({ items: [], error: error.message }, { status: 500 });

  return NextResponse.json({ items: data ?? [] }, { status: 200 });
}