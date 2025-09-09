import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * PATCH /api/sites/:id
 * Actualiza: name, lat, lng, radius_m, is_active
 * Nota: no tipeamos el 2º argumento para evitar el error del builder de Next 15.
 */
export async function PATCH(req: Request, ctx: any) {
  try {
    const id: string | undefined = ctx?.params?.id;
    if (!id) {
      return NextResponse.json({ error: 'missing_id' }, { status: 400 });
    }

    let body: any = null;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'bad_json' }, { status: 400 });
    }

    const update: Record<string, unknown> = {};
    if (Object.prototype.hasOwnProperty.call(body, 'name')) update.name = body.name;
    if (Object.prototype.hasOwnProperty.call(body, 'lat')) update.lat = body.lat;
    if (Object.prototype.hasOwnProperty.call(body, 'lng')) update.lng = body.lng;
    if (Object.prototype.hasOwnProperty.call(body, 'radius_m')) update.radius_m = body.radius_m;
    if (Object.prototype.hasOwnProperty.call(body, 'is_active')) update.is_active = body.is_active;

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'empty_update' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('sites')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[API /sites/:id PATCH] error:', error);
      return NextResponse.json({ error: 'update_failed' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (e) {
    console.error('[API /sites/:id PATCH] unexpected:', e);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}