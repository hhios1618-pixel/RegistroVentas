// src/app/endpoints/debug/distance/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * POST /endpoints/debug/distance
 * Body: { site_id: string, lat: number|string, lng: number|string }
 * Respuesta: { site_name, site_radius_m, distance_m }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const site_id = String(body?.site_id || '').trim();
    const lat = typeof body?.lat === 'number' ? body.lat : Number(body?.lat);
    const lng = typeof body?.lng === 'number' ? body.lng : Number(body?.lng);

    if (!site_id || Number.isNaN(lat) || Number.isNaN(lng)) {
      return NextResponse.json({ error: 'bad_request' }, { status: 400 });
    }

    // ✅ cliente admin INVOCADO
    const sb = supabaseAdmin();

    const { data: site, error } = await sb
      .from('sites')
      .select('id, name, lat, lng, radius_m')
      .eq('id', site_id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!site) {
      return NextResponse.json({ error: 'site_not_found' }, { status: 404 });
    }

    // Haversine (distancia en metros)
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat - site.lat);
    const dLng = toRad(lng - site.lng);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(site.lat)) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance_m = R * c;

    return NextResponse.json(
      {
        site_name: site.name,
        site_radius_m: site.radius_m,
        distance_m,
      },
      { status: 200 }
    );
  } catch (e: any) {
    console.error('[POST /endpoints/debug/distance] unexpected:', e);
    return NextResponse.json({ error: 'internal_error', message: e?.message }, { status: 500 });
  }
}