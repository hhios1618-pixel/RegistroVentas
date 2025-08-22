// app/layout.tsx

import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

// No es necesario crear constantes nuevas, los objetos importados ya están listos.

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
    <html lang="es" className="dark">
      {/* 👇 CORRECCIÓN FINAL AQUÍ */}
      {/* Usamos directamente las propiedades .variable de los objetos importados */}
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}