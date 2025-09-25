// src/app/(auth)/login/page.tsx - PÁGINA CORREGIDA
import { Suspense } from 'react';
import { LoginClient, Spinner } from './LoginClient'; 

/**
 * Página de login del sistema
 * - Usa Suspense para manejar la carga de SearchParams
 * - Componente del servidor que renderiza el cliente de login
 */
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-black">
          <div className="glass-card text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Spinner />
            </div>
            <p className="apple-body text-white">Cargando interfaz de acceso...</p>
          </div>
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  );
}

/**
 * Metadata para SEO y navegador
 */
export const metadata = {
  title: 'Iniciar Sesión - Fenix Store',
  description: 'Accede al sistema de gestión integral de Fenix Store',
  robots: 'noindex, nofollow', // No indexar página de login
};
