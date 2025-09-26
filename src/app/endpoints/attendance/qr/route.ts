import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { PostgrestError } from '@supabase/supabase-js';
import { supabaseAdmin, withSupabaseRetry, isSupabaseTransientError } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'fenix_session';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const ALLOWED_TYPES = new Set(['in', 'out', 'lunch_in', 'lunch_out'] as const);

type CheckType = 'in' | 'out' | 'lunch_in' | 'lunch_out';

type PersonRow = {
  site_id: string | null;
  active: boolean | null;
};

type SiteRow = {
  id: string;
  is_active: boolean | null;
};

const buildError = (error: string, status: number) =>
  NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });

const clampTtl = (raw: string | null): number => {
  const parsed = Number(raw ?? '60');
  if (!Number.isFinite(parsed) || parsed <= 0) return 60;
  return Math.min(Math.round(parsed), 300);
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const siteId = (searchParams.get('site_id') || '').trim();
    const typeParam = (searchParams.get('type') || '').trim() as CheckType;
    const ttl = clampTtl(searchParams.get('ttl'));

    if (!siteId) return buildError('site_id_required', 400);
    if (!typeParam || !ALLOWED_TYPES.has(typeParam)) return buildError('type_required', 400);

    const session = req.cookies.get(COOKIE_NAME)?.value;
    if (!session) return buildError('no_session', 401);

    let payload: jwt.JwtPayload | string;
    try {
      payload = jwt.verify(session, JWT_SECRET);
    } catch {
      return buildError('invalid_session', 401);
    }

    const personId =
      typeof payload === 'object' && payload !== null ? String(payload.sub ?? '').trim() : '';
    if (!personId) return buildError('invalid_session', 401);

    const supabase = supabaseAdmin();

    const personResult = await withSupabaseRetry<{ data: PersonRow | null; error: PostgrestError | null }>(
      async () => {
        const { data, error } = await supabase
          .from('people')
          .select('site_id, active')
          .eq('id', personId)
          .maybeSingle<PersonRow>();
        return { data, error };
      }
    );

    if (personResult.error || !personResult.data) {
      return buildError('person_not_found', 403);
    }

    if (personResult.data.active === false) {
      return buildError('user_disabled', 403);
    }

    if (personResult.data.site_id && personResult.data.site_id !== siteId) {
      return buildError('site_mismatch', 403);
    }

    const siteResult = await withSupabaseRetry<{ data: SiteRow | null; error: PostgrestError | null }>(
      async () => {
        const { data, error } = await supabase
          .from('sites')
          .select('id, is_active')
          .eq('id', siteId)
          .maybeSingle<SiteRow>();
        return { data, error };
      }
    );

    if (siteResult.error || !siteResult.data) {
      return buildError('site_not_found', 404);
    }

    if (siteResult.data.is_active === false) {
      return buildError('site_inactive', 403);
    }

    const nowIso = new Date().toISOString();

    await withSupabaseRetry(async () => {
      const { error } = await supabase
        .from('qr_tokens')
        .delete()
        .lt('exp_at', nowIso);
      if (error) throw error;
    });

    const randomSixDigits = Math.floor(100000 + Math.random() * 900000).toString();
    const code = `${randomSixDigits}-${typeParam}`;
    const expAt = new Date(Date.now() + ttl * 1000).toISOString();

    const insertResult = await withSupabaseRetry(async () => {
      const { error } = await supabase
        .from('qr_tokens')
        .insert({ site_id: siteId, code, exp_at: expAt });
      if (error) throw error;
      return true;
    });

    if (!insertResult) {
      return buildError('insert_failed', 500);
    }

    return NextResponse.json(
      { code, exp_at: expAt },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error: unknown) {
    if (isSupabaseTransientError(error)) {
      console.error('[attendance/qr] transient supabase error:', error.message);
      return buildError('supabase_unavailable', 503);
    }

    console.error('[attendance/qr] fatal:', error);
    return buildError('internal_error', 500);
  }
}

export async function POST() {
  return buildError('method_not_allowed', 405);
}
