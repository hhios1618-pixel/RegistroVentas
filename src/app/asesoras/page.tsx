// --- ARCHIVO COMPLETO: src/app/asesoras/page.tsx ---
'use client';

import { useEffect, useState } from 'react';

type Me = { ok: boolean; role?: string; full_name?: string };

export default function AsesorasHome() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  // Carga /endpoints/me
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

  const role = (me?.role ?? '').toUpperCase();
  const allowed = !!me?.ok && (role === 'ASESOR' || role === 'ADMIN');

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Fondo que NO bloquea */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto p-6 space-y-8">
        <header className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">FENIX — Asesoras</h1>
          <a href="/" className="text-sm text-gray-300 hover:text-white border border-white/10 bg-white/5 px-3 py-1.5 rounded-lg">
            ← Ir al inicio
          </a>
        </header>

        {/* --- BLOQUE DE PRUEBA A PRUEBA DE BALAS (fuera de todo) --- */}
        {allowed && (
          <nav
            className="z-[9999] relative border border-emerald-700/40 bg-emerald-900/20 rounded-lg p-3"
            style={{ pointerEvents: 'auto' }}
          >
            <div className="text-xs text-emerald-200 mb-2">Navegación directa (debug):</div>
            <div className="flex flex-wrap gap-3">
              <a className="px-3 py-1 rounded bg-white/10 hover:bg-white/20" href="/playbook-whatsapp">/playbook-whatsapp</a>
              <a className="px-3 py-1 rounded bg-white/10 hover:bg-white/20" href="/dashboard/captura">/dashboard/captura</a>
              <a className="px-3 py-1 rounded bg-white/10 hover:bg-white/20" href="/asistencia">/asistencia</a>
              <a className="px-3 py-1 rounded bg-white/10 hover:bg-white/20" href="/dashboard/devoluciones">/dashboard/devoluciones</a>
            </div>
          </nav>
        )}

        {/* Guard */}
        {!loading && !allowed && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
            No tienes permisos para esta vista.
          </div>
        )}

        {/* Grid de tiles (estético) */}
        {allowed && (
          <section
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 relative z-[100]"
            style={{ pointerEvents: 'auto' }}
          >
            <Tile href="/playbook-whatsapp" title="Playbook WhatsApp" desc="Guiones oficiales y mejores prácticas." kbd="P" />
            <Tile href="/dashboard/captura" title="Captura" desc="Carga/edición rápida de leads y pedidos." kbd="C" />
            <Tile href="/asistencia" title="Asistencia" desc="Marca de entrada/salida y geolocalización." kbd="A" />
            <Tile href="/dashboard/devoluciones" title="Devoluciones" desc="Gestión de casos y seguimiento." kbd="D" />
          </section>
        )}
      </div>

      {/* Doctor: detecta y desactiva overlays que interceptan el click */}
      <ClickDoctor />
    </main>
  );
}

/** Tile minimalista con <a> nativo (sin Link, sin motion) */
function Tile({ href, title, desc, kbd }: { href: string; title: string; desc: string; kbd?: string }) {
  return (
    <a
      href={href}
      className="block relative rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 transition p-6 cursor-pointer pointer-events-auto focus:outline-none focus:ring-2 focus:ring-emerald-400"
      style={{ zIndex: 110 }}
      aria-label={title}
      data-href={href}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">{title}</h3>
        {kbd && <span className="text-xs font-mono px-2 py-1 rounded border border-white/15 bg-white/5">{kbd}</span>}
      </div>
      <p className="text-sm text-white/70">{desc}</p>
      <div className="mt-4 text-emerald-300 text-sm font-medium">Abrir →</div>
    </a>
  );
}

/** Desactiva automáticamente el primer overlay que esté tapando los clicks. */
function ClickDoctor() {
  useEffect(() => {
    // 1) Loggea cualquier click y muestra quién recibe el evento
    const onAnyClick = (e: MouseEvent) => {
      // @ts-ignore
      const cls = e.target?.className?.toString?.() ?? '';
      console.log('CLICK TARGET →', e.target, cls);
    };
    window.addEventListener('click', onAnyClick, true);

    // 2) Busca el elemento que está encima del centro y quítale los eventos
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const topEl = document.elementFromPoint(cx, cy) as HTMLElement | null;
    if (topEl) {
      const name = (topEl.className && topEl.className.toString()) || topEl.id || topEl.tagName;
      console.log('[ClickDoctor] elementFromPoint(center):', name, topEl);
      // Si NO es nuestro main, nav o un <a>, lo desarmamos como posible overlay
      if (!(topEl.closest('main') && (topEl.tagName === 'A' || topEl.closest('a')))) {
        topEl.style.pointerEvents = 'none';
        topEl.style.zIndex = '0';
        console.warn('[ClickDoctor] Overlay neutralizado:', name);
      }
    }

    // 3) Kill-list para overlays conocidos de Next Dev Tools (por si acaso)
    const suspects = [
      '#nextjs-devtools',          // panel nuevo Next DevTools
      '#nextjs-toast',             // toasts devtools
      '#nextjs-portal',            // portales
      '#nextjs-container',         // overlay container
      '[data-nextjs-toast]',
      '[data-nextjs-overlay]',
    ];
    suspects.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        (el as HTMLElement).style.pointerEvents = 'none';
        (el as HTMLElement).style.zIndex = '0';
        console.warn('[ClickDoctor] Neutralizado selector:', sel, el);
      });
    });

    return () => window.removeEventListener('click', onAnyClick, true);
  }, []);

  return null;
}