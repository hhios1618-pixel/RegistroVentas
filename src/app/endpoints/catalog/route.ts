import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') ?? '';
  const like = `%${q}%`;
  const { data, error } = await supabase
    .from('products')
    .select('code,name,retail_price,stock')
    .or(`code.ilike.${like},name.ilike.${like}`)
    .eq('active', true)
    .order('name')
    .limit(10);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}