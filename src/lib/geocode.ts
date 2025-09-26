// src/lib/geocode.ts
export type GeocodeHit = { lat: number; lng: number; label?: string | null };

/** Sesga la búsqueda a Santa Cruz para mejores matches */
export async function geocodeFirstOSM(q: string): Promise<GeocodeHit | null> {
  if (!q?.trim()) return null;

  // viewbox aprox Santa Cruz (lon,lat,lon,lat)
  const params = new URLSearchParams({
    format: 'json',
    addressdetails: '0',
    limit: '1',
    q,
    'accept-language': 'es',
    countrycodes: 'bo',
    viewbox: '-63.40,-17.55,-62.95,-18.05',
    bounded: '1',
  });

  const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'ventas-mvp/1.0 (contacto@example.com)',
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) return null;
  const data = (await res.json()) as any[];
  const f = data?.[0];
  if (!f?.lat || !f?.lon) return null;

  const lat = Number(f.lat);
  const lng = Number(f.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return { lat, lng, label: f.display_name ?? null };
}

/** Si la dirección no menciona ciudad, la añadimos para ayudar al geocoder */
export function normalizeAddressForSantaCruz(raw?: string | null): string | null {
  if (!raw?.trim()) return null;
  return /santa\s*cruz/i.test(raw) ? raw : `${raw}, Santa Cruz, Bolivia`;
}