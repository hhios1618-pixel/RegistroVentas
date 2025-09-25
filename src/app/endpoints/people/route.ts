// src/app/endpoints/people/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /endpoints/people?q=hugo&limit=300
 * Lista personas activas cuyo rol sea ASESOR/VENDEDOR o COORDINADOR/LIDER/SUPERVISOR.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const qRaw = (searchParams.get('q') || '').trim();
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || 500), 1), 1000);

    const sb = supabaseAdmin();

    let query = sb
      .from('people')
      .select('id, full_name, role, fenix_role, local, active, phone, site_id')
      .eq('active', true)
      // incluye cualquier sinónimo en role o fenix_role
      .or([
        'role.ilike.%asesor%',
        'role.ilike.%vendedor%',
        'role.ilike.%coordinad%',
        'role.ilike.%lider%',
        'role.ilike.%supervisor%',
        'fenix_role.ilike.%asesor%',
        'fenix_role.ilike.%vendedor%',
        'fenix_role.ilike.%coordinad%',
        'fenix_role.ilike.%lider%',
        'fenix_role.ilike.%supervisor%',
      ].join(','))
      .order('full_name', { ascending: true });

    if (qRaw.length >= 2) {
      const like = `%${qRaw}%`;
      query = query.or(`full_name.ilike.${like},phone.ilike.${like}`);
    }

    query = query.limit(limit);

    const { data, error } = await query;
    if (error) {
      console.error('[API /people] supabase error:', error);
      return NextResponse.json({ ok: false, error: 'people_fetch_failed', message: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { ok: true, data: data ?? [] },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (e: any) {
    console.error('[API /people] fatal:', e);
    return NextResponse.json(
      { ok: false, error: 'fatal', message: e?.message },
      { status: 500 }
    );
  }
}
