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

    // 1) Búsqueda libre por nombre (solo activos)
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

    // 2) Sede del usuario (assigned_to=me) → usar auth.users.id (JWT.sub) → people.user_id
    if (assignedTo === 'me') {
      const rawCookie = req.cookies.get(COOKIE_NAME)?.value;
      if (!rawCookie) {
        return NextResponse.json({ ok: true, results: [] }, { headers: { 'Cache-Control': 'no-store' } });
      }

      let payload: any;
      try {
        payload = jwt.verify(rawCookie, JWT_SECRET);
      } catch {
        return NextResponse.json({ ok: true, results: [] }, { headers: { 'Cache-Control': 'no-store' } });
      }

      const authSub = String(payload?.sub || '').trim(); // auth.users.id
      if (!authSub) {
        return NextResponse.json({ ok: true, results: [] }, { headers: { 'Cache-Control': 'no-store' } });
      }

      // Buscar persona por user_id y, como fallback legado, por id
      const { data: person, error: perr } = await sb
        .from('people')
        .select('id, site_id, local')
        .or(`user_id.eq.${authSub},id.eq.${authSub}`)
        .maybeSingle();

      if (perr || !person) {
        return NextResponse.json({ ok: true, results: [] }, { headers: { 'Cache-Control': 'no-store' } });
      }

      // Si tiene site_id → traer el site activo
      if (person.site_id) {
        const { data: site } = await sb
          .from('sites')
          .select('id, name, lat, lng, radius_m, is_active')
          .eq('id', person.site_id)
          .eq('is_active', true)
          .maybeSingle();

        if (site) {
          return NextResponse.json(
            { ok: true, results: [site] },
            { headers: { 'Cache-Control': 'no-store' } }
          );
        }
      }

      // Fallback: intentar match por people.local
      const localName = String(person.local ?? '').trim();
      if (localName) {
        const { data: candidates } = await sb
          .from('sites')
          .select('id, name, lat, lng, radius_m, is_active')
          .ilike('name', `%${localName}%`)
          .eq('is_active', true)
          .order('name');

        if (candidates?.length) {
          return NextResponse.json(
            { ok: true, results: candidates },
            { headers: { 'Cache-Control': 'no-store' } }
          );
        }
      }

      return NextResponse.json({ ok: true, results: [] }, { headers: { 'Cache-Control': 'no-store' } });
    }

    // 3) Listado general (activos)
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
    return NextResponse.json({ ok: false, error: 'fatal', message: e?.message }, { status: 500 });
  }
}