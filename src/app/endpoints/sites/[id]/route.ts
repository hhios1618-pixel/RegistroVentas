// src/app/endpoints/sites/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'fenix_session';
const JWT_SECRET  = process.env.JWT_SECRET || 'dev-secret';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const assignedTo = searchParams.get('assigned_to');
    const name = (searchParams.get('name') || '').trim();

    const sb = supabaseAdmin();

    // 1) BÚSQUEDA LIBRE POR NOMBRE
    if (name && !assignedTo) {
      const { data, error } = await sb
        .from('sites')
        .select('id, name, lat, lng, radius_m, is_active')
        .ilike('name', `%${name}%`)
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('[sites] name search error:', error);
        return NextResponse.json({ ok: false, error: 'sites_fetch_failed' }, { status: 500 });
      }

      return NextResponse.json(
        { ok: true, results: data ?? [] },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // 2) SEDE DEL USUARIO (assigned_to=me)
    if (assignedTo === 'me') {
      const rawCookie = req.cookies.get(COOKIE_NAME)?.value;
      if (!rawCookie) {
        return NextResponse.json(
          { ok: true, results: [] },
          { headers: { 'Cache-Control': 'no-store' } }
        );
      }

      let payload: any;
      try {
        payload = jwt.verify(rawCookie, JWT_SECRET);
      } catch {
        return NextResponse.json(
          { ok: true, results: [] },
          { headers: { 'Cache-Control': 'no-store' } }
        );
      }

      const personId = String(payload?.sub || '').trim();
      if (!personId) {
        return NextResponse.json(
          { ok: true, results: [] },
          { headers: { 'Cache-Control': 'no-store' } }
        );
      }

      // 2.1 obtener site_id del usuario
      const { data: person, error: personError } = await sb
        .from('people')
        .select('site_id')
        .eq('id', personId)
        .maybeSingle();

      if (personError || !person?.site_id) {
        return NextResponse.json(
          { ok: true, results: [] },
          { headers: { 'Cache-Control': 'no-store' } }
        );
      }

      // 2.2 obtener la sede activa por id
      const { data: site, error: siteError } = await sb
        .from('sites')
        .select('id, name, lat, lng, radius_m, is_active')
        .eq('id', person.site_id)
        .eq('is_active', true)
        .maybeSingle();

      if (siteError || !site) {
        return NextResponse.json(
          { ok: true, results: [] },
          { headers: { 'Cache-Control': 'no-store' } }
        );
      }

      return NextResponse.json(
        { ok: true, results: [site] },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // 3) LISTADO GENERAL (ACTIVOS)
    const { data, error } = await sb
      .from('sites')
      .select('id, name, lat, lng, radius_m, is_active')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('[sites] list error:', error);
      return NextResponse.json({ ok: false, error: 'sites_fetch_failed' }, { status: 500 });
    }

    return NextResponse.json(
      { ok: true, results: data ?? [] },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (e: any) {
    console.error('[sites] fatal:', e);
    return NextResponse.json(
      { ok: false, error: 'fatal', message: e?.message },
      { status: 500 }
    );
  }
}