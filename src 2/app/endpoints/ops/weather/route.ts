import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type CityKey = 'Santa Cruz'|'Sucre'|'La Paz'|'El Alto'|'Cochabamba';

const CITIES: Record<CityKey, {lat:number; lon:number}> = {
  'Santa Cruz':  { lat: -17.7833, lon: -63.1821 },
  'Sucre':       { lat: -19.0333, lon: -65.2627 },
  'La Paz':      { lat: -16.5,    lon: -68.15   },
  'El Alto':     { lat: -16.5047, lon: -68.1633 },
  'Cochabamba':  { lat: -17.3895, lon: -66.1568 },
};

const API = process.env.OPENWEATHER_API_KEY!;
const CACHE_MS = 5 * 60 * 1000;

let cache: { at:number; data:any[] } | null = null;

function kmh(ms?: number) {
  if (ms === undefined || ms === null) return 0;
  return Math.round(ms * 3.6);
}
function riskLevel(rain1h:number, windKmh:number): 'low'|'med'|'high' {
  if (rain1h >= 8 || windKmh >= 40) return 'high';
  if (rain1h >= 2 || windKmh >= 25) return 'med';
  return 'low';
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const list = (searchParams.get('cities') || '')
      .split(',').map(s=>decodeURIComponent(s.trim())).filter(Boolean) as CityKey[];
    const cities: CityKey[] = list.length ? list : Object.keys(CITIES) as CityKey[];

    if (!API) {
      return NextResponse.json({ ok:false, reason:'no_api_key', cities:[], cached:false }, { status:200 });
    }

    if (cache && Date.now() - cache.at < CACHE_MS) {
      const only = cache.data.filter((r:any)=>cities.includes(r.city));
      return NextResponse.json({ ok:true, cities:only, cached:true, ts:cache.at }, { status:200 });
    }

    const calls = cities.map(async (c) => {
      const { lat, lon } = CITIES[c];
      const r = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API}&units=metric&lang=es`,
        { cache:'no-store' }
      );
      const j = await r.json();
      const temp = Math.round(j?.main?.temp ?? 0);
      const condition = j?.weather?.[0]?.description ?? '—';
      const icon = j?.weather?.[0]?.icon ?? '01d';
      const rain1h = Number(j?.rain?.['1h'] ?? 0);
      const wind = kmh(j?.wind?.speed);
      const risk = riskLevel(rain1h, wind);
      return {
        city: c,
        temp,
        condition,
        icon,
        rain_1h: rain1h,
        wind_kmh: wind,
        risk,
        updatedAt: new Date().toISOString(),
        source: 'openweather',
      };
    });

    const data = await Promise.all(calls);
    cache = { at: Date.now(), data };
    return NextResponse.json({ ok:true, cities:data, cached:false, ts:cache.at }, { status:200 });
  } catch (e:any) {
    return NextResponse.json({ ok:false, reason:e?.message ?? 'fail', cities:[], cached:true }, { status:200 });
  }
}