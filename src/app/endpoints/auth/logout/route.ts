export const runtime = 'nodejs';
// src/app/endpoints/auth/logout/route.ts - ENDPOINT CORREGIDO
import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'fenix_session';

/**
 * GET /endpoints/auth/logout
 * Cierra sesión del usuario y redirige al login
 */
export async function GET(request: NextRequest) {
  try {
    // Obtener URL base para redirección
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                   `${request.nextUrl.protocol}//${request.nextUrl.host}`;
    
    // Crear respuesta de redirección
    const response = NextResponse.redirect(new URL('/login', baseUrl));
    
    // Limpiar cookie de sesión
    response.cookies.set({
      name: COOKIE_NAME,
      value: '',
      path: '/',
      maxAge: 0,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    // Headers de seguridad
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;

  } catch (error) {
    console.error('Error en logout:', error);
    
    // Fallback: respuesta JSON si la redirección falla
    const response = NextResponse.json(
      { ok: true, message: 'Sesión cerrada' },
      { status: 200 }
    );
    
    // Limpiar cookie de sesión
    response.cookies.set({
      name: COOKIE_NAME,
      value: '',
      path: '/',
      maxAge: 0,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    return response;
  }
}

/**
 * POST /endpoints/auth/logout
 * Alternativa para logout vía POST (para formularios o fetch)
 */
export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json(
      { ok: true, message: 'Sesión cerrada exitosamente' },
      { status: 200 }
    );
    
    // Limpiar cookie de sesión
    response.cookies.set({
      name: COOKIE_NAME,
      value: '',
      path: '/',
      maxAge: 0,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    // Headers de seguridad
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;

  } catch (error) {
    console.error('Error en logout POST:', error);
    return NextResponse.json(
      { ok: false, error: 'Error cerrando sesión' },
      { status: 500 }
    );
  }
}

/**
 * Otros métodos HTTP no permitidos
 */
export async function PUT() {
  return NextResponse.json(
    { ok: false, error: 'Método no permitido' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { ok: false, error: 'Método no permitido' },
    { status: 405 }
  );
}
