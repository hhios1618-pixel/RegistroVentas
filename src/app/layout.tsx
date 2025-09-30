import type { Metadata, Viewport } from 'next';
import './globals.css';
import DevOverlayKiller from '@/components/DevOverlayKiller';
import { FontPreloader } from '@/components/FontPreloader'; // <-- 1. Importa el nuevo componente
import { ThemeProvider } from '@/components/ThemeProvider';
import { cn } from '@/lib/utils/cn';

const THEME_INIT_SCRIPT = `(function() {
  try {
    var storageKey = 'fenix-os-theme';
    var stored = localStorage.getItem(storageKey);
    var prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    var theme = stored === 'light' || stored === 'dark' ? stored : (prefersLight ? 'light' : 'dark');
    var root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    root.style.colorScheme = theme;
    root.setAttribute('data-theme', theme);
  } catch (error) {
    console.warn('Theme init failed', error);
  }
})();`;

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
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
    { media: '(prefers-color-scheme: light)', color: '#f5f5f7' },
  ],
  colorScheme: 'dark light',
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
    <html lang="es" className="dark" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
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
        className={cn(
          'font-sans antialiased min-h-screen subpixel-antialiased touch-manipulation transition-colors duration-500 ease-apple',
          'bg-[color:var(--app-bg)] text-[color:var(--app-foreground)]',
          'selection:bg-[color:var(--selection-bg)] selection:text-[color:var(--selection-fg)]'
        )}
        suppressHydrationWarning
      >
        {/* Gradiente de fondo sutil */}
        <div className="fixed inset-0 pointer-events-none transition-colors duration-700 ease-apple">
          <div className="absolute inset-0 bg-gradient-to-br from-[#eef3ff] via-[#f6f7fb] to-[#fbfbfd] opacity-95 dark:from-black dark:via-apple-gray-950 dark:to-black" />
        </div>

        {/* Efectos de luz ambiental */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl bg-apple-blue-300/20 dark:bg-apple-blue-600/5" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-3xl bg-apple-green-300/20 dark:bg-apple-green-600/5" />
        </div>

        {/* Contenido principal */}
        <ThemeProvider>
          <div className="relative z-10">
            <DevOverlayKiller />
            {children}
          </div>
        </ThemeProvider>
        
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