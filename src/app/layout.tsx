// src/app/layout.tsx
import type { Metadata, Viewport } from 'next';
import './globals.css';
import DevOverlayKiller from '@/components/DevOverlayKiller';

export const metadata: Metadata = {
  title: 'Fenix Store | Sistema de Gestión',
  description: 'Dashboard central del sistema de gestión integral de Fenix Store.',
};

export const viewport: Viewport = {
  themeColor: '#0B0F17',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body className="font-sans antialiased bg-app text-app-foreground selection:bg-apple-blue/30">
        <DevOverlayKiller />
        <main className="min-h-screen fade-in">{children}</main>
      </body>
    </html>
  );
}