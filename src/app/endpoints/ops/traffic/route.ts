// src/app/endpoints/ops/traffic/route.ts
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type CityKey = 'Santa Cruz'|'Sucre'|'La Paz'|'El Alto'|'Cochabamba';

type Incident = {
  id: string;
  city: CityKey;
  title: string;         // tipo: accidente, protesta, obra, cierre, etc.
  area: string;          // calle/avenida/zona
  severity: 'low'|'med'|'high';
  updatedAt: string;     // ISO
  lat?: number;
  lon?: number;
  source: 'here';
};

const HERE_API_KEY = process.env.HERE_API_KEY!;
if (!HERE_API_KEY) {
  console.warn('[traffic] Falta HERE_API_KEY en .env');
}

const CACHE_TTL_MS = 3 * 60 * 1000;
let cache: { timestamp: number; payload: any } | null = null;

// BBoxes aproximados (grandes a propósito para capturar perímetros de reparto)
const CITY_BBOX: Record<CityKey, string> = {
  'Santa Cruz':   '-17.96,-63.32;-17.67,-62.95',
  'Sucre':        '-19.10,-65.33;-19.00,-65.17',
  'La Paz':       '-16.59,-68.20;-16.44,-68.00',
  'El Alto':      '-16.60,-68.25;-16.44,-68.05',
  'Cochabamba':   '-17.44,-66.22;-17.29,-66.05',
};

// Mapea severidad HERE → low/med/high
function mapSeverity(h?: string): 'low'|'med'|'high' {
  const v = (h || '').toLowerCase();
  if (v.includes('critical') || v.includes('major') || v.includes('road closed')) return 'high';
  if (v.includes('minor') || v.includes('low')) return 'low';
  return 'med';
}

// Utilidad: timeout en fetch
async function timed<T>(p: Promise<T>, ms = 8000): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)),
  ]);
}

export async function GET(req: Request) {
  try {
    if (cache && Date.now() - cache.timestamp < CACHE_TTL_MS) {
      return NextResponse.json(cache.payload, { status: 200 });
    }

    const { searchParams } = new URL(req.url);
    const citiesParam = searchParams.get('cities') || '';
    const cities: CityKey[] = citiesParam
      ? citiesParam.split(',').map(c => decodeURIComponent(c.trim())) as CityKey[]
      : ['Santa Cruz','Sucre','La Paz','El Alto','Cochabamba'];

    if (!HERE_API_KEY) {
      // sin clave → retorno “sin incidentes”, no invento nada
      return NextResponse.json({ incidents: [], provider: 'here', updatedAt: Date.now() }, { status: 200 });
    }

    const results: Incident[] = [];

    // Llamadas por ciudad (paralelizadas)
    await Promise.all(cities.map(async (city) => {
      const bbox = CITY_BBOX[city];
      if (!bbox) return;

      // HERE Traffic incidents (REST v6.x)
      // Doc: https://developer.here.com/documentation/traffic/dev_guide/topics/incident-data.html
      const url = `https://traffic.ls.hereapi.com/traffic/6.3/incidents.json?bbox=${encodeURIComponent(bbox)}&criticality=critical,major,minor&apiKey=${HERE_API_KEY}`;

      try {
        const resp = await timed(fetch(url, { headers: { 'Accept': 'application/json' } }));
        if (!resp.ok) throw new Error(`here ${resp.status}`);
        const json: any = await resp.json();

        const items: any[] = json?.TRAFFICITEMS?.TRAFFICITEM ?? [];
        for (const it of items) {
          const id = it?.TRAFFICITEMID ?? crypto.randomUUID();
          const kind = it?.TRAFFICITEMDESCRIPTION?.[0]?.value ?? 'Incidente';
          const cause = it?.TRAFFICITEMTYPEDESC ?? '';
          const roads = it?.LOCATION?.ROADS?.[0]?.NAME?.[0]?.value ?? it?.LOCATION?.DESCRIPTION?.[0]?.value ?? '—';
          const lat = it?.LOCATION?.GEOLOC?.ORIGIN?.LATITUDE ?? it?.LOCATION?.GEOLOC?.SHAPEPOLYLINE?.[0]?.LATITUDE;
          const lon = it?.LOCATION?.GEOLOC?.ORIGIN?.LONGITUDE ?? it?.LOCATION?.GEOLOC?.SHAPEPOLYLINE?.[0]?.LONGITUDE;

          // severidad textual
          const sevText = it?.CRITICALITY?.DESCRIPTION ?? it?.TRAFFICITEMSTATUSSHORTDESC ?? '';
          results.push({
            id: String(id),
            city,
            title: (kind || cause || 'Incidente'),
            area: roads,
            severity: mapSeverity(sevText),
            updatedAt: new Date(it?.LASTMODIFIEDTIME || Date.now()).toISOString(),
            lat: typeof lat === 'number' ? lat : undefined,
            lon: typeof lon === 'number' ? lon : undefined,
            source: 'here',
          });
        }
      } catch (e) {
        const message = (e as Error).message;
        if (!message.includes('here 429')) {
          console.error(`[traffic] ${city}:`, message);
        }
      }
    }));

    // Orden: high → med → low
    results.sort((a, b) => {
      const rank = (s: Incident['severity']) => s === 'high' ? 3 : s === 'med' ? 2 : 1;
      return rank(b.severity) - rank(a.severity);
    });

    const payload = { incidents: results, provider: 'here', updatedAt: Date.now() };
    cache = { timestamp: Date.now(), payload };

    return NextResponse.json(payload, { status: 200 });
  } catch (e:any) {
    console.error('[traffic] fatal:', e?.message);
    // Empresa: en error → entrego vacío (operativa normal), nunca datos fake
    return NextResponse.json({ incidents: [], provider: 'here', updatedAt: Date.now() }, { status: 200 });
  }
}
