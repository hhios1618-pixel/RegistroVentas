import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'fenix_session';
const JWT_SECRET  = process.env.JWT_SECRET || 'dev-secret';

/* ----------------- normalización + alias ----------------- */
const ALIASES: Record<string, string[]> = {
  'santa cruz': ['scz', 'sta cruz', 'sta. cruz', 'santacruz', 'santa-cruz'],
  'la paz':     ['lpz', 'lapaz', 'la-paz'],
  'cochabamba': ['cocha', 'cbba', 'cocha-bamba', 'cocha bamba'],
  'sucre':      [],
  'el alto':    ['alto', 'elalto', 'el-alto'],
};

// Función de normalización simple, sin la complejidad extra.
function norm(s?: string): string {
  return (s ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[\u00c0-\u00d6]/gi, (c) => 'aeiou'.charAt('aeiou'.indexOf(c.toLowerCase())))
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Construye un filtro OR para la consulta de Supabase.
 * Busca el nombre original y todos sus alias.
 * Ejemplo: para "Santa Cruz" -> "name.ilike.%Santa Cruz%,name.ilike.%scz%,..."
 */
function buildSiteSearchFilter(rawLocationName: string): string {
  const normalized = norm(rawLocationName);
  const searchTerms = new Set([rawLocationName.trim()]); // Búsqueda por nombre original es importante

  // Añadir alias si existen
  const knownAliases = ALIASES[normalized];
  if (knownAliases) {
    knownAliases.forEach(alias => searchTerms.add(alias));
  }

  // Construir el string del filtro
  return Array.from(searchTerms)
    .map(term => `name.ilike.%${term}%`)
    .join(',');
}


/* ------------------------ GET ------------------------ */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const assignedTo = searchParams.get('assigned_to');
  const name = searchParams.get('name');
  const debug = searchParams.get('debug') === '1';

  // BÚSQUEDA LIBRE (sin cambios, ya era eficiente)
  if (name && !assignedTo) {
    const { data, error } = await supabaseAdmin
      .from('sites')
      .select('id, name, lat, lng, radius_m, is_active')
      .ilike('name', `%${name}%`)
      .eq('is_active', true)
      .order('name');
    if (error) return NextResponse.json({ error: 'sites_fetch_failed' }, { status: 500 });
    return NextResponse.json({ results: data ?? [] });
  }

  // RESOLVER SEDE DEL USUARIO (Lógica mejorada)
  if (assignedTo === 'me') {
    // 1) Obtener sesión
    const rawCookie = req.cookies.get(COOKIE_NAME)?.value;
    if (!rawCookie) return NextResponse.json({ results: [], debug: debug ? { reason: 'no_cookie' } : undefined });

    let payload: any;
    try {
      payload = jwt.verify(rawCookie, JWT_SECRET);
    } catch {
      return NextResponse.json({ results: [], debug: debug ? { reason: 'invalid_jwt' } : undefined });
    }

    // 2) Obtener `local` del usuario
    const { data: person, error: personError } = await supabaseAdmin
      .from('people')
      .select('local')
      .eq('id', payload.sub)
      .maybeSingle();

    if (personError || !person?.local) {
      return NextResponse.json({ results: [], debug: debug ? { reason: 'no_person_or_local', personError } : undefined });
    }

    const needleRaw = person.local;

    // 3) Construir filtro y hacer una única consulta a la base de datos
    const filter = buildSiteSearchFilter(needleRaw);
    
    const { data: sites, error: sitesError } = await supabaseAdmin
      .from('sites')
      .select('id, name, lat, lng, radius_m, is_active')
      .eq('is_active', true)
      .or(filter)
      .limit(1); // Solo necesitamos el primer y mejor match

    if (sitesError) {
      return NextResponse.json({ results: [], debug: debug ? { reason: 'sites_query_failed', sitesError, filter } : undefined });
    }

    return NextResponse.json({
      results: sites ?? [],
      debug: debug ? { mode: 'or_filter', needleRaw, filter, resultCount: sites?.length ?? 0 } : undefined
    });
  }

  // LISTADO GENERAL (sin cambios)
  const { data, error } = await supabaseAdmin
    .from('sites')
    .select('id, name, lat, lng, radius_m, is_active')
    .eq('is_active', true)
    .order('name');
  if (error) return NextResponse.json({ error: 'sites_fetch_failed' }, { status: 500 });
  return NextResponse.json({ results: data ?? [] });
}