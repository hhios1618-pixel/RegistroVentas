'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { motion } from 'framer-motion';

type Me = { ok: boolean; role?: 'asesor'|'admin'|'promotor'|'coordinador'|'lider'; full_name?: string };

const fetcher = (url: string) => fetch(url, { cache: 'no-store' }).then(r => r.json());

export default function AsesorasHome() {
  const { data, isLoading } = useSWR<Me>('/endpoints/me', fetcher, { revalidateOnFocus: false });
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const allowed = data?.ok && (data.role === 'asesor' || data.role === 'admin');

  return (
    <main
      className={`min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white transition-opacity duration-700 ${ready ? 'opacity-100' : 'opacity-0'}`}
    >
      {/* fondo */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute w-80 h-80 -translate-x-1/2 -translate-y-1/2 left-1/4 top-1/4 bg-emerald-600/10 rounded-full blur-3xl" />
        <div className="absolute w-72 h-72 translate-x-1/2 translate-y-1/2 right-1/4 bottom-1/4 bg-cyan-600/10 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto p-6 space-y-8">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-emerald-100 to-cyan-100 bg-clip-text text-transparent">
              FENIX — Asesoras
            </h1>
            <span className="text-[11px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gray-300">
              {isLoading ? 'cargando…' : `rol: ${data?.role ?? 'desconocido'}`}
            </span>
          </div>
          <Link
            href="/"
            className="text-sm text-gray-300 hover:text-white border border-white/10 bg-white/5 px-3 py-1.5 rounded-lg"
          >
            ← Ir al inicio
          </Link>
        </header>

        {/* Guard */}
        {!isLoading && !allowed && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
            No tienes permisos para esta vista.
          </div>
        )}

        {/* Grid de accesos (solo si permitido) */}
        {allowed && (
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <Card
              href="/playbook-whatsapp"
              title="Playbook WhatsApp"
              desc="Guiones oficiales y mejores prácticas."
              accent="from-pink-500 to-fuchsia-500"
              kbd="P"
            />
            <Card
              href="/dashboard/captura"
              title="Captura"
              desc="Carga/edición rápida de leads y pedidos."
              accent="from-emerald-500 to-green-500"
              kbd="C"
            />
            <Card
              href="/asistencia"
              title="Asistencia"
              desc="Marca de entrada/salida y geolocalización."
              accent="from-sky-500 to-cyan-500"
              kbd="A"
            />
            <Card
              href="/dashboard/devoluciones"
              title="Devoluciones"
              desc="Gestión de casos y seguimiento."
              accent="from-purple-500 to-violet-500"
              kbd="D"
            />
          </section>
        )}
      </div>
    </main>
  );
}

function Card({
  href,
  title,
  desc,
  accent,
  kbd,
}: {
  href: string;
  title: string;
  desc: string;
  accent: string; // "from-*-500 to-*-500"
  kbd: string;
}) {
  return (
    <Link href={href} className="group">
      <motion.div
        whileHover={{ y: -6 }}
        className="relative h-full bg-gray-900/60 backdrop-blur-2xl rounded-xl p-6 border border-gray-700/30 overflow-hidden"
      >
        <div className={`absolute inset-0 bg-gradient-to-br ${accent} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">{title}</h3>
            <div className="bg-gray-800/50 px-2 py-1 rounded border border-gray-600/30 text-xs font-mono">
              {kbd}
            </div>
          </div>
          <p className="text-sm text-gray-400 flex-1">{desc}</p>
          <div className="mt-6 text-emerald-300 group-hover:text-emerald-200 text-sm font-medium">
            Abrir → 
          </div>
        </div>
      </motion.div>
    </Link>
  );
}