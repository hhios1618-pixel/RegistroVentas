// src/app/api/debug/distance/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

function haversineMeters(lat1:number, lon1:number, lat2:number, lon2:number){
  const toRad = (x:number)=>(x*Math.PI)/180;
  const R = 6371000;
  const dLat = toRad(lat2-lat1);
  const dLon = toRad(lon2-lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return 2*R*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

export async function POST(req: Request) {
  try {
    const { site_id, lat, lng } = await req.json();
    if (!site_id || typeof lat!=='number' || typeof lng!=='number') {
      return NextResponse.json({ error: 'bad_input' }, { status: 400 });
    }

    const { data: site, error } = await supabaseAdmin
      .from('sites')
      .select('id, name, lat, lng, radius_m')
      .eq('id', site_id)
      .single();

    if (error || !site || site.lat == null || site.lng == null) {
      return NextResponse.json({ error: 'site_not_found_or_unset' }, { status: 404 });
    }

    const d = haversineMeters(lat, lng, site.lat, site.lng);
    return NextResponse.json({
      distance_m: d,
      site_radius_m: site.radius_m ?? 100,
      site_name: site.name
    });
  } catch (e) {
    return NextResponse.json({ error: 'internal', details: String(e) }, { status: 500 });
  }
}