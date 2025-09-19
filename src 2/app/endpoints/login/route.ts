import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { compare } from 'bcryptjs';
import { sign } from 'jsonwebtoken';
import { cookies } from 'next/headers';

// Leemos las variables de entorno
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const JWT_SECRET = process.env.JWT_SECRET;

// Creamos un cliente de Supabase para usar en el servidor
const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);

export async function POST(request: Request) {
  if (!JWT_SECRET) {
    console.error('JWT_SECRET no está definido en las variables de entorno');
    return NextResponse.json({ error: 'Error de configuración en el servidor.' }, { status: 500 });
  }

  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email y contraseña son requeridos.' }, { status: 400 });
    }

    const { data: user, error: userError } = await supabase
      .from('people')
      .select('id, email, password_hash, full_name, role')
      .eq('email', email)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'Credenciales inválidas.' }, { status: 401 });
    }

    const passwordMatch = await compare(password, user.password_hash);

    if (!passwordMatch) {
      return NextResponse.json({ error: 'Credenciales inválidas.' }, { status: 401 });
    }

    const userPayload = {
      id: user.id,
      email: user.email,
      name: user.full_name,
      role: user.role,
    };
    
    const token = sign(userPayload, JWT_SECRET, { expiresIn: '7d' });

    // FIX DEFINITIVO: Crear la respuesta y adjuntar la cookie a ella.
    const response = NextResponse.json({ message: 'Login exitoso', user: userPayload });

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 días
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('Error en la API de login:', error);
    return NextResponse.json({ error: 'Ocurrió un error inesperado.' }, { status: 500 });
  }
}
