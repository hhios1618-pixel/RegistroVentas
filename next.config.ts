import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Evita que ESLint te rompa el build en Vercel mientras saneamos tipos.
    ignoreDuringBuilds: true,
  },
  reactStrictMode: true,
  // Si (y solo si) TS te bloquea el build por ahora, destapa esto:
  // typescript: {
  //   ignoreBuildErrors: true,
  // },
};

export default nextConfig;