import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest, context: { params: { id: string } }) {
  try {
    const sb = supabaseAdmin();
    const { params } = context;
    const id = String(params?.id || '').trim();

    if (!id) {
      return NextResponse.json({ ok: false, error: 'missing_id' }, { status: 400 });
    }

    const { data, error } = await sb
      .from('sites')
      .select('id, name, lat, lng, radius_m, is_active')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('[sites/:id] fetch error:', error);
      return NextResponse.json({ ok: false, error: 'fetch_failed' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
    }

    return NextResponse.json(
      { ok: true, result: data },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (e: any) {
    console.error('[sites/:id] fatal:', e);
    return NextResponse.json({ ok: false, error: 'fatal', message: e?.message }, { status: 500 });
  }
}