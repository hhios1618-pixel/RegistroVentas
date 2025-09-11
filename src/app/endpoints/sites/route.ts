import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'fenix_session';
const JWT_SECRET  = process.env.JWT_SECRET || 'dev-secret';

// --- helpers ---
function norm(s: string) {
  return s
    ?.toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')        // sin tildes
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

const ALIASES: Record<string, string[]> = {
  'santa cruz': ['scz', 'sta cruz', 'sta. cruz', 'santacruz', 'santa-cruz'],
  'la paz': ['lpz', 'lapaz', 'la-paz'],
  'cochabamba': ['cocha', 'cbba', 'cocha-bamba', 'cocha bamba'],
  'sucre': [],
  'el alto': ['elalto', 'el-alto', 'alto'],
};

function* expandKeys(n: string) {
  yield n;
  for (const [canon, als] of Object.entries(ALIASES)) {
    if (canon === n || als.includes(n)) {
      yield canon;
      for (const a of als) yield a;
    }
  }
}

function omitNorm<T extends Record<string, any>>(s: T) {
  const { _norm, ...rest } = s;
  return rest;
}

// --- handler ---
/**
 * GET /endpoints/sites
 *  - ?assigned_to=me    -> resuelve por people.local (exacto, alias, fuzzy)
 *  - ?name=<texto>      -> busca por nombre (ILIKE)
 *  - sin query          -> lista activas
 * Respuesta: { results: Site[] }
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const assignedTo = searchParams.get('assigned_to');
  const name = searchParams.get('name');

  // BÚSQUEDA POR NOMBRE LIBRE
  if (name && !assignedTo) {
    const { data, error } = await supabaseAdmin
      .from('sites')
      .select('id, name, lat, lng, radius_m, is_active')
      .ilike('name', `%${name}%`)
      .eq('is_active', true)
      .order('name');
    if (error) return NextResponse.json({ error: 'sites_fetch_failed' }, { status: 500 });
    return NextResponse.json({ results: data ?? [] }, { status: 200 });
  }

  // SEDE ASIGNADA AL USUARIO
  if (assignedTo === 'me') {
    // 1) cookie/jwt
    const raw = req.cookies.get(COOKIE_NAME)?.value;
    if (!raw) return NextResponse.json({ results: [] }, { status: 200 }); // sin sesión -> vacío
    let payload: any;
    try {
      payload = jwt.verify(raw, JWT_SECRET);
    } catch {
      return NextResponse.json({ results: [] }, { status: 200 });
    }

    // 2) people.local del usuario
    const { data: person, error: perr } = await supabaseAdmin
      .from('people')
      .select('id, local')
      .eq('id', payload.sub)
      .maybeSingle();
    if (perr || !person?.local) return NextResponse.json({ results: [] }, { status: 200 });

    const needleRaw = String(person.local);
    const needle = norm(needleRaw);

    // 3) traemos todas activas una sola vez (minimiza idas/vueltas)
    const { data: sites, error: serr } = await supabaseAdmin
      .from('sites')
      .select('id, name, lat, lng, radius_m, is_active')
      .eq('is_active', true);
    if (serr) return NextResponse.json({ results: [] }, { status: 200 });

    // 4) normalizamos nombres
    const normalized = (sites ?? []).map(s => ({
      ...s,
      _norm: norm(s.name),
    }));

    // 4.1 exacto por normalizado
    let match = normalized.find(s => s._norm === needle);
    if (match) return NextResponse.json({ results: [omitNorm(match)] }, { status: 200 });

    // 4.2 por alias
    for (const key of expandKeys(needle)) {
      match = normalized.find(s => s._norm === key);
      if (match) return NextResponse.json({ results: [omitNorm(match)] }, { status: 200 });
    }

    // 4.3 fuzzy: incluye substring
    match = normalized.find(s => s._norm.includes(needle) || needle.includes(s._norm));
    if (match) return NextResponse.json({ results: [omitNorm(match)] }, { status: 200 });

    // 4.4 vacío -> client mostrará "(no mapeada)"
    return NextResponse.json({ results: [] }, { status: 200 });
  }

  // LISTADO GENERAL
  const { data, error } = await supabaseAdmin
    .from('sites')
    .select('id, name, lat, lng, radius_m, is_active')
    .eq('is_active', true)
    .order('name');
  if (error) return NextResponse.json({ error: 'sites_fetch_failed' }, { status: 500 });
  return NextResponse.json({ results: data ?? [] }, { status: 200 });
}