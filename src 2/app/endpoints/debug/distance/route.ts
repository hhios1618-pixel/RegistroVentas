import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * POST /endpoints/debug/distance
 * Body: { site_id: string, lat: number, lng: number }
 * Respuesta: { site_name, site_radius_m, distance_m }
 */
export async function POST(req: Request) {
  try {
    const { site_id, lat, lng } = await req.json();
    if (!site_id || typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json({ error: 'bad_request' }, { status: 400 });
    }

    const { data: site, error } = await supabaseAdmin
      .from('sites')
      .select('id, name, lat, lng, radius_m')
      .eq('id', site_id)
      .maybeSingle();

    if (error || !site) {
      return NextResponse.json({ error: 'site_not_found' }, { status: 404 });
    }

    // Haversine
    const R = 6371000; // m
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat - site.lat);
    const dLng = toRad(lng - site.lng);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(site.lat)) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance_m = R * c;

    return NextResponse.json(
      { site_name: site.name, site_radius_m: site.radius_m, distance_m },
      { status: 200 }
    );
  } catch (e) {
    console.error('[POST /endpoints/debug/distance] unexpected:', e);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}