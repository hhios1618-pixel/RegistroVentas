// src/app/endpoints/auth/refresh-role/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'fenix_session';
const COOKIE_DAYS = Number(process.env.SESSION_DAYS || '30');

/** Normaliza a los códigos que usa el front/middleware/layout */
function normalizeRole(raw?: string) {
  const r = (raw || '').toString().trim().toUpperCase();

  // directos a admin (gerencia/admin/administrador)
  if (['GERENCIA', 'GERENTE', 'ADMIN', 'ADMINISTRADOR'].includes(r)) return 'admin';

  // promotor
  if (['PROMOTOR', 'PROMOTORA'].includes(r)) return 'promotor';

  // coordinador / líderes
  if (['COORDINADOR', 'COORDINADORA', 'COORDINACION'].includes(r)) return 'coordinador';
  if (['LIDER', 'JEFE', 'SUPERVISOR'].includes(r)) return 'lider';

  // logística (tu fenix_role “RUTAS” cae acá)
  if (['LOGISTICA', 'RUTAS', 'DELIVERY'].includes(r)) return 'logistica';

  // asesor / ventas
  if (['ASESOR', 'VENDEDOR', 'VENDEDORA'].includes(r)) return 'asesor';

  // si no matchea, lo dejamos como asesor (seguro)
  return 'asesor';
}

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ ok: false, error: 'no-session' }, { status: 401 });
    }

    let payload: any;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch {
      return NextResponse.json({ ok: false, error: 'bad-token' }, { status: 401 });
    }

    const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

    const { data: p, error } = await admin
      .from('people')
      .select('id, username, email, full_name, fenix_role, role, privilege_level, active')
      .eq('id', payload.sub)
      .single();

    if (error || !p) return NextResponse.json({ ok: false, error: 'not-found' }, { status: 404 });
    if (p.active === false) return NextResponse.json({ ok: false, error: 'disabled' }, { status: 403 });

    // Usa fenix_role si existe; si no, role. Luego normaliza.
    const appRole = normalizeRole(p.fenix_role || p.role);

    const now = Math.floor(Date.now() / 1000);
    const expSec = COOKIE_DAYS * 24 * 60 * 60;

    const newPayload = {
      sub: p.id,
      usr: p.username,
      email: p.email,
      name: p.full_name,
      role: appRole,                    // <- normalizado
      lvl: p.privilege_level ?? 1,
      iat: now,
      exp: now + expSec,
    };

    const newToken = jwt.sign(newPayload, JWT_SECRET);

    const res = NextResponse.json({ ok: true, role: appRole });
    res.cookies.set({
      name: COOKIE_NAME,
      value: newToken,
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: expSec,
    });

    return res;
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'error' }, { status: 500 });
  }
}