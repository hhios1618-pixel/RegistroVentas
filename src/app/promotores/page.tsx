// --- ARCHIVO COMPLETO: src/app/promotores/page.tsx ---
'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';

/* ================================
   Utils
==================================*/
const fetcher = (u: string) => fetch(u, { cache: 'no-store' }).then(r => r.json());
const monthIso = () => new Date().toISOString().slice(0, 7); // YYYY-MM
const capRole = (r?: string) => (r || '').trim().toUpperCase();

/* ================================
   Page
==================================*/
export default function PromotoresHome() {
  // identidad
  const { data: me, isLoading: meLoading } = useSWR('/endpoints/me', fetcher);
  const role = capRole(me?.role);
  const allowed = !!me?.ok && (role === 'PROMOTOR' || role === 'ADMIN');

  // datos del mes (solo ventas)
  const [month, setMonth] = useState(monthIso());
  const { data: sal, isLoading: salLoading } = useSWR(
    allowed ? `/endpoints/my/sales?month=${month}` : null, fetcher
  );

  // hotkeys
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      const k = e.key.toLowerCase();
      if (k === 'r') window.location.href = '/promotores/registro';
      if (k === 'm') window.location.href = '/promotores/resumen';
      if (k === 'c') window.location.href = '/dashboard/captura';
      if (k === 'p') window.location.href = '/playbook-whatsapp';
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // KPIs
  const salK = sal?.kpis ?? { ventas: 0, pedidos: 0, total: 0 };

  // listas
  const ventas = sal?.list ?? [];
  const ventasRecientes = ventas.slice(-10).reverse();

  // guard
  if (!meLoading && !allowed) {
    return (
      <main className="min-h-screen grid place-items-center bg-[#0D1117] text-[#C9D1D9]">
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-200">
          No tienes permisos para esta vista.
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D1117] text-[#C9D1D9]">
      {/* Header fijo */}
      <header className="sticky top-0 z-40 backdrop-blur bg-[#0D1117]/80 border-b border-[#30363D]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center font-extrabold text-black">
              {(me?.full_name || 'U')[0]}
            </div>
            <div>
              <div className="font-semibold text-white leading-tight">
                Hola, {me?.full_name?.split(' ')[0] ?? '…'}
              </div>
              <div className="text-xs text-[#8B949E] -mt-0.5">Promotor — panel personal</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm text-[#8B949E]">Mes</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="bg-[#161B22] text-white border border-[#30363D] rounded-md px-2.5 py-1.5 text-sm outline-none"
            />
          </div>
        </div>
      </header>

      {/* Layout con sidebar */}
      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
        {/* Sidebar */}
        <nav className="glass rounded-xl p-4 h-fit">
          <h3 className="text-xs uppercase tracking-wider text-[#8B949E] mb-2">
            Navegación
          </h3>
          <ul className="space-y-1">
            <Li href="/promotores/registro" kbd="R" label="Registrar venta" />
            <Li href="/promotores/resumen" kbd="M" label="Mi resumen" />
            <Li href="/dashboard/captura" kbd="C" label="Captura / Embudo" />
            <Li href="/playbook-whatsapp" kbd="P" label="Playbook WhatsApp" />
          </ul>

          <div className="border-t border-[#30363D] mt-4 pt-4">
            <h3 className="text-xs uppercase tracking-wider text-[#8B949E] mb-2">Ayuda</h3>
            <ul className="space-y-1">
              <Li href="/" label="Inicio" />
              <Li href="/dashboard/usuarios" label="Mi perfil" />
            </ul>
          </div>
        </nav>

        {/* Contenido */}
        <main>
          {/* Acciones rápidas */}
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
            <QuickAction
              title="Registrar venta"
              desc="Carga rápida con validaciones"
              href="/promotores/registro"
              icon="💸"
              gradient="from-emerald-400 to-teal-500"
              kbd="R"
            />
            <QuickAction
              title="Mi resumen"
              desc="KPIs de ventas del mes"
              href="/promotores/resumen"
              icon="📊"
              gradient="from-fuchsia-400 to-pink-500"
              kbd="M"
            />
            <QuickAction
              title="Playbook"
              desc="Mensajes y guiones efectivos"
              href="/playbook-whatsapp"
              icon="📔"
              gradient="from-cyan-400 to-blue-500"
              kbd="P"
            />
          </section>

          {/* KPIs del mes */}
          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
            <KpiCard title="Ventas" value={salK.ventas} />
            <KpiCard title="Pedidos" value={salK.pedidos} />
            <KpiCard title="Total (Bs)" value={salK.total} money />
          </section>

          {/* Últimas ventas */}
          <section className="glass rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-white">Últimas ventas</h3>
              <div className="text-xs text-[#8B949E]">{salLoading ? 'Cargando…' : `${ventasRecientes.length} registros`}</div>
            </div>
            <div className="overflow-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="text-[#8B949E] border-b border-[#30363D]">
                  <tr>
                    <Th>Fecha</Th>
                    <Th>Pedido</Th>
                    <Th>Producto</Th>
                    <Th className="text-right">Cant</Th>
                    <Th className="text-right">Total</Th>
                  </tr>
                </thead>
                <tbody>
                  {salLoading && (
                    <tr><Td colSpan={5}>Cargando…</Td></tr>
                  )}
                  {!salLoading && ventasRecientes.map((r: any) => (
                    <tr key={r.id} className="border-b border-[#1F242B]">
                      <Td>{r.order_date?.slice(0,10)}</Td>
                      <Td className="font-mono">{r.order_id}</Td>
                      <Td>{r.product_name}</Td>
                      <Td className="text-right">{r.qty}</Td>
                      <Td className="text-right">Bs {Number(r.total||0).toLocaleString('es-BO')}</Td>
                    </tr>
                  ))}
                  {!salLoading && ventasRecientes.length === 0 && (
                    <tr><Td colSpan={5} className="text-[#8B949E]">No hay ventas registradas este mes.</Td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>

      <style jsx global>{`
        .glass { background-color: rgba(22, 27, 34, 0.55); border: 1px solid #30363D; }
      `}</style>
    </div>
  );
}

/* ================================
   Subcomponentes
==================================*/
function Li({ href, label, kbd }: { href: string; label: string; kbd?: string }) {
  return (
    <li>
      <Link href={href} className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-[#161B22] border border-transparent hover:border-[#30363D]">
        <span>{label}</span>
        {kbd && <span className="text-[10px] font-mono text-[#8B949E] border border-[#30363D] rounded px-1.5 py-0.5">{kbd}</span>}
      </Link>
    </li>
  );
}

function QuickAction({
  title, desc, href, icon, gradient, kbd,
}: { title: string; desc: string; href: string; icon: string; gradient: string; kbd?: string }) {
  return (
    <Link href={href} className="group rounded-xl border border-[#30363D] bg-[#161B22] p-4 hover:shadow-lg hover:shadow-emerald-500/10 transition">
      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center text-black font-bold text-lg`}>
        {icon}
      </div>
      <div className="mt-3">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-white">{title}</h4>
          {kbd && <span className="text-[10px] font-mono text-[#8B949E] border border-[#30363D] rounded px-1.5 py-0.5">{kbd}</span>}
        </div>
        <p className="text-sm text-[#8B949E]">{desc}</p>
      </div>
    </Link>
  );
}

function KpiCard({ title, value, money = false }:{ title:string; value:number; money?:boolean }) {
  return (
    <div className="rounded-xl border border-[#30363D] bg-[#161B22] p-4">
      <div className="text-sm text-[#8B949E]">{title}</div>
      <div className="text-2xl font-extrabold text-white mt-1">
        {money ? 'Bs ' : ''}{Number(value || 0).toLocaleString('es-BO')}
      </div>
    </div>
  );
}

function Th({ children, className = '' }: any) {
  return <th className={`text-left px-2 py-2 ${className}`}>{children}</th>;
}
function Td({ children, className = '', colSpan }: any) {
  return <td colSpan={colSpan} className={`px-2 py-2 align-top ${className}`}>{children}</td>;
}