import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('sites')
    .select('id, name, lat, lng, radius_m, is_active')
    .eq('is_active', true)
    .order('name');
  if (error) return NextResponse.json({ error: 'sites_fetch_failed' }, { status: 500 });
  return NextResponse.json({ data }, { status: 200 });
}