/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}', // <- (Recomendado) Asegúrate de incluir ./src
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // Colores inspirados en Apple (esto está perfecto)
      colors: {
        'apple-gray': {
          50: '#f9fafb', 100: '#f3f4f6', 200: '#e5e7eb', 300: '#d1d5db', 400: '#9ca3af',
          500: '#6b7280', 600: '#4b5563', 700: '#374151', 800: '#1f2937', 900: '#111827', 950: '#030712',
        },
        'apple-blue': {
          50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa',
          500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a', 950: '#172554',
        },
        'apple-green': {
          50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac', 400: '#4ade80',
          500: '#22c55e', 600: '#16a34a', 700: '#15803d', 800: '#166534', 900: '#14532d', 950: '#052e16',
        },
        'apple-orange': {
          50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdba74', 400: '#fb923c',
          500: '#f97316', 600: '#ea580c', 700: '#c2410c', 800: '#9a3412', 900: '#7c2d12', 950: '#431407',
        },
        'apple-red': {
          50: '#fef2f2', 100: '#fee2e2', 200: '#fecaca', 300: '#fca5a5', 400: '#f87171',
          500: '#ef4444', 600: '#dc2626', 700: '#b91c1c', 800: '#991b1b', 900: '#7f1d1d', 950: '#450a0a',
        },
        app: {
          background: '#000000', foreground: '#ffffff', muted: '#6b7280',
          border: 'rgba(255, 255, 255, 0.1)', card: 'rgba(0, 0, 0, 0.6)', 'card-hover': 'rgba(0, 0, 0, 0.8)',
        },
        primary: { DEFAULT: '#3b82f6', foreground: '#ffffff' },
        secondary: { DEFAULT: 'rgba(255, 255, 255, 0.1)', foreground: '#ffffff' },
        destructive: { DEFAULT: '#ef4444', foreground: '#ffffff' },
        success: { DEFAULT: '#22c55e', foreground: '#ffffff' },
        warning: { DEFAULT: '#f97316', foreground: '#ffffff' },
      },
      fontFamily: {
        sans: [ '-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif' ],
        mono: [ 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'source-code-pro', 'Menlo', 'Consolas', 'monospace' ],
      },
      fontSize: {
        'apple-caption2': ['11px', { lineHeight: '13px', letterSpacing: '0.06em' }],
        'apple-caption1': ['12px', { lineHeight: '16px', letterSpacing: '0.04em' }],
        'apple-footnote': ['13px', { lineHeight: '18px', letterSpacing: '0.02em' }],
        'apple-subhead': ['15px', { lineHeight: '20px', letterSpacing: '0.01em' }],
        'apple-callout': ['16px', { lineHeight: '21px', letterSpacing: '0.01em' }],
        'apple-body': ['17px', { lineHeight: '22px', letterSpacing: '0.01em' }],
        'apple-headline': ['17px', { lineHeight: '22px', letterSpacing: '0.01em', fontWeight: '600' }],
        'apple-title3': ['20px', { lineHeight: '25px', letterSpacing: '0.01em' }],
        'apple-title2': ['22px', { lineHeight: '28px', letterSpacing: '0.01em' }],
        'apple-title1': ['28px', { lineHeight: '34px', letterSpacing: '0.01em' }],
        'apple-large-title': ['34px', { lineHeight: '41px', letterSpacing: '0.01em' }],
        'apple-h1': ['32px', { lineHeight: '40px', letterSpacing: '-0.02em' }],
        'apple-h2': ['24px', { lineHeight: '32px', letterSpacing: '-0.01em' }],
        'apple-h3': ['20px', { lineHeight: '28px', letterSpacing: '0em' }],
      },
      spacing: {
        'apple-xs': '4px', 'apple-sm': '8px', 'apple': '16px', 'apple-lg': '24px',
        'apple-xl': '32px', 'apple-2xl': '48px', 'apple-3xl': '64px',
      },
      borderRadius: {
        'apple-sm': '6px', 'apple': '12px', 'apple-lg': '16px', 'apple-xl': '20px',
        'apple-2xl': '24px', 'apple-3xl': '32px',
      },
      boxShadow: {
        'apple-sm': '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
        'apple': '0 4px 6px rgba(0, 0, 0, 0.07), 0 1px 3px rgba(0, 0, 0, 0.06)',
        'apple-md': '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
        'apple-lg': '0 20px 25px rgba(0, 0, 0, 0.15), 0 10px 10px rgba(0, 0, 0, 0.04)',
        'apple-xl': '0 25px 50px rgba(0, 0, 0, 0.25)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.37)',
        'glass-sm': '0 2px 16px rgba(0, 0, 0, 0.24)',
        'primary': 'var(--shadow-primary)',
        'success': 'var(--shadow-success)',
        'warning': 'var(--shadow-warning)',
        'danger': 'var(--shadow-danger)',
      },
      backdropBlur: {
        'apple': '20px', 'apple-sm': '12px', 'apple-lg': '40px',
      },
      animation: {
        'apple-fade-in': 'appleFadeIn 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'apple-slide-up': 'appleSlideUp 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'apple-scale': 'appleScale 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'apple-bounce': 'appleBounce 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
      
      // ✅ 1. AQUÍ AGREGAMOS LA SECCIÓN 'keyframes'
      keyframes: {
        appleFadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        appleSlideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        appleScale: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        appleBounce: {
          '0%': { opacity: '0', transform: 'scale(0.3)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      
      transitionTimingFunction: {
        'apple': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'apple-spring': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'apple-ease-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      letterSpacing: {
        'apple-tight': '-0.02em', 'apple-normal': '0em', 'apple-wide': '0.02em',
      },
      zIndex: {
        'dropdown': '1000', 'sticky': '1020', 'fixed': '1030', 'modal-backdrop': '1040',
        'modal': '1050', 'popover': '1060', 'tooltip': '1070', 'toast': '1080',
      },
    },
  },
  // ❌ 2. HEMOS QUITADO EL PLUGIN PERSONALIZADO DE AQUÍ
  plugins: [],
};