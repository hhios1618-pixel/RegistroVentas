import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const redirectTo = searchParams.get('redirectTo') || '/app';

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Si el usuario llega con el token de OTP en la URL, Supabase lo procesa con getSession desde el navegador.
  // Aquí solo redirigimos a la ruta objetivo; el guard del server verificará membership.
  return NextResponse.redirect(new URL(redirectTo, req.url));
}