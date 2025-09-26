// src/app/endpoints/sites/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { supabaseAdmin, withSupabaseRetry, isSupabaseTransientError } from '@/lib/supabase';
import type { PostgrestResponse, PostgrestSingleResponse } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'fenix_session';
const JWT_SECRET  = process.env.JWT_SECRET || 'dev-secret';

/* ========== Tipos de filas ========== */
type SiteRow = {
  id: string;
  name: string | null;
  lat: number | null;
  lng: number | null;
  radius_m: number | null;
  is_active: boolean | null;
};

type PersonSite = {
  site_id: string | null;
};

/* ========== Helpers de normalización ========== */
const normalize = (value?: string | null) =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const canonicalSite = (raw?: string | null): string | null => {
  const n = normalize(raw);
  if (!n) return null;
  if (n.includes('magdalena 2140')) return 'santa cruz';
  if (n.includes('santa cruz')) return 'santa cruz';
  if (n.includes('calle santa lucia')) return 'sucre';
  if (n.includes('sucre')) return 'sucre';
  if (n.includes('fortin conchita')) return 'cochabamba';
  if (n.includes('cochabamba')) return 'cochabamba';
  if (n.includes('la paz')) return 'la paz';
  if (n.includes('el alto')) return 'el alto';
  return raw ? n : null;
};

function sanitizeSites(list: SiteRow[] = []) {
  const byCanon = new Map<string, SiteRow>();

  for (const site of list) {
    const name = String(site?.name || '').trim();
    if (!name) continue;
    if (name.toLowerCase().includes('test')) continue;

    const key = canonicalSite(name) || normalize(name);
    const current = byCanon.get(key);
    if (!current) {
      byCanon.set(key, site);
      continue;
    }

    const currentLen = String(current.name || '').length;
    const candidateLen = name.length;
    if (candidateLen > currentLen) {
      byCanon.set(key, site);
    }
  }

  return Array.from(byCanon.values()).sort((a, b) =>
    String(a.name || '').localeCompare(String(b.name || ''))
  );
}

/* ========== Handler ========== */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const assignedTo = searchParams.get('assigned_to');
    const name = (searchParams.get('name') || '').trim();

    const sb = supabaseAdmin();

    // ──────────────────────────────────
    // 1) BÚSQUEDA LIBRE POR NOMBRE
    // ──────────────────────────────────
    if (name && !assignedTo) {
      const resp: PostgrestResponse<SiteRow> = await withSupabaseRetry(
        async (): Promise<PostgrestResponse<SiteRow>> => {
          const r = await sb
            .from('sites')
            .select('id, name, lat, lng, radius_m, is_active')
            .ilike('name', `%${name}%`)
            .eq('is_active', true)
            .order('name');
          return r as PostgrestResponse<SiteRow>;
        }
      );

      const { data, error } = resp;
      if (error) {
        console.error('[sites] name search error:', error);
        return NextResponse.json(
          { ok: false, error: 'sites_fetch_failed', data: [], results: [] },
          { status: 500 }
        );
      }

      const sanitized = sanitizeSites((data ?? []) as SiteRow[]);
      return NextResponse.json(
        { ok: true, data: sanitized, results: sanitized },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // ──────────────────────────────────
    // 2) RESOLVER SEDE DEL USUARIO (assigned_to=me)
    // ──────────────────────────────────
    if (assignedTo === 'me') {
      const rawCookie = req.cookies.get(COOKIE_NAME)?.value;
      if (!rawCookie) {
        return NextResponse.json(
          { ok: true, data: [], results: [] },
          { headers: { 'Cache-Control': 'no-store' } }
        );
      }

      let payload: any;
      try {
        payload = jwt.verify(rawCookie, JWT_SECRET);
      } catch {
        return NextResponse.json(
          { ok: true, data: [], results: [] },
          { headers: { 'Cache-Control': 'no-store' } }
        );
      }

      const personId = String(payload?.sub || '').trim();
      if (!personId) {
        return NextResponse.json(
          { ok: true, data: [], results: [] },
          { headers: { 'Cache-Control': 'no-store' } }
        );
      }

      // 2.1 Obtener el site_id del usuario
      const personResp: PostgrestSingleResponse<PersonSite> = await withSupabaseRetry(
        async (): Promise<PostgrestSingleResponse<PersonSite>> => {
          const r = await sb
            .from('people')
            .select('site_id')
            .eq('id', personId)
            .maybeSingle();
          return r as PostgrestSingleResponse<PersonSite>;
        }
      );

      const { data: person, error: personError } = personResp;
      if (personError || !person?.site_id) {
        return NextResponse.json(
          { ok: true, data: [], results: [] },
          { headers: { 'Cache-Control': 'no-store' } }
        );
      }

      // 2.2 Buscar la sucursal por su ID y que esté activa
      const siteResp: PostgrestSingleResponse<SiteRow> = await withSupabaseRetry(
        async (): Promise<PostgrestSingleResponse<SiteRow>> => {
          const r = await sb
            .from('sites')
            .select('id, name, lat, lng, radius_m, is_active')
            .eq('id', person.site_id)
            .eq('is_active', true)
            .maybeSingle();
          return r as PostgrestSingleResponse<SiteRow>;
        }
      );

      const { data: site, error: siteError } = siteResp;
      if (siteError || !site) {
        return NextResponse.json(
          { ok: true, data: [], results: [] },
          { headers: { 'Cache-Control': 'no-store' } }
        );
      }

      const sanitized = sanitizeSites([site]);
      return NextResponse.json(
        { ok: true, data: sanitized, results: sanitized },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // ──────────────────────────────────
    // 3) LISTADO GENERAL (ACTIVOS)
    // ──────────────────────────────────
    const listResp: PostgrestResponse<SiteRow> = await withSupabaseRetry(
      async (): Promise<PostgrestResponse<SiteRow>> => {
        const r = await sb
          .from('sites')
          .select('id, name, lat, lng, radius_m, is_active')
          .eq('is_active', true)
          .order('name');
        return r as PostgrestResponse<SiteRow>;
      }
    );

    const { data, error } = listResp;
    if (error) {
      console.error('[sites] list error:', error);
      return NextResponse.json({ ok: false, error: 'sites_fetch_failed' }, { status: 500 });
    }

    const sanitized = sanitizeSites((data ?? []) as SiteRow[]);
    return NextResponse.json(
      { ok: true, data: sanitized, results: sanitized },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (e: any) {
    if (isSupabaseTransientError(e)) {
      console.error('[sites] Supabase temporalmente no disponible:', e.message);
      return NextResponse.json(
        { ok: false, error: 'supabase_unavailable', data: [], results: [] },
        { status: 503 }
      );
    }
    console.error('[sites] fatal:', e);
    return NextResponse.json(
      { ok: false, error: 'fatal', message: e?.message, data: [], results: [] },
      { status: 500 }
    );
  }
}
