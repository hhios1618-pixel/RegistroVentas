// src/app/layout.tsx
import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import './globals.css';
import LogoutButton from '@/components/LogoutButton';

export const metadata: Metadata = {
  title: 'Fenix Store | Sistema de Gestión',
  description: 'Dashboard central del sistema de gestión integral de Fenix Store.',
};

export const viewport: Viewport = {
  themeColor: '#0B0F17',
};

// Se mantiene como función 'async'
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // FIX: Añadido 'await' para resolver la promesa de headers()
  // Esta línea es la que soluciona el error de la captura.
  const heads = await headers();
  const pathname = heads.get('next-url') || '';
  const showNavbar = !pathname.startsWith('/login');

  return (
    <html lang="es" className="dark">
      <body className="font-sans antialiased bg-app text-app-foreground selection:bg-apple-blue/30">
        
        {showNavbar && (
          <div className="sticky top-0 z-50 w-full glass border-b border-app-border">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
              <div className="flex items-center justify-between py-3">
                {/* Brand */}
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-apple-sm bg-apple-blue flex items-center justify-center shadow-apple-sm">
                    <span className="text-white font-bold text-sm">F</span>
                  </div>
                  <span className="h3 text-app-foreground font-semibold tracking-tight">
                    Fenix Store
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2">
                  <LogoutButton className="!px-3 !py-1.5 !text-xs" />
                </div>
              </div>
            </div>
          </div>
        )}

        <main className="min-h-screen fade-in">
          {children}
        </main>
      </body>
    </html>
  );
}