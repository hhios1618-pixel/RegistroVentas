import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'fenix_session';
const JWT_SECRET  = process.env.JWT_SECRET || 'dev-secret';

/**
 * GET /endpoints/sites
 *   - ?assigned_to=me  -> resuelve la sede del usuario logeado según people.local (match por nombre)
 *   - ?name=<texto>    -> busca por nombre (ILIKE %texto%)
 *   - sin query        -> lista todas activas ordenadas por nombre
 *
 * Respuesta estándar: { results: [ { id, name, lat, lng, radius_m, is_active } ] }
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const assignedTo = searchParams.get('assigned_to');
  const name = searchParams.get('name');

  // caso 1: buscar por nombre
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

  // caso 2: sede asignada al usuario actual
  if (assignedTo === 'me') {
    // leer y verificar jwt de la cookie
    const cookie = req.cookies.get(COOKIE_NAME)?.value;
    if (!cookie) return NextResponse.json({ error: 'no_session' }, { status: 401 });

    let payload: any;
    try {
      payload = jwt.verify(cookie, JWT_SECRET);
    } catch {
      return NextResponse.json({ error: 'invalid_token' }, { status: 401 });
    }

    // traer people.local del usuario
    const { data: person, error: perr } = await supabaseAdmin
      .from('people')
      .select('id, local')
      .eq('id', payload.sub)
      .maybeSingle();

    if (perr) return NextResponse.json({ error: 'people_lookup_failed' }, { status: 500 });

    // sin local declarado
    if (!person?.local) return NextResponse.json({ results: [] }, { status: 200 });

    // buscar site por coincidencia con el nombre declarado en people.local
    const needle = person.local.trim();
    const { data: sites, error: serr } = await supabaseAdmin
      .from('sites')
      .select('id, name, lat, lng, radius_m, is_active')
      .ilike('name', `%${needle}%`)
      .eq('is_active', true)
      .order('name');

    if (serr) return NextResponse.json({ error: 'sites_fetch_failed' }, { status: 500 });

    return NextResponse.json({ results: sites ?? [] }, { status: 200 });
  }

  // caso 3: listado general
  const { data, error } = await supabaseAdmin
    .from('sites')
    .select('id, name, lat, lng, radius_m, is_active')
    .eq('is_active', true)
    .order('name');

  if (error) return NextResponse.json({ error: 'sites_fetch_failed' }, { status: 500 });
  return NextResponse.json({ results: data ?? [] }, { status: 200 });
}