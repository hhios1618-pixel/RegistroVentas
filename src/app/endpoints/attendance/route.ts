// /src/app/endpoints/attendance/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const U = (s?: string | null) => (s || '').trim().toUpperCase();
const isAllowedRole = (raw?: string | null, norm?: string | null) => {
  const s = U(norm || raw);
  return (
    s.includes('ASESOR') ||
    s.includes('VENDEDOR') ||
    s.includes('COORDINAD') || // COORDINADOR/COORDINADORA
    s.includes('LIDER') ||
    s.includes('SUPERVISOR')
  );
};

// Haversine en metros
const distM = (a?: number|null, b?: number|null, c?: number|null, d?: number|null) => {
  if (a==null || b==null || c==null || d==null) return Number.POSITIVE_INFINITY;
  const toRad = (x:number)=>x*Math.PI/180;
  const R = 6371000;
  const dLat = toRad(c - a);
  const dLon = toRad(d - b);
  const lat1 = toRad(a);
  const lat2 = toRad(c);
  const h = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
};

export async function GET(req: Request) {
  try {
    const supabase = supabaseAdmin();
    const { searchParams } = new URL(req.url);

    const start   = searchParams.get('start');  // YYYY-MM-DD
    const end     = searchParams.get('end');    // YYYY-MM-DD
    const site    = searchParams.get('site_id');
    const q       = (searchParams.get('q') || '').toLowerCase();
    const page    = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const perPage = Math.min(500, Math.max(1, parseInt(searchParams.get('per_page') || '200', 10)));
    const offset  = (page - 1) * perPage;

    // 1) attendance base
    let att = supabase
      .from('attendance')
      .select(`
        id, created_at, type,
        lat, lng, accuracy_m, device_id, selfie_path,
        person_id, site_id
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    if (start) att = att.gte('created_at', `${start}T00:00:00.000Z`);
    if (end)   att = att.lte('created_at', `${end}T23:59:59.999Z`);
    if (site)  att = att.eq('site_id', site);

    // Paginación server-side
    att = att.range(offset, offset + perPage - 1);

    const { data: rows, count, error: Aerr } = await att;
    if (Aerr) return NextResponse.json({ error: Aerr.message }, { status: 500 });
    if (!rows?.length) {
      return NextResponse.json({ data: [], meta: { count: 0, page, per_page: perPage } },
        { headers: { 'Cache-Control': 'no-store' } });
    }

    // 2) joins people/sites (solo roles permitidos)
    const personIds = Array.from(new Set(rows.map((r: any) => r.person_id).filter(Boolean)));
    const siteIds   = Array.from(new Set(rows.map((r: any) => r.site_id).filter(Boolean)));

    let P: any[] = [];
    if (personIds.length) {
      const { data, error } = await supabase
        .from('people')
        .select('id, full_name, role, normalized_role, local, site_id')
        .in('id', personIds);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      P = (data ?? []).filter((p: any) => isAllowedRole(p?.role, p?.normalized_role));
    }

    let S: any[] = [];
    if (siteIds.length) {
      const { data, error } = await supabase
        .from('sites')
        .select('id, name, lat, lng, radius_m')
        .in('id', siteIds);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      S = data ?? [];
    }

    const pMap = new Map(P.map((p: any) => [p.id, p]));
    const sMap = new Map(S.map((s: any) => [s.id, s]));

    // 3) salida: roles permitidos + búsqueda + filtros GPS
    const raw = (rows as any[])
      .map((r) => {
        const person = pMap.get(r.person_id) || null;
        const site   = sMap.get(r.site_id)   || null;

        // GPS sanity
        const nearZero = (Math.abs(r.lat ?? 0) < 0.0001 && Math.abs(r.lng ?? 0) < 0.0001);
        const distance_m =
          site ? distM(r.lat, r.lng, site.lat, site.lng) : Number.POSITIVE_INFINITY;
        const gps_valid = !nearZero && Number.isFinite(distance_m) && distance_m <= 2000;

        return {
          id: r.id,
          created_at: r.created_at,
          type: r.type,
          lat: r.lat, lng: r.lng, accuracy_m: r.accuracy_m,
          device_id: r.device_id, selfie_path: r.selfie_path,
          person_id: r.person_id, site_id: r.site_id,
          person, site, distance_m, gps_valid
        };
      })
      .filter((row) => {
        if (!row.person) return false;
        if (q) {
          const name = (row.person?.full_name || '').toLowerCase();
          if (!name.includes(q)) return false;
        }
        return true;
      });

    // 4) anti-doble toque por minuto (person+type+minute)
    const seen = new Set<string>();
    const out: any[] = [];
    for (const r of raw) {
      const minute = new Date(r.created_at);
      minute.setSeconds(0, 0);
      const key = `${r.person_id}|${r.type}|${minute.toISOString()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(r);
    }

    // 5) opcional: devuelve solo GPS válidos (o cámbialo a ambos con flag)
    const filtered = out.filter(r => r.gps_valid);

    return NextResponse.json(
      { data: filtered, meta: { count, page, per_page: perPage } },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (e: any) {
    console.error('[attendance] server error:', e);
    return NextResponse.json({ error: 'server_error', message: e?.message }, { status: 500 });
  }
}