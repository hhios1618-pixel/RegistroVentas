import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const COOKIE = process.env.SESSION_COOKIE_NAME || 'fenix_session';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /endpoints/my/attendance?month=YYYY-MM
 * Responde: { kpis, days[], raw[] }
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const month = (url.searchParams.get('month') || new Date().toISOString().slice(0,7)); // YYYY-MM
    const cookie = req.cookies.get(COOKIE)?.value;
    if (!cookie) return NextResponse.json({ ok:false, error:'no_session' }, { status:401 });

    let payload:any;
    try { payload = jwt.verify(cookie, JWT_SECRET); }
    catch { return NextResponse.json({ ok:false, error:'invalid_token' }, { status:401 }); }

    const personId = payload.sub as string;
    const monthStart = `${month}-01`;
    const monthEnd = new Date(new Date(`${monthStart}T00:00:00Z`).getUTCFullYear(),
                              new Date(`${monthStart}T00:00:00Z`).getUTCMonth()+1, 1)
                        .toISOString().slice(0,10);

    // Trae tus marcas del mes
    const { data: rows, error } = await supabaseAdmin
      .from('attendance')
      .select('id, person_id, site_id, type, taken_at, distance_m, within_geofence, site_name')
      .eq('person_id', personId)
      .gte('taken_at', monthStart)
      .lt('taken_at', monthEnd)
      .order('taken_at', { ascending: true });

    if (error) return NextResponse.json({ ok:false, error:'db_error' }, { status:500 });

    // KPIs rápidos
    const daysSet = new Set<string>();
    let inCount = 0, outCount = 0, geoOk = 0;
    for (const r of rows || []) {
      const d = (r as any).taken_at.slice(0,10);
      daysSet.add(d);
      if ((r as any).type === 'in') inCount++;
      if ((r as any).type === 'out') outCount++;
      if ((r as any).within_geofence) geoOk++;
    }

    const kpis = {
      dias_con_marca: daysSet.size,
      entradas: inCount,
      salidas: outCount,
      pct_geocerca_ok: rows?.length ? Math.round((geoOk / rows.length) * 100) : 0,
    };

    // Agrupado por día (para UI timeline)
    const daysMap: Record<string, any[]> = {};
    for (const r of rows || []) {
      const d = (r as any).taken_at.slice(0,10);
      daysMap[d] = daysMap[d] || [];
      daysMap[d].push(r);
    }
    const days = Object.entries(daysMap).map(([date, marks]) => ({ date, marks }));

    return NextResponse.json({ ok:true, kpis, days, raw: rows }, { status:200, headers:{'Cache-Control':'no-store'} });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error:'server_error', message:e?.message }, { status:500 });
  }
}