// src/app/coordinadores/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';

type Me = { ok: boolean; role?: string; full_name?: string };

export default function CoordinadoresHome() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/endpoints/me', { cache: 'no-store' });
        const j = await r.json();
        setMe(j);
      } catch (e) {
        console.error('Error /endpoints/me', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const role = useMemo(() => (me?.role || '').toString().trim().toUpperCase(), [me]);
  const allowed = !!me?.ok && (['COORDINADOR','COORDINADORA','ADMIN','GERENCIA','LIDER'].includes(role));

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* fondo sutil */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto p-6 space-y-8">
        {/* header */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">FENIX — Coordinación</h1>
            <p className="text-white/60 text-sm">Panel de acciones rápidas del coordinador</p>
          </div>
          <a href="/" className="text-sm text-gray-300 hover:text-white border border-white/10 bg-white/5 px-3 py-1.5 rounded-lg">
            ← Ir al inicio
          </a>
        </header>

        {/* guard */}
        {!loading && !allowed && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
            No tienes permisos para esta vista.
          </div>
        )}

        {/* grid acciones */}
        {allowed && (
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <Tile
              href="/asistencia"
              title="Marcar Asistencia"
              desc="Registro con selfie + GPS + QR."
              kbd="A"
            />
            <Tile
              href="/admin/asistencia/resumen"
              title="Resumen de Asistencia"
              desc="Entradas/Salidas del equipo por fecha."
              kbd="R"
            />
            <Tile
              href="/logistica"
              title="Panel de Logística"
              desc="Visión de rutas, envíos y entregas."
              kbd="L"
            />
            <Tile
              href="/dashboard/captura"
              title="Captura / Embudo"
              desc="Seguimiento de leads y pedidos."
              kbd="C"
            />
            <Tile
              href="/dashboard/vendedores"
              title="Vendedores"
              desc="Rendimiento e indicadores del equipo."
              kbd="V"
            />
            <Tile
              href="/dashboard/asesores/playbook-whatsapp"
              title="Central Operativa"
              desc="Procesos y guías críticas para la operación."
              kbd="P"
            />
          </section>
        )}
      </div>
    </main>
  );
}

function Tile({ href, title, desc, kbd }: { href: string; title: string; desc: string; kbd?: string }) {
  return (
    <a
      href={href}
      className="block relative rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 transition p-6 cursor-pointer pointer-events-auto focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">{title}</h3>
        {kbd && (
          <span className="text-xs font-mono px-2 py-1 rounded border border-white/15 bg-white/5">
            {kbd}
          </span>
        )}
      </div>
      <p className="text-sm text-white/70">{desc}</p>
      <div className="mt-4 text-cyan-300 text-sm font-medium">Abrir →</div>
    </a>
  );
}
