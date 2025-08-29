import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,   // ya activado
  },
  reactStrictMode: true,
  typescript: {
    // Actívalo SOLO si aún se cuela algo mientras cierras la demo
    ignoreBuildErrors: false
  }
};

export default nextConfig;