import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE!;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'fenix_session';
const COOKIE_DAYS = Number(process.env.SESSION_DAYS || '30');

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ ok: false, error: 'no-session' }, { status: 401 });

    let payload: any;
    try { payload = jwt.verify(token, JWT_SECRET); } catch { return NextResponse.json({ ok:false, error:'bad-token' }, { status: 401 }); }

    const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });
    const { data: p, error } = await admin
      .from('people')
      .select('id, username, email, full_name, fenix_role, role, privilege_level, active')
      .eq('id', payload.sub)
      .single();
    if (error || !p) return NextResponse.json({ ok:false, error:'not-found' }, { status: 404 });
    if (p.active === false) return NextResponse.json({ ok:false, error:'disabled' }, { status: 403 });

    const role = String(p.fenix_role || p.role || 'USER').toUpperCase();
    const now = Math.floor(Date.now()/1000);
    const expSec = COOKIE_DAYS*24*60*60;

    const newPayload = {
      sub: p.id, usr: p.username, email: p.email, name: p.full_name,
      role, lvl: p.privilege_level ?? 1, iat: now, exp: now + expSec
    };
    const newToken = jwt.sign(newPayload, JWT_SECRET);

    const res = NextResponse.json({ ok:true, role });
    res.cookies.set({
      name: COOKIE_NAME, value: newToken, httpOnly: true, secure: true,
      sameSite: 'lax', path: '/', maxAge: expSec
    });
    return res;
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message || 'error' }, { status: 500 });
  }
}