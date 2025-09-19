import type { Metadata, Viewport } from 'next';
import './globals.css';
import DevOverlayKiller from '@/components/DevOverlayKiller';
import { FontPreloader } from '@/components/FontPreloader'; // <-- 1. Importa el nuevo componente

export const metadata: Metadata = {
  title: 'Fenix Store | Sistema de Gestión',
  description: 'Dashboard central del sistema de gestión integral de Fenix Store con diseño inspirado en Apple.',
  keywords: ['Fenix Store', 'Dashboard', 'Gestión', 'Sistema'],
  authors: [{ name: 'Fenix Store Team' }],
  creator: 'Fenix Store',
  publisher: 'Fenix Store',
  robots: 'noindex, nofollow',
};

export const viewport: Viewport = {
  themeColor: '#000000',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <head>
        {/* 2. Usa el componente aquí, reemplazando las antiguas etiquetas <link> */}
        <FontPreloader />
        
        {/* Meta tags adicionales para PWA */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Fenix Store" />
        
        {/* Favicon y iconos */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      
      <body 
        className={[
          'font-sans antialiased',
          'bg-black text-white',
          'selection:bg-apple-blue-500/30 selection:text-apple-blue-100',
          'subpixel-antialiased',
          'touch-manipulation',
        ].join(' ')}
        suppressHydrationWarning
      >
        {/* Gradiente de fondo sutil */}
        <div className="fixed inset-0 bg-gradient-to-br from-black via-apple-gray-950 to-black pointer-events-none" />
        
        {/* Efectos de luz ambiental */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-apple-blue-600/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-apple-green-600/5 rounded-full blur-3xl" />
        </div>
        
        {/* Contenido principal */}
        <div className="relative z-10">
          <DevOverlayKiller />
          {children}
        </div>
        
        {/* Scripts de optimización */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              document.addEventListener('gesturestart', function (e) {
                e.preventDefault();
              });
              
              if ('scrollBehavior' in document.documentElement.style) {
                document.documentElement.style.scrollBehavior = 'smooth';
              }
              
              if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                document.documentElement.style.setProperty('--animation-duration', '0.01ms');
              }
            `,
          }}
        />
      </body>
    </html>
  );
}