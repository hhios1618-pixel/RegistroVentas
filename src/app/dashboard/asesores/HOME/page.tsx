'use client';

import Link from 'next/link';

export default function AsesoresHomePage() {
  return (
    <div className="min-h-[60vh] p-6">
      <h1 className="text-xl font-semibold text-white mb-4">Panel Asesores</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card
          title="Registro de Ventas"
          desc="Captura rápida de ventas diarias."
          href="/dashboard/promotores/registro"
        />
        <Card
          title="Devoluciones"
          desc="Gestión de devoluciones y seguimiento."
          href="/dashboard/Asesores/devoluciones"
        />
        <Card
          title="Playbook WhatsApp"
          desc="Guías y scripts para contacto."
          href="/dashboard/Asesores/playbook-whatsapp"
        />
      </div>
    </div>
  );
}

function Card({ title, desc, href }: { title: string; desc: string; href: string }) {
  return (
    <Link
      href={href}
      className="block rounded-lg border border-[#30363D] bg-[#161B22] p-4 hover:border-cyan-500 transition"
    >
      <div className="text-white font-medium">{title}</div>
      <div className="text-sm text-[#8B949E]">{desc}</div>
    </Link>
  );
}