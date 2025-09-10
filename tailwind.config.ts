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
      // Tipografía Apple: SF Pro Display/Text con fallback a Inter
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

      colors: {
        // Paleta cromática Apple
        app: {
          DEFAULT: '#0B0F17',         // Fondo principal
          foreground: '#E5E5EA',      // Texto principal (gris Apple)
          card: 'rgba(255,255,255,0.05)', // Glassmorphism cards
          border: 'rgba(255,255,255,0.1)', // Bordes translúcidos
          muted: '#8E8E93',           // Texto secundario (gris neutro Apple)
          'muted-foreground': '#F2F2F7', // Texto claro
        },
        // Azul Apple principal
        apple: {
          blue: '#007AFF',
          'blue-hover': '#0056CC',
        },
        // Estados Apple
        success: '#34C759',
        destructive: '#FF3B30',
        warning: '#FFCC00',
        // Grises neutros Apple
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

      borderRadius: {
        'apple': '16px',      // Radio Apple estándar
        'apple-sm': '12px',   // Radio pequeño
        'apple-lg': '20px',   // Radio grande
      },

      boxShadow: {
        'apple': '0 8px 32px rgba(0,0,0,0.35)',
        'apple-sm': '0 4px 16px rgba(0,0,0,0.25)',
        'apple-lg': '0 16px 64px rgba(0,0,0,0.45)',
        'glass': '0 8px 32px rgba(0,0,0,0.35), 0 1px 0 0 rgba(255,255,255,0.05) inset',
      },

      backdropBlur: {
        'apple': '20px',
      },

      letterSpacing: {
        'apple-tight': '-0.5px',
        'apple-normal': '-0.25px',
      },

      fontSize: {
        'apple-h1': ['2.5rem', { lineHeight: '1.2', letterSpacing: '-0.5px', fontWeight: '700' }],
        'apple-h2': ['2rem', { lineHeight: '1.3', letterSpacing: '-0.25px', fontWeight: '600' }],
        'apple-h3': ['1.5rem', { lineHeight: '1.4', letterSpacing: '-0.25px', fontWeight: '500' }],
        'apple-body': ['0.95rem', { lineHeight: '1.6' }],
      },

      spacing: {
        'apple': '24px',      // Padding interno estándar
        'apple-gap': '16px',  // Gap estándar
      },

      transitionTimingFunction: {
        'apple': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      },
    },
  },
  plugins: [],
};

export default config;

