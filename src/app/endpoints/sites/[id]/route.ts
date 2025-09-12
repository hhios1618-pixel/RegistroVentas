import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'fenix_session';
const JWT_SECRET  = process.env.JWT_SECRET!;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const assignedTo = searchParams.get('assigned_to');
  const name = searchParams.get('name');

  // BÚSQUEDA LIBRE POR NOMBRE (se mantiene)
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

  // RESOLVER SEDE DEL USUARIO (Lógica Nueva y Robusta con site_id)
  if (assignedTo === 'me') {
    const rawCookie = req.cookies.get(COOKIE_NAME)?.value;
    if (!rawCookie) return NextResponse.json({ results: [] });

    let payload: any;
    try {
      payload = jwt.verify(rawCookie, JWT_SECRET);
    } catch {
      return NextResponse.json({ results: [] });
    }

    // 1. Obtener el site_id del usuario
    const { data: person, error: personError } = await supabaseAdmin
      .from('people')
      .select('site_id')
      .eq('id', payload.sub)
      .single();

    if (personError || !person?.site_id) {
      // Si el usuario no tiene site_id asignado, devolvemos un array vacío.
      return NextResponse.json({ results: [] });
    }
    
    // 2. Buscar la sucursal directamente por su ID.
    const { data: site, error: siteError } = await supabaseAdmin
      .from('sites')
      .select('id, name, lat, lng, radius_m, is_active')
      .eq('id', person.site_id)
      .eq('is_active', true)
      .single();

    if (siteError || !site) {
      // La sucursal asignada podría estar inactiva o haber sido eliminada
      return NextResponse.json({ results: [] });
    }

    // Devolvemos la sucursal encontrada dentro de un array, como espera el frontend
    return NextResponse.json({ results: [site] });
  }

  // LISTADO GENERAL (se mantiene)
  const { data, error } = await supabaseAdmin
    .from('sites')
    .select('id, name, lat, lng, radius_m, is_active')
    .eq('is_active', true)
    .order('name');
  if (error) return NextResponse.json({ error: 'sites_fetch_failed' }, { status: 500 });
  return NextResponse.json({ results: data ?? [] });
}