// src/app/endpoints/geocode/route.ts
import { NextResponse } from 'next/server';

const KEY = process.env.OPENCAGE_API_KEY || process.env.NEXT_PUBLIC_OPENCAGE_API_KEY;
const NOMINATIM_UA =
  process.env.NOMINATIM_USER_AGENT || 'fenix-store/1.0 (contacto: soporte@fenix.local)';

type GeoComponents = {
  street?: string;
  neighbourhood?: string;
  suburb?: string;
  district?: string;
  city?: string;
  state?: string;
  county?: string;
  postcode?: string;
  country?: string;
};

type GeoOut = {
  formatted: string;
  lat: number;
  lng: number;
  components?: GeoComponents;
  confidence?: number;
  source: 'opencage' | 'nominatim' | 'fallback';
};

const normalizeComponents = (
  input: Record<string, unknown> | null | undefined,
): GeoComponents | undefined => {
  if (!input) return undefined;
  const source = input as Record<string, unknown>;
  const pick = (keys: string[]) => {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return undefined;
  };

  const street = pick(['road', 'street', 'pedestrian', 'path', 'residential', 'highway']);
  const neighbourhood = pick(['neighbourhood', 'neighborhood', 'barrio']);
  const suburb = pick(['suburb', 'quarter']);
  const district = pick(['district', 'city_district']);
  const city = pick(['city', 'town', 'village', 'municipality']);
  const state = pick(['state', 'state_district', 'region', 'province']);
  const county = pick(['county', 'departamento']);
  const postcode = pick(['postcode', 'postal_code']);
  const country = pick(['country']);

  return {
    ...(street ? { street } : {}),
    ...(neighbourhood ? { neighbourhood } : {}),
    ...(suburb ? { suburb } : {}),
    ...(district ? { district } : {}),
    ...(city ? { city } : {}),
    ...(state ? { state } : {}),
    ...(county ? { county } : {}),
    ...(postcode ? { postcode } : {}),
    ...(country ? { country } : {}),
  };
};

function pickQuery(body: unknown): string {
  if (!body || typeof body !== 'object') return '';
  const bag = body as Record<string, unknown>;
  const candidate = bag.query ?? bag.text ?? bag.address ?? bag.q;
  return candidate ? String(candidate).trim() : '';
}

function parseLatLngLiteral(input: string): { lat: number; lng: number } | null {
  const m = input.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
    return { lat, lng };
  }
  return null;
}

function parseGoogleMapsUrl(u: string): { lat: number; lng: number } | null {
  try {
    const url = new URL(u);
    if (!/google\.[^/]*\/maps/.test(url.href)) return null;

    // patrón @lat,lng,zoom
    const at = url.pathname.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    if (at) return { lat: Number(at[1]), lng: Number(at[2]) };

    // query=lat,lng
    const q = url.searchParams.get('query') || url.searchParams.get('q');
    const ll = q && parseLatLngLiteral(q);
    if (ll) return ll;

    // !3dLAT!4dLNG
    const m = url.href.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
    if (m) return { lat: Number(m[1]), lng: Number(m[2]) };

    return null;
  } catch {
    return null;
  }
}

async function opencageForward(q: string): Promise<GeoOut | null> {
  if (!KEY) return null;
  const url = new URL('https://api.opencagedata.com/geocode/v1/json');
  url.searchParams.set('q', q);
  url.searchParams.set('key', KEY);
  url.searchParams.set('language', 'es');
  url.searchParams.set('countrycode', 'bo');
  url.searchParams.set('limit', '1');
  url.searchParams.set('no_annotations', '1');

  const res = await fetch(url.toString(), { cache: 'no-store' });
  const data = await res.json();
  if (!res.ok || !data?.results?.[0]) return null;
  const r = data.results[0];
  return {
    formatted: r.formatted,
    lat: r.geometry.lat,
    lng: r.geometry.lng,
    components: normalizeComponents(r.components),
    confidence: r.confidence,
    source: 'opencage',
  };
}

async function opencageReverse(lat: number, lng: number): Promise<GeoOut | null> {
  if (!KEY) return null;
  const url = new URL('https://api.opencagedata.com/geocode/v1/json');
  url.searchParams.set('q', `${lat},${lng}`);
  url.searchParams.set('key', KEY);
  url.searchParams.set('language', 'es');
  url.searchParams.set('limit', '1');
  url.searchParams.set('no_annotations', '1');

  const res = await fetch(url.toString(), { cache: 'no-store' });
  const data = await res.json();
  if (!res.ok || !data?.results?.[0]) return null;
  const r = data.results[0];
  return {
    formatted: r.formatted,
    lat: r.geometry.lat,
    lng: r.geometry.lng,
    components: normalizeComponents(r.components),
    confidence: r.confidence,
    source: 'opencage',
  };
}

async function nominatimForward(q: string): Promise<GeoOut | null> {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', q);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');
  url.searchParams.set('addressdetails', '1');

  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': NOMINATIM_UA },
    cache: 'no-store',
  });
  const data = await res.json();
  const r = Array.isArray(data) && data[0];
  if (!res.ok || !r) return null;
  return {
    formatted: r.display_name,
    lat: Number(r.lat),
    lng: Number(r.lon),
    components: normalizeComponents(r.address),
    source: 'nominatim',
  };
}

async function nominatimReverse(lat: number, lng: number): Promise<GeoOut | null> {
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lng));
  url.searchParams.set('format', 'json');
  url.searchParams.set('zoom', '18');
  url.searchParams.set('addressdetails', '1');

  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': NOMINATIM_UA },
    cache: 'no-store',
  });
  const data = await res.json();
  if (!res.ok || !data) return null;
  const formatted = data.display_name || `${lat}, ${lng}`;
  return {
    formatted,
    lat,
    lng,
    components: normalizeComponents(data.address),
    source: 'nominatim',
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const input = pickQuery(body);
    if (!input) {
      return NextResponse.json({ error: 'Geocoding query is missing.' }, { status: 400 });
    }

    // a) ¿URL de Google Maps?
    const fromUrl = parseGoogleMapsUrl(input);
    if (fromUrl) {
      const rev = (await opencageReverse(fromUrl.lat, fromUrl.lng)) ||
                  (await nominatimReverse(fromUrl.lat, fromUrl.lng));
      if (rev) return NextResponse.json(rev);
      return NextResponse.json({ formatted: `${fromUrl.lat}, ${fromUrl.lng}`, lat: fromUrl.lat, lng: fromUrl.lng, source: 'fallback' });
    }

    // b) ¿"lat,lng" literal?
    const literal = parseLatLngLiteral(input);
    if (literal) {
      const rev = (await opencageReverse(literal.lat, literal.lng)) ||
                  (await nominatimReverse(literal.lat, literal.lng));
      if (rev) return NextResponse.json(rev);
      return NextResponse.json({ formatted: `${literal.lat}, ${literal.lng}`, lat: literal.lat, lng: literal.lng, source: 'fallback' });
    }

    // c) texto → forward geocoding
    const fwd = (await opencageForward(input)) || (await nominatimForward(input));
    if (fwd) return NextResponse.json(fwd);

    return NextResponse.json({ error: 'No se encontraron resultados.' }, { status: 404 });
  } catch (err) {
    console.error('Error /endpoints/geocode:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: 'An internal server error occurred.', details: message },
      { status: 500 }
    );
  }
}
