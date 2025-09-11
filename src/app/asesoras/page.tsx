// --- ARCHIVO COMPLETO: src/app/asesoras/page.tsx ---
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
export default function AsesorPromotorHome() {
  // identidad
  const { data: me, isLoading: meLoading } = useSWR('/endpoints/me', fetcher);
  const role = capRole(me?.role);
  const allowed = !!me?.ok && (role === 'ASESOR' || role === 'PROMOTOR' || role === 'ADMIN');

  // datos personales del mes
  const [month, setMonth] = useState(monthIso());
  const { data: att, isLoading: attLoading } = useSWR(
    allowed ? `/endpoints/my/attendance?month=${month}` : null, fetcher
  );
  const { data: sal, isLoading: salLoading } = useSWR(
    allowed ? `/endpoints/my/sales?month=${month}` : null, fetcher
  );

  // hotkeys
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key.toLowerCase() === 'a') window.location.href = '/asistencia';
      if (e.key.toLowerCase() === 'r') window.location.href = '/promotores/registro';
      if (e.key.toLowerCase() === 'm') window.location.href = '/mi/resumen';
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // KPIs
  const attK = att?.kpis ?? { dias_con_marca: 0, entradas: 0, salidas: 0, pct_geocerca_ok: 0 };
  const salK = sal?.kpis ?? { ventas: 0, pedidos: 0, total: 0 };

  // listas
  const ventas = sal?.list ?? [];
  const ventasRecientes = ventas.slice(-8).reverse();
  const dias = (att?.days ?? []).slice(-6).reverse(); // últimos 6 días

  return (
    <div className="min-h-screen bg-[#0D1117] text-[#C9D1D9]">
      {/* Header fijo */}
      <header className="sticky top-0 z-40 backdrop-blur bg-[#0D1117]/80 border-b border-[#30363D]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-400 to-fuchsia-500 flex items-center justify-center font-extrabold text-black">
              {(me?.full_name || 'U')[0]}
            </div>
            <div>
              <div className="font-semibold text-white leading-tight">
                Hola, {me?.full_name?.split(' ')[0] ?? '…'}
              </div>
              <div className="text-xs text-[#8B949E] -mt-0.5">Panel personal — {role || '—'}</div>
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
            <Li href="/asistencia" kbd="A" label="Marcar asistencia" />
            <Li href="/mi/resumen" kbd="M" label="Mi resumen" />
            <Li href="/dashboard/captura" label="Captura / Embudo" />
            <Li href="/playbook-whatsapp" label="Playbook WhatsApp" />
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
              title="Marcar asistencia"
              desc="Selfie + GPS + QR"
              href="/asistencia"
              icon="⏱️"
              gradient="from-cyan-400 to-blue-500"
              kbd="A"
            />
            <QuickAction
              title="Mi resumen"
              desc="KPIs de ventas y asistencia"
              href="/mi/resumen"
              icon="📊"
              gradient="from-fuchsia-400 to-pink-500"
              kbd="M"
            />
          </section>

          {/* KPIs del mes */}
          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <KpiCard title="Ventas" value={salK.ventas} />
            <KpiCard title="Pedidos" value={salK.pedidos} />
            <KpiCard title="Total (Bs)" value={salK.total} money />
            <KpiCard title="% Geo OK" value={attK.pct_geocerca_ok} suffix="%" />
          </section>

          {/* Grids principales */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Últimas ventas */}
            <div className="glass rounded-xl p-4">
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
            </div>

            {/* Asistencia reciente */}
            <div className="glass rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white">Asistencia reciente</h3>
                <div className="text-xs text-[#8B949E]">{attLoading ? 'Cargando…' : `${dias.length} días`}</div>
              </div>

              <div className="space-y-3">
                {attLoading && <div className="text-sm text-[#8B949E]">Cargando…</div>}
                {!attLoading && dias.map((d: any) => (
                  <div key={d.date} className="rounded-lg border border-[#30363D] bg-[#161B22] p-3">
                    <div className="text-sm font-semibold text-white mb-2">{d.date}</div>
                    <div className="flex flex-wrap gap-6 text-sm">
                      {d.marks.map((m: any) => (
                        <div key={m.id} className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-md text-xs ${m.type === 'in' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>
                            {m.type.toUpperCase()}
                          </span>
                          <span className="text-[#8B949E]">
                            {new Date(m.taken_at).toLocaleTimeString('es-BO',{hour:'2-digit',minute:'2-digit'})}
                            {typeof m.distance_m === 'number' && <> · {Math.round(m.distance_m)} m</>}
                            {m.site_name && <> · {m.site_name}</>}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {!attLoading && dias.length === 0 && (
                  <div className="text-sm text-[#8B949E]">Aún no hay marcas este mes.</div>
                )}
              </div>
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
    <Link href={href} className="group rounded-xl border border-[#30363D] bg-[#161B22] p-4 hover:shadow-lg hover:shadow-cyan-500/10 transition">
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

function KpiCard({ title, value, suffix = '', money = false }:{ title:string; value:number; suffix?:string; money?:boolean }) {
  return (
    <div className="rounded-xl border border-[#30363D] bg-[#161B22] p-4">
      <div className="text-sm text-[#8B949E]">{title}</div>
      <div className="text-2xl font-extrabold text-white mt-1">
        {money ? 'Bs ' : ''}{Number(value || 0).toLocaleString('es-BO')}{suffix}
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