import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const patch: any = {};
    if (typeof body.lat === 'number') patch.lat = body.lat;
    if (typeof body.lng === 'number') patch.lng = body.lng;
    if (typeof body.radius_m === 'number') patch.radius_m = body.radius_m;

    const { error } = await supabaseAdmin.from('sites').update(patch).eq('id', params.id);
    if (error) return NextResponse.json({ error: 'update_failed' }, { status: 500 });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
}