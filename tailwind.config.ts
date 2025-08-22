import type { Config } from 'tailwindcss'
const { fontFamily } = require('tailwindcss/defaultTheme');

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // --- INICIO DE LAS ADICIONES ---

      // 1. Integración de las fuentes Geist
      // Esto le dice a Tailwind que use tus fuentes personalizadas
      // cuando uses las clases `font-sans` y `font-mono`.
      fontFamily: {
        sans: ['var(--font-geist-sans)', ...fontFamily.sans],
        mono: ['var(--font-geist-mono)', ...fontFamily.mono],
      },

      // 2. Animación para el fondo del dashboard
      // Aquí definimos la animación `pulse-slow` que usamos en la página.
      animation: {
        'pulse-slow': 'pulse-slow 10s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'pulse-slow': {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.2' },
          '50%': { transform: 'scale(1.1)', opacity: '0.3' },
        },
      },

      // --- FIN DE LAS ADICIONES ---
    },
  },
  plugins: [],
}
export default config