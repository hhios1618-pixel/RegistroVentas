'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { normalizeRole, getRoleHomeRoute, type Role } from '@/lib/auth/roles';

type UserInfo = {
  ok: boolean;
  role?: string;
  full_name?: string;
  id?: string;
};

/**
 * Página de redirección post-login
 * - Obtiene información del usuario autenticado
 * - Redirige a la página apropiada según el rol
 * - Maneja errores de sesión
 */
export default function PostLoginRouter() {
  const router = useRouter();
  const [status, setStatus] = useState<'checking' | 'redirecting' | 'error'>('checking');
  const [message, setMessage] = useState('Verificando sesión…');
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  useEffect(() => {
    let canceled = false;

    const redirectUser = async () => {
      try {
        setStatus('checking');
        setMessage('Verificando sesión…');

        // Obtener información del usuario
        const response = await fetch('/endpoints/me', { 
          cache: 'no-store',
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache',
          },
        });

        const userData: UserInfo = await response.json();

        if (!response.ok || !userData?.ok) {
          throw new Error('Sesión inválida');
        }

        if (canceled) return;

        // Guardar información del usuario
        setUserInfo(userData);

        // Normalizar rol y obtener ruta home
        const normalizedRole = normalizeRole(userData.role) as Role;
        const homeRoute = getRoleHomeRoute(normalizedRole);

        if (!homeRoute || homeRoute === '/post-login') {
          console.warn('[post-login] Ruta home inválida, usando /dashboard', {
            role: userData.role,
            normalizedRole,
            homeRoute,
          });
        }

        setStatus('redirecting');
        setMessage(`Bienvenido ${userData.full_name || 'Usuario'}, redirigiendo a tu inicio…`);

        // Pequeño delay para mostrar el mensaje de bienvenida
        setTimeout(() => {
          router.replace(homeRoute || '/dashboard');
        }, 1500);

      } catch (error) {
        console.error('Error en post-login:', error);
        
        if (canceled) return;

        setStatus('error');
        setMessage('No se pudo resolver tu inicio. Usa los botones de acceso directo.');
      }
    };

    redirectUser();

    return () => {
      canceled = true;
    };
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="max-w-md w-full mx-4 p-8 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl shadow-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">FENIX Store</h1>
          <p className="text-gray-300">Sistema de Gestión Integral</p>
        </div>

        {/* Status Content */}
        <div className="text-center mb-8">
          <p className="text-gray-200 mb-4">{message}</p>
          
          {status !== 'error' && (
            <div className="flex items-center justify-center gap-3 text-gray-400">
              <div className="w-4 h-4 border-2 border-gray-400 border-t-white rounded-full animate-spin" />
              <span className="text-sm">Por favor espera…</span>
            </div>
          )}

          {userInfo && status === 'redirecting' && (
            <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="text-green-400 text-sm">
                Rol: {normalizeRole(userInfo.role)}
              </p>
            </div>
          )}
        </div>

        {/* Error State - Quick Access Buttons */}
        {status === 'error' && (
          <div className="space-y-3">
            <p className="text-center text-gray-400 text-sm mb-4">
              Acceso directo por rol:
            </p>
            
            <div className="grid grid-cols-1 gap-2">
              <a
                href="/dashboard"
                className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-center transition-colors duration-200 text-sm font-medium"
              >
                🏢 Administración
              </a>
              
              <a
                href="/dashboard/asesores/HOME"
                className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg text-center transition-colors duration-200 text-sm font-medium"
              >
                👥 Asesores / Vendedores
              </a>
              
              <a
                href="/dashboard/promotores"
                className="px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-center transition-colors duration-200 text-sm font-medium"
              >
                📢 Promotores
              </a>
              
              <a
                href="/logistica"
                className="px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-center transition-colors duration-200 text-sm font-medium"
              >
                🚚 Logística
              </a>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-700">
              <a
                href="/login"
                className="block w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-center transition-colors duration-200 text-sm"
              >
                ← Volver al Login
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Loading Animation Styles */}
      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </main>
  );
}
