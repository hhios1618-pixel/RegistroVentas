// En: src/app/layout.tsx

import type { Metadata } from "next";
// CORRECCIÓN: Se importan las funciones de las fuentes
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import "./globals.css";
import LogoutButton from "@/components/LogoutButton";

export const metadata: Metadata = {
  title: "Fenix Store | Sistema de Gestión",
  description: "Dashboard central del sistema de gestión integral de Fenix Store.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // CORRECCIÓN: Se usan .className en lugar de .variable
    <html lang="es" className={`${GeistSans.className} ${GeistMono.className} dark`}>
      <body>
        {/* Barra superior con Logout */}
        <div className="w-full flex justify-end p-4 border-b border-white/10 bg-black/30 backdrop-blur-md">
          <LogoutButton />
        </div>

        {/* Contenido */}
        <main>{children}</main>
      </body>
    </html>
  );
}