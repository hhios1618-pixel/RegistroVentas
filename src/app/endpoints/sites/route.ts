// src/app/endpoints/sites/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'fenix_session';
const JWT_SECRET  = process.env.JWT_SECRET || 'dev-secret';

/* =========================
   Normalización y aliases
   ========================= */

// Normaliza agresivo: sin tildes, minúsculas, quita símbolos, colapsa espacios.
function norm(s?: string) {
  return (s ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita diacríticos
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')    // quita todo lo que no sea a-z/0-9/espacio (guiones, paréntesis, etc.)
    .replace(/\s+/g, ' ')            // colapsa espacios
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

// Util para eliminar el campo interno _norm antes de responder
function omitNorm<T extends Record<string, any>>(s: T): Omit<T, '_norm'> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _norm, ...rest } = s;
  return rest;
}

/* ================
   Handlers
   ================ */

/**
 * GET /endpoints/sites
 *  - ?assigned_to=me  -> resuelve sucursal asignada vía people.local (exacto, alias y fuzzy)
 *  - ?name=<texto>    -> búsqueda por nombre (ILIKE)
 *  - sin query        -> lista todas las activas
 * Respuesta: { results: Site[] }
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const assignedTo = searchParams.get('assigned_to');
    const name = searchParams.get('name');

    // BÚSQUEDA LIBRE POR NOMBRE
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

    // SUCURSAL ASIGNADA AL USUARIO (people.local)
    if (assignedTo === 'me') {
      // 1) JWT desde cookie
      const raw = req.cookies.get(COOKIE_NAME)?.value;
      if (!raw) return NextResponse.json({ results: [] }, { status: 200 });

      let payload: any;
      try {
        payload = jwt.verify(raw, JWT_SECRET);
      } catch {
        return NextResponse.json({ results: [] }, { status: 200 });
      }

      // 2) Traer local declarado en people
      const { data: person, error: perr } = await supabaseAdmin
        .from('people')
        .select('id, local')
        .eq('id', payload.sub)
        .maybeSingle();
      if (perr || !person?.local) return NextResponse.json({ results: [] }, { status: 200 });

      const needleRaw = String(person.local);
      const needle = norm(needleRaw);

      // 3) Traer todas las activas una sola vez
      const { data: sites, error: serr } = await supabaseAdmin
        .from('sites')
        .select('id, name, lat, lng, radius_m, is_active')
        .eq('is_active', true);
      if (serr || !sites?.length) return NextResponse.json({ results: [] }, { status: 200 });

      // 4) Normalizar nombres de sites
      const normalized = sites.map(s => ({ ...s, _norm: norm(s.name) }));

      // 4.1 exacto
      let match = normalized.find(s => s._norm === needle);
      if (match) return NextResponse.json({ results: [omitNorm(match)] }, { status: 200 });

      // 4.2 por alias (para needle)
      for (const key of expandKeys(needle)) {
        match = normalized.find(s => s._norm === key);
        if (match) return NextResponse.json({ results: [omitNorm(match)] }, { status: 200 });
      }

      // 4.3 fuzzy: substring en ambas direcciones
      match = normalized.find(s => s._norm.includes(needle) || needle.includes(s._norm));
      if (match) return NextResponse.json({ results: [omitNorm(match)] }, { status: 200 });

      // 4.4 sin match
      return NextResponse.json({ results: [] }, { status: 200 });
    }

    // LISTADO GENERAL (activas)
    const { data, error } = await supabaseAdmin
      .from('sites')
      .select('id, name, lat, lng, radius_m, is_active')
      .eq('is_active', true)
      .order('name');
    if (error) return NextResponse.json({ error: 'sites_fetch_failed' }, { status: 500 });
    return NextResponse.json({ results: data ?? [] }, { status: 200 });
  } catch (e) {
    console.error('[endpoints/sites] GET failed:', e);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}