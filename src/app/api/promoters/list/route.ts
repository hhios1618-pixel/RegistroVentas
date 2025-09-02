import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE as string;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE en .env');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: { persistSession: false },
});

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Pedimos SOLO lo que sabemos que existe: full_name (+ active)
    const { data, error } = await supabase
      .from('people')
      .select('full_name, active')
      .eq('active', true)
      .order('full_name', { ascending: true });

    if (error) throw error;

    // Mapeamos sin depender de un id
    const items = (data || [])
      .map((p) => ({ name: String(p.full_name) }))
      .filter((p) => p.name.trim().length > 0);

    return NextResponse.json({ items });
  } catch (e: any) {
    console.error('[promoters/list] error', e?.message || e);
    return NextResponse.json({ items: [] }, { status: 200 });
  }
}