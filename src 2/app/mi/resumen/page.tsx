'use client';

import { useMemo, useState, useEffect } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CalendarDays, User2, Activity, ListChecks, ShoppingCart, CircleDollarSign } from 'lucide-react';

const fetcher = (u: string) => fetch(u, { cache: 'no-store' }).then(r => r.json());

type Role = 'admin'|'promotor'|'coordinador'|'lider'|'asesor'|'unknown';
const norm = (r?: string): Role => {
  const x = (r || '').toUpperCase();
  if (['GERENCIA', 'ADMIN', 'ADMINISTRADOR'].includes(x)) return 'admin';
  if (['PROMOTOR', 'PROMOTORA'].includes(x)) return 'promotor';
  if (['COORDINADOR', 'COORDINADORA', 'COORDINACION'].includes(x)) return 'coordinador';
  if (['LIDER', 'JEFE', 'SUPERVISOR'].includes(x)) return 'lider';
  if (['ASESOR', 'VENDEDOR', 'VENDEDORA'].includes(x)) return 'asesor';
  return 'unknown';
};

export default function MiResumenPage() {
  const router = useRouter();
  const { data: me } = useSWR('/endpoints/me', fetcher);
  const role: Role = useMemo(() => norm(me?.role), [me?.role]);

  // si es promotor, redirige a su dashboard
  useEffect(() => {
    if (!me) return;
    if (role === 'promotor') router.replace('/dashboard/promotores');
  }, [me, role, router]);

  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const { data: att, isLoading: attLoading } = useSWR(
    role === 'promotor' ? null : `/endpoints/my/attendance?month=${month}`, fetcher
  );
  const { data: sal, isLoading: salLoading } = useSWR(`/endpoints/my/sales?month=${month}`, fetcher);

  const name = me?.full_name || '—';
  const attKpis = att?.kpis ?? { dias_con_marca: 0, entradas: 0, salidas: 0, pct_geocerca_ok: 0 };
  const salKpis = sal?.kpis ?? { ventas: 0, pedidos: 0, total: 0 };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-40">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-white/10" />
          <div className="relative backdrop-blur-xl bg-white/5 border-b border-white/10">
            <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-r from-blue-500/30 to-purple-500/30 border border-blue-400/30 rounded-xl">
                  <Activity size={26} />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold">Mi resumen</h1>
                  <p className="text-white/60 text-sm">Asistencia y ventas del mes</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden md:flex items-center gap-2 text-white/70">
                  <CalendarDays size={18} />
                  <span className="text-sm">Mes</span>
                </div>
                <input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="w-[140px] px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400/40"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Identidad */}
        <section className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10 rounded-xl" />
          <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-4 items-center">
              <div className="flex items-center gap-2 text-white/70">
                <User2 size={18} />
                <span className="text-sm font-semibold">Usuario</span>
              </div>
              <div className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white">{name}</div>
            </div>
          </div>
        </section>

        {/* KPIs */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {role !== 'promotor' && (
            <>
              <Kpi title="Días con marca" value={attKpis.dias_con_marca} icon={<ListChecks />} gradient="from-cyan-500/20 to-blue-500/20" />
              <Kpi title="Entradas" value={attKpis.entradas} icon={<Activity />} gradient="from-emerald-500/20 to-teal-500/20" />
              <Kpi title="Salidas" value={attKpis.salidas} icon={<Activity />} gradient="from-purple-500/20 to-pink-500/20" />
              <Kpi title="% Geo OK" value={attKpis.pct_geocerca_ok} suffix="%" icon={<Activity />} gradient="from-indigo-500/20 to-violet-500/20" />
            </>
          )}
          <Kpi title="Ventas" value={salKpis.ventas} icon={<ShoppingCart />} gradient="from-amber-500/20 to-orange-500/20" />
          <Kpi title="Pedidos" value={salKpis.pedidos} icon={<ShoppingCart />} gradient="from-yellow-500/20 to-amber-500/20" />
          <Kpi title="Total Bs" value={salKpis.total} money icon={<CircleDollarSign />} gradient="from-green-500/20 to-emerald-500/20" />
        </section>

        <div className={`grid gap-6 ${role === 'promotor' ? 'grid-cols-1' : 'lg:grid-cols-[2fr,3fr]'}`}>
          {/* Asistencia timeline (no para promotores) */}
          {role !== 'promotor' && (
            <section className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10 rounded-xl" />
              <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-4">Asistencia</h3>
                {attLoading ? (
                  <Skeleton text="Cargando asistencia…" />
                ) : (
                  <div className="grid gap-3">
                    {att?.days?.length ? (
                      att.days.map((d: any) => (
                        <div key={d.date} className="bg-white/10 border border-white/20 rounded-lg p-4">
                          <div className="font-semibold mb-3">{d.date}</div>
                          <div className="flex flex-wrap gap-2">
                            {d.marks.map((m: any) => {
                              const t = new Date(m.taken_at || m.created_at).toLocaleTimeString('es-BO', {
                                hour: '2-digit',
                                minute: '2-digit',
                              });
                              const isIn = m.type === 'in';
                              return (
                                <span
                                  key={m.id}
                                  className={`px-2.5 py-1.5 text-xs rounded-lg border ${
                                    isIn
                                      ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30'
                                      : 'bg-rose-500/20 text-rose-200 border-rose-400/30'
                                  }`}
                                >
                                  {m.type.toUpperCase()} · {t}
                                  {typeof m.distance_m === 'number' && <span className="opacity-75"> · {Math.round(m.distance_m)}m</span>}
                                  {m.site_name && <span className="opacity-75"> · {m.site_name}</span>}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-white/70">Sin marcas este mes.</div>
                    )}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Ventas + Top productos */}
          <section className="grid gap-6">
            {/* Top productos */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10 rounded-xl" />
              <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-3">Top productos</h3>
                {salLoading ? (
                  <Skeleton text="Cargando productos…" />
                ) : (
                  <div className="grid gap-2">
                    {sal?.topProducts?.length ? (
                      sal.topProducts.map((p: any) => (
                        <div
                          key={p.name}
                          className="flex items-center justify-between border-b border-white/10 pb-2"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-cyan-300" />
                            <span className="text-white">{p.name}</span>
                          </div>
                          <div className="text-white/80 text-sm">
                            {p.qty} uds · Bs {Math.round(p.amount).toLocaleString('es-BO')}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-white/70">Sin ventas este mes.</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Mis ventas */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10 rounded-xl" />
              <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-6 max-h-[420px] overflow-auto">
                <h3 className="text-lg font-bold mb-3">Mis ventas</h3>
                {salLoading ? (
                  <Skeleton text="Cargando ventas…" />
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-white/70 border-b border-white/10">
                        <th className="py-2 pr-3">Fecha</th>
                        <th className="py-2 pr-3">Pedido</th>
                        <th className="py-2 pr-3">Producto</th>
                        <th className="py-2 pr-3">Cant</th>
                        <th className="py-2 pr-3 text-right">Total (Bs)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sal?.list?.map((r: any) => (
                        <tr key={r.id} className="border-b border-white/5">
                          <td className="py-2 pr-3">{r.order_date?.slice(0, 10)}</td>
                          <td className="py-2 pr-3">{r.order_id}</td>
                          <td className="py-2 pr-3">{r.product_name}</td>
                          <td className="py-2 pr-3">{r.qty}</td>
                          <td className="py-2 pr-3 text-right">
                            {Number(r.total || 0).toLocaleString('es-BO', { maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                      {!sal?.list?.length && (
                        <tr>
                          <td colSpan={5} className="py-3 text-white/70">
                            Sin ventas.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function Kpi({
  title,
  value,
  suffix = '',
  money = false,
  icon,
  gradient,
}: {
  title: string;
  value: number;
  suffix?: string;
  money?: boolean;
  icon?: React.ReactNode;
  gradient: string;
}) {
  return (
    <motion.div
      className="relative overflow-hidden"
      whileHover={{ scale: 1.02, y: -4 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} rounded-xl`} />
      <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white/70 text-sm font-semibold">{title}</span>
          <div className="p-2 bg-white/10 rounded-lg border border-white/20">{icon}</div>
        </div>
        <div className="text-2xl font-extrabold">
          {money ? 'Bs ' : ''}
          {Number(value || 0).toLocaleString('es-BO')}
          {suffix}
        </div>
      </div>
    </motion.div>
  );
}

function Skeleton({ text }: { text?: string }) {
  return (
    <div>
      <div className="h-3 w-40 bg-white/10 rounded mb-2" />
      <div className="h-3 w-64 bg-white/10 rounded mb-2" />
      <div className="h-3 w-56 bg-white/10 rounded mb-2" />
      {text && <div className="text-white/60 text-sm mt-3">{text}</div>}
    </div>
  );
}