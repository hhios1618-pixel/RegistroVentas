import { NextResponse } from 'next/server';

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'fenix_session';

export async function GET() {
  // Mata la cookie de sesión y redirige al login
  const res = NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'));
  res.cookies.set({
    name: COOKIE_NAME,
    value: '',
    path: '/',
    maxAge: 0,
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
  });
  return res;
}