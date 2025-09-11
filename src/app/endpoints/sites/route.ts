import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'fenix_session';
const JWT_SECRET  = process.env.JWT_SECRET || 'dev-secret';

/* ----------------- normalización + alias ----------------- */
function norm(s?: string) {
  return (s ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')     // sin tildes
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')        // quita símbolos (—() etc.)
    .replace(/\s+/g, ' ')
    .trim();
}

const ALIASES: Record<string, string[]> = {
  'santa cruz': ['scz', 'sta cruz', 'sta. cruz', 'santacruz', 'santa-cruz'],
  'la paz':     ['lpz', 'lapaz', 'la-paz'],
  'cochabamba': ['cocha', 'cbba', 'cocha-bamba', 'cocha bamba'],
  'sucre':      [],
  'el alto':    ['alto', 'elalto', 'el-alto'],
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

function omitNorm<T extends Record<string, any>>(s: T): Omit<T, '_norm'> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _norm, ...rest } = s;
  return rest;
}

/* ------------------------ GET ------------------------ */
/**
 * GET /endpoints/sites
 *  - ?assigned_to=me    -> resuelve por people.local (exacto, alias, fuzzy, y fallback ILIKE)
 *  - ?name=<texto>      -> búsqueda libre
 *  - ?debug=1           -> incluye info de diagnóstico
 *  - sin query          -> lista activas
 * Respuesta: { results: Site[], debug?: any }
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const assignedTo = searchParams.get('assigned_to');
  const name = searchParams.get('name');
  const debug = searchParams.get('debug') === '1';

  // BÚSQUEDA LIBRE
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

  // RESOLVER SEDE DEL USUARIO
  if (assignedTo === 'me') {
    // 1) JWT
    const raw = req.cookies.get(COOKIE_NAME)?.value;
    if (!raw) return NextResponse.json({ results: [], debug: debug ? { reason: 'no_cookie' } : undefined }, { status: 200 });

    let payload: any;
    try {
      payload = jwt.verify(raw, JWT_SECRET);
    } catch {
      return NextResponse.json({ results: [], debug: debug ? { reason: 'invalid_jwt' } : undefined }, { status: 200 });
    }

    // 2) people.local
    const { data: person, error: perr } = await supabaseAdmin
      .from('people')
      .select('id, local')
      .eq('id', payload.sub)
      .maybeSingle();

    if (perr || !person?.local) {
      return NextResponse.json(
        { results: [], debug: debug ? { reason: 'no_person_or_local', perr } : undefined },
        { status: 200 }
      );
    }

    // normaliza el local (recorta espacios raros y guiones)
    const needleRaw = String(person.local).trim();
    const needle = norm(needleRaw);

    // 3) traemos todas activas
    const { data: sites, error: serr } = await supabaseAdmin
      .from('sites')
      .select('id, name, lat, lng, radius_m, is_active')
      .eq('is_active', true);
    if (serr || !sites?.length) {
      return NextResponse.json(
        { results: [], debug: debug ? { reason: 'no_active_sites', serr } : undefined },
        { status: 200 }
      );
    }

    const normalized = sites.map(s => ({ ...s, _norm: norm(s.name) }));

    // 4.1 exacto normalizado
    let match = normalized.find(s => s._norm === needle);
    if (match) {
      return NextResponse.json(
        { results: [omitNorm(match)], debug: debug ? { mode: 'exact', needleRaw, needle } : undefined },
        { status: 200 }
      );
    }

    // 4.2 alias
    for (const key of expandKeys(needle)) {
      match = normalized.find(s => s._norm === key);
      if (match) {
        return NextResponse.json(
          { results: [omitNorm(match)], debug: debug ? { mode: 'alias', needleRaw, needle, alias: key } : undefined },
          { status: 200 }
        );
      }
    }

    // 4.3 fuzzy (substring)
    match = normalized.find(s => s._norm.includes(needle) || needle.includes(s._norm));
    if (match) {
      return NextResponse.json(
        { results: [omitNorm(match)], debug: debug ? { mode: 'fuzzy', needleRaw, needle, matched: match._norm } : undefined },
        { status: 200 }
      );
    }

    // 4.4 fallback final: ILIKE con el texto original completo
    const { data: ilikeData, error: ilikeErr } = await supabaseAdmin
      .from('sites')
      .select('id, name, lat, lng, radius_m, is_active')
      .ilike('name', `%${needleRaw}%`)
      .eq('is_active', true)
      .limit(1);

    if (ilikeErr) {
      return NextResponse.json(
        { results: [], debug: debug ? { mode: 'ilike_error', needleRaw, needle, ilikeErr } : undefined },
        { status: 200 }
      );
    }

    if (ilikeData && ilikeData[0]) {
      return NextResponse.json(
        { results: ilikeData, debug: debug ? { mode: 'ilike', needleRaw, needle } : undefined },
        { status: 200 }
      );
    }

    // Sin match
    return NextResponse.json(
      {
        results: [],
        debug: debug ? {
          mode: 'no_match',
          needleRaw,
          needle,
          site_norms: normalized.slice(0, 10).map(s => ({ id: s.id, name: s.name, _norm: s._norm })) // muestrita
        } : undefined
      },
      { status: 200 }
    );
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