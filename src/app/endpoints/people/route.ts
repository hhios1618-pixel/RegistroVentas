import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/people?q=hugo&limit=300
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    const limit = Math.min(Number(searchParams.get('limit') || 500), 1000);

    // Base: activos y NO promotores
    let query = supabaseAdmin
      .from('people')
      .select('id, full_name, role, local, active, phone')
      .eq('active', true)
      .or('role.is.null,role.not.ilike.%promot%') // excluye “promotor”, “promoters”, etc.
      .limit(limit);

    // Búsqueda server (>=2 chars) por nombre o teléfono
    if (q.length >= 2) {
      const like = `%${q}%`;
      query = query.or(`full_name.ilike.${like},phone.ilike.${like}`);
    } else {
      query = query.order('full_name', { ascending: true });
    }

    const { data, error } = await query;
    if (error) {
      console.error('[API /people] supabase error:', error);
      return NextResponse.json({ error: 'people_fetch_failed' }, { status: 500 });
    }
    return NextResponse.json({ data: data ?? [] }, { status: 200 });
  } catch (e) {
    console.error('[API /people] fatal:', e);
    return NextResponse.json({ error: 'fatal' }, { status: 500 });
  }
}