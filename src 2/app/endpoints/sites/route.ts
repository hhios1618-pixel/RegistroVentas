import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'fenix_session';

// Secreto puesto directamente para la prueba definitiva en Vercel
const JWT_SECRET  = "SDlXnXRRxwAg04YmjXXGEwm/H4Ll69jdo0w2ysfAATo="; 

const ALIASES: Record<string, string[]> = {
  'santa cruz': ['scz', 'sta cruz', 'sta. cruz', 'santacruz', 'santa-cruz'],
  'la paz':     ['lpz', 'lapaz', 'la-paz'],
  'cochabamba': ['cocha', 'cbba', 'cocha-bamba', 'cocha bamba'],
  'sucre':      [],
  'el alto':    ['alto', 'elalto', 'el-alto'],
};

function norm(s?: string): string {
  return (s ?? '').toLowerCase().trim();
}

function buildSiteSearchFilter(rawLocationName: string): string {
  const normalized = norm(rawLocationName);
  const searchTerms = new Set([rawLocationName.trim()]);
  const knownAliases = ALIASES[normalized];
  if (knownAliases) {
    knownAliases.forEach(alias => searchTerms.add(alias));
  }
  return Array.from(searchTerms)
    .map(term => `name.ilike.%${term}%`)
    .join(',');
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const assignedTo = searchParams.get('assigned_to');
  const name = searchParams.get('name');
  const debug = searchParams.get('debug') === '1';

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

  if (assignedTo === 'me') {
    const rawCookie = req.cookies.get(COOKIE_NAME)?.value;
    if (!rawCookie) return NextResponse.json({ results: [], debug: debug ? { reason: 'no_cookie' } : undefined });

    let payload: any;
    try {
      payload = jwt.verify(rawCookie, JWT_SECRET);
    } catch {
      return NextResponse.json({ results: [], debug: debug ? { reason: 'invalid_jwt' } : undefined });
    }

    const { data: person, error: personError } = await supabaseAdmin
      .from('people')
      .select('local')
      .eq('id', payload.sub)
      .maybeSingle();

    if (personError || !person?.local) {
      return NextResponse.json({ results: [], debug: debug ? { reason: 'no_person_or_local', personError } : undefined });
    }

    const needleRaw = person.local.trim();

    // 1. Intento de Coincidencia Exacta (prioridad #1)
    const { data: exactMatch, error: exactError } = await supabaseAdmin
      .from('sites')
      .select('id, name, lat, lng, radius_m, is_active')
      .eq('is_active', true)
      .eq('name', needleRaw)
      .limit(1);

    if (exactError) {
      console.error("Error en búsqueda exacta:", exactError);
    }
    
    if (exactMatch && exactMatch.length > 0) {
      return NextResponse.json({
        results: exactMatch,
        debug: debug ? { mode: 'exact_match', needleRaw, result: exactMatch[0] } : undefined
      });
    }

    // 2. Fallback a Búsqueda Amplia (ILIKE + alias) si no hubo coincidencia exacta
    const filter = buildSiteSearchFilter(needleRaw);
    const { data: fuzzyMatch, error: fuzzyError } = await supabaseAdmin
      .from('sites')
      .select('id, name, lat, lng, radius_m, is_active')
      .eq('is_active', true)
      .or(filter)
      .limit(1);

    if (fuzzyError) {
       return NextResponse.json({ results: [], debug: debug ? { reason: 'fuzzy_query_failed', fuzzyError, filter } : undefined });
    }
    
    return NextResponse.json({
      results: fuzzyMatch ?? [],
      debug: debug ? { mode: 'fuzzy_fallback', needleRaw, filter, result: fuzzyMatch?.[0] } : undefined
    });
  }

  const { data, error } = await supabaseAdmin
    .from('sites')
    .select('id, name, lat, lng, radius_m, is_active')
    .eq('is_active', true)
    .order('name');
  if (error) return NextResponse.json({ error: 'sites_fetch_failed' }, { status: 500 });
  return NextResponse.json({ results: data ?? [] });
}