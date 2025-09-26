// src/app/endpoints/attendance/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ——— helpers ———
const U = (s?: string | null) => (s || '').trim().toUpperCase();
const isAllowedRole = (raw?: string | null) => {
  const s = U(raw);
  return (
    s.includes('ASESOR') ||
    s.includes('VENDEDOR') ||
    s.includes('COORDINAD') ||   // COORDINADOR / COORDINADORA
    s.includes('LIDER') ||
    s.includes('SUPERVISOR')
  );
};

export async function GET(req: Request) {
  try {
    const supabase = supabaseAdmin();
    const { searchParams } = new URL(req.url);
    const start = searchParams.get('start');
    const end   = searchParams.get('end');
    const site  = searchParams.get('site_id');
    const q     = (searchParams.get('q') || '').toLowerCase();

    // 1) attendance base
    let att = supabase
      .from('attendance')
      .select(`
        id,
        created_at,
        type,
        lat,
        lng,
        accuracy_m,
        device_id,
        selfie_path,
        person_id,
        site_id
      `)
      .order('created_at', { ascending: false });

    if (start) att = att.gte('created_at', `${start}T00:00:00.000Z`);
    if (end)   att = att.lte('created_at', `${end}T23:59:59.999Z`);
    if (site)  att = att.eq('site_id', site);

    const { data: rows, error: Aerr } = await att;
    if (Aerr) {
      console.error('[attendance] attendance error:', Aerr);
      return NextResponse.json({ error: Aerr.message }, { status: 500 });
    }
    if (!rows?.length) {
      return NextResponse.json({ data: [] }, { headers: { 'Cache-Control': 'no-store' } });
    }

    // 2) joins people/sites (solo roles permitidos)
    const personIds = Array.from(new Set(rows.map((r: any) => r.person_id).filter(Boolean)));
    const siteIds   = Array.from(new Set(rows.map((r: any) => r.site_id).filter(Boolean)));

    let P: any[] = [];
    if (personIds.length) {
      const { data, error } = await supabase
        .from('people')
        .select('id, full_name, role, local')
        .in('id', personIds);
      if (error) {
        console.error('[attendance] people error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      P = (data ?? []).filter((p: any) => isAllowedRole(p?.role));
    }

    let S: any[] = [];
    if (siteIds.length) {
      const { data, error } = await supabase
        .from('sites')
        .select('id, name')
        .in('id', siteIds);
      if (error) {
        console.error('[attendance] sites error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      S = data ?? [];
    }

    const pMap = new Map(P.map((p: any) => [p.id, p]));
    const sMap = new Map(S.map((s: any) => [s.id, s]));

    // 3) salida solo roles permitidos + búsqueda
    const out = (rows as any[])
      .map((r) => ({
        id: r.id,
        created_at: r.created_at,
        type: r.type,
        lat: r.lat,
        lng: r.lng,
        accuracy_m: r.accuracy_m,
        device_id: r.device_id,
        selfie_path: r.selfie_path,
        person_id: r.person_id,
        site_id: r.site_id,
        person: pMap.get(r.person_id) || null,
        site:   sMap.get(r.site_id)   || null,
      }))
      .filter((row) => {
        if (!row.person) return false;
        if (!isAllowedRole(row.person.role)) return false;
        if (q) {
          const name = (row.person?.full_name || '').toLowerCase();
          if (!name.includes(q)) return false;
        }
        return true;
      });

    return NextResponse.json(
      { data: out },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (e: any) {
    console.error('[attendance] server error:', e);
    return NextResponse.json({ error: 'server_error', message: e?.message }, { status: 500 });
  }
}
