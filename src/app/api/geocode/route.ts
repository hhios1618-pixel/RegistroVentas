// src/app/api/geocode/route.ts
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';
    const limit = Number(searchParams.get('limit') || '8');

    if (!q.trim()) {
      return NextResponse.json([]);
    }

    const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=0&limit=${limit}&q=${encodeURIComponent(
      q,
    )}`;

    // user-agent recomendado por Nominatim
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'ventas-mvp/1.0 (contacto@example.com)',
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      const txt = await res.text();
      return NextResponse.json({ error: txt || 'geocode failed' }, { status: 500 });
    }

    const data = (await res.json()) as any[];

    const out = data
      .map((r) => ({
        label: r.display_name as string,
        pos: { lat: parseFloat(r.lat), lng: parseFloat(r.lon) },
      }))
      .filter((r) => Number.isFinite(r.pos.lat) && Number.isFinite(r.pos.lng));

    return NextResponse.json(out);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'failed' }, { status: 500 });
  }
}