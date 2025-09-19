import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function sbAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET() {
  const sb = sbAdmin();
  try {
    const { data, error } = await sb
      .from('monthly_sales_summary')
      .select('*')
      .order('summary_date', { ascending: true });

    if (error) throw error;

    return NextResponse.json(data, { status: 200 });
  } catch (e: any) {
    console.error(`Error en API de sales-summary: ${e.message}`);
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}