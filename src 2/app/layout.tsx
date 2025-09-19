// src/app/layout.tsx
import type { Metadata, Viewport } from 'next';
import './globals.css';
import DevOverlayKiller from '@/components/DevOverlayKiller';

export const metadata: Metadata = {
  title: 'Fenix Store | Sistema de Gestión',
  description: 'Dashboard central del sistema de gestión integral de Fenix Store.',
};

export const viewport: Viewport = {
  themeColor: '#0e1118', // Un color base oscuro como slate-950
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      {/* CAMBIO:
        - Se establece 'bg-slate-950' como el fondo único para toda la aplicación.
        - Se usa un color de texto base 'text-slate-300'.
        - Se quita la etiqueta <main> de aquí para evitar anidación (tendrás un <main> en el DashboardLayout).
      */}
      <body className="font-sans antialiased bg-slate-950 text-slate-300 selection:bg-apple-blue/30">
        <DevOverlayKiller />
        {children}
      </body>
    </html>
  );
}