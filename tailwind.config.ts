// tailwind.config.ts
import type { Config } from 'tailwindcss';
const { fontFamily } = require('tailwindcss/defaultTheme');

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      /* ==================== TIPOGRAFÍA ==================== */
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Display',
          'SF Pro Text',
          'Inter',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Helvetica',
          'Arial',
          'system-ui',
          ...fontFamily.sans,
        ],
        mono: ['SF Mono', 'ui-monospace', 'Menlo', 'Monaco', ...fontFamily.mono],
      },

      /* ==================== PALETA ==================== */
      colors: {
        app: {
          DEFAULT: '#0B0F17',
          foreground: '#E5E5EA',
          card: 'rgba(255,255,255,0.05)',
          border: 'rgba(255,255,255,0.1)',
          muted: '#8E8E93',
          'muted-foreground': '#F2F2F7',
        },

        'apple-blue': {
          300: '#93c5fd',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        'apple-green': {
          300: '#86efac',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
        'apple-orange': {
          300: '#fdba74',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
        },
        'apple-red': {
          300: '#fca5a5',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
        },

        success: '#34C759',
        destructive: '#FF3B30',
        warning: '#FFCC00',

        neutral: {
          50: '#F2F2F7',
          100: '#E5E5EA',
          200: '#D1D1D6',
          300: '#C7C7CC',
          400: '#AEAEB2',
          500: '#8E8E93',
          600: '#636366',
          700: '#48484A',
          800: '#3A3A3C',
          900: '#2C2C2E',
        },
      },

      /* ==================== RADIOS / SOMBRAS ==================== */
      borderRadius: {
        apple: '16px',
        'apple-sm': '12px',
        'apple-lg': '20px',
      },
      boxShadow: {
        apple: '0 8px 32px rgba(0,0,0,0.35)',
        'apple-sm': '0 4px 16px rgba(0,0,0,0.25)',
        'apple-lg': '0 16px 64px rgba(0,0,0,0.45)',
        glass: '0 8px 32px rgba(0,0,0,0.35), 0 1px 0 0 rgba(255,255,255,0.05) inset',
      },
      backdropBlur: {
        apple: '20px',
      },

      /* ==================== TRACKING / EASING ==================== */
      letterSpacing: {
        'apple-tight': '-0.5px',
        'apple-normal': '-0.25px',
      },
      transitionTimingFunction: {
        apple: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      },

      /* ==================== TIPOS DE TEXTO ==================== */
      fontSize: {
        'apple-h1': ['2.5rem', { lineHeight: '1.2', letterSpacing: '-0.5px', fontWeight: '700' }],
        'apple-h2': ['2rem',   { lineHeight: '1.3', letterSpacing: '-0.25px', fontWeight: '600' }],
        'apple-h3': ['1.5rem', { lineHeight: '1.4', letterSpacing: '-0.25px', fontWeight: '500' }],
        'apple-body': ['0.95rem', { lineHeight: '1.6' }],

        /* las dos que faltaban */
        'apple-title1': ['2rem',   { lineHeight: '1.25' }],
        'apple-title3': ['1.5rem', { lineHeight: '1.3' }],

        'apple-callout': ['1.125rem', { lineHeight: '1.6' }],
        'apple-footnote': ['0.8125rem', { lineHeight: '1.45' }],
        'apple-caption1': ['0.75rem', { lineHeight: '1.4' }],
        'apple-caption2': ['0.6875rem', { lineHeight: '1.35' }],
      },

      /* ==================== ESPACIADOS ==================== */
      spacing: {
        apple: '24px',
        'apple-sm': '12px',
        'apple-gap': '16px',
      },
    },
  },
  plugins: [],
};

export default config;