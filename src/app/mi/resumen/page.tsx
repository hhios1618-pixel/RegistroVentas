'use client';

import { useMemo, useState, useEffect } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CalendarDays, User2, Activity, ListChecks, ShoppingCart, CircleDollarSign, ShieldCheck, LogIn, LogOut } from 'lucide-react';
import LogoutButton from '@/components/LogoutButton';

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

  useEffect(() => {
    if (!me) return;
    if (role === 'promotor') router.replace('/dashboard/promotores');
  }, [me, role, router]);

  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const { data: att, isLoading: attLoading } = useSWR(role === 'promotor' ? null : `/endpoints/my/attendance?month=${month}`, fetcher);
  const { data: sal, isLoading: salLoading } = useSWR(`/endpoints/my/sales?month=${month}`, fetcher);

  const name = me?.full_name || '—';
  const attKpis = att?.kpis ?? { dias_con_marca: 0, entradas: 0, salidas: 0, pct_geocerca_ok: 0 };
  const salKpis = sal?.kpis ?? { ventas: 0, pedidos: 0, total: 0 };

  const canReviewPerms = role === 'admin' || role === 'coordinador' || role === 'lider';
  const goPermisos = () => router.push(canReviewPerms ? '/dashboard/permisos' : '/permisos/solicitar');
  const goAsistencia = () => router.push('/asistencia');

  return (
    <div className="relative min-h-screen overflow-hidden bg-[color:var(--app-bg)] text-[color:var(--app-foreground)] transition-colors duration-500 ease-apple">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_18%_-12%,rgba(124,142,255,0.22),transparent_70%)] opacity-80 dark:bg-[radial-gradient(1200px_600px_at_20%_-10%,rgba(96,165,250,0.14),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(880px_520px_at_92%_-6%,rgba(255,175,210,0.18),transparent_65%)] opacity-70 dark:bg-[radial-gradient(900px_500px_at_90%_-20%,rgba(168,85,247,0.12),transparent_55%)]" />
      </div>

      <div className="relative z-10">
        {/* HEADER usando tus utilidades */}
        <header className="sticky top-0 z-sticky border-b border-[color:var(--app-border)] bg-[color:var(--app-bg)]/80 backdrop-blur-apple transition-colors duration-500 dark:border-white/10 dark:bg-black/30">
          <div className="apple-container py-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="pill"><Activity size={18} /></div>
              <div>
                <h1 className="apple-h1">Mi resumen</h1>
                <p className="apple-caption text-[color:var(--app-muted)]">Asistencia y ventas del mes</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {role !== 'promotor' && (
                <button
                  onClick={goAsistencia}
                  className="btn-primary btn-sm"
                  title="Ir a marcar asistencia"
                >
                  <span className="pill"><LogIn size={16} /></span>
                  <span className="font-medium">Marcar asistencia</span>
                </button>
              )}
              {/* Botón Gestión de permisos (pill de tu sistema) */}
              <button
                onClick={goPermisos}
                className="btn-secondary btn-sm"
                title={canReviewPerms ? 'Abrir dashboard de permisos' : 'Solicitar un permiso'}
              >
                <span className="pill"><ShieldCheck size={16} /></span>
                <span className="font-medium">Gestión de permisos</span>
              </button>

              <LogoutButton
                type="button"
                className="btn-ghost btn-sm"
                title="Cerrar sesión"
              >
                <span className="pill"><LogOut size={16} /></span>
                <span className="font-medium">Salir</span>
              </LogoutButton>

              <div className="hidden md:flex items-center gap-2 text-[color:var(--app-muted)]">
                <CalendarDays size={18} />
                <span className="apple-caption">Mes</span>
              </div>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="field-sm w-[160px]"
              />
            </div>
          </div>
        </header>

        {/* CTA móvil coherente con tus botones */}
        <div className="md:hidden fixed right-4 bottom-4 z-fixed flex flex-col gap-3">
          {role !== 'promotor' && (
            <button
              onClick={goAsistencia}
              className="btn-primary btn-sm shadow-apple"
            >
              <LogIn size={16} />
              <span className="font-medium">Marcar asistencia</span>
            </button>
          )}
          <LogoutButton
            type="button"
            className="btn-ghost btn-sm shadow-apple"
            title="Cerrar sesión"
          >
            <LogOut size={16} />
            <span className="font-medium">Salir</span>
          </LogoutButton>
          <button
            onClick={goPermisos}
            className="btn-secondary btn-sm shadow-apple"
          >
            <ShieldCheck size={16} />
            <span className="font-medium">Permisos</span>
          </button>
        </div>

        <main className="apple-container py-8 space-y-8">
          {/* Identidad */}
          <section className="glass-card transition-colors duration-500">
            <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-4 items-center">
              <div className="flex items-center gap-2 text-[color:var(--app-muted)]">
                <User2 size={18} />
                <span className="apple-footnote font-semibold">Usuario</span>
              </div>
              <div className="field bg-[color:var(--app-card)] text-[color:var(--app-foreground)] dark:bg-white/5 dark:text-white">{name}</div>
            </div>
          </section>

          {/* KPIs */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {role !== 'promotor' && (
              <>
                <Kpi title="Días con marca" value={attKpis.dias_con_marca} icon={<ListChecks />} />
                <Kpi title="Entradas" value={attKpis.entradas} icon={<Activity />} />
                <Kpi title="Salidas" value={attKpis.salidas} icon={<Activity />} />
                <Kpi title="% Geo OK" value={attKpis.pct_geocerca_ok} suffix="%" icon={<Activity />} />
              </>
            )}
            <Kpi title="Ventas" value={salKpis.ventas} icon={<ShoppingCart />} />
            <Kpi title="Pedidos" value={salKpis.pedidos} icon={<ShoppingCart />} />
            <Kpi title="Total Bs" value={salKpis.total} money icon={<CircleDollarSign />} />
          </section>

          <div className={`grid gap-6 ${role === 'promotor' ? 'grid-cols-1' : 'lg:grid-cols-[2fr,3fr]'}`}>
            {/* Asistencia timeline */}
            {role !== 'promotor' && (
              <section className="glass-card transition-colors duration-500">
                <h3 className="apple-h3 mb-4">Asistencia</h3>
                {attLoading ? (
                  <Skeleton text="Cargando asistencia…" />
                ) : (
                  <div className="grid gap-3">
                    {att?.days?.length ? (
                      att.days.map((d: any) => (
                        <div key={d.date} className="glass-panel p-4 transition-colors duration-500">
                          <div className="font-semibold mb-3">{d.date}</div>
                          <div className="flex flex-wrap gap-2">
                            {d.marks.map((m: any) => {
                              const t = new Date(m.taken_at || m.created_at).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
                              const isIn = m.type === 'in';
                              return (
                                <span
                                  key={m.id}
                                  className={`badge ${isIn ? 'badge-success' : 'badge-danger'}`}
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
                      <div className="apple-caption text-[color:var(--app-muted)]">Sin marcas este mes.</div>
                    )}
                  </div>
                )}
              </section>
            )}

            {/* Ventas + Top productos */}
            <section className="grid gap-6">
              {/* Top productos */}
              <div className="glass-card transition-colors duration-500">
                <h3 className="apple-h3 mb-3">Top productos</h3>
                {salLoading ? (
                  <Skeleton text="Cargando productos…" />
                ) : (
                  <div className="grid gap-2">
                    {sal?.topProducts?.length ? (
                      sal.topProducts.map((p: any) => (
                        <div key={p.name} className="flex items-center justify-between border-b border-[color:var(--app-border)] pb-2">
                          <div className="flex items-center gap-2">
                            <span className="badge-neutral">●</span>
                            <span>{p.name}</span>
                          </div>
                          <div className="apple-caption text-[color:var(--app-muted)]">
                            {p.qty} uds · Bs {Math.round(p.amount).toLocaleString('es-BO')}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="apple-caption text-[color:var(--app-muted)]">Sin ventas este mes.</div>
                    )}
                  </div>
                )}
              </div>

              {/* Mis ventas */}
              <div className="glass-card max-h-[420px] overflow-auto transition-colors duration-500">
                <h3 className="apple-h3 mb-3">Mis ventas</h3>
                {salLoading ? (
                  <Skeleton text="Cargando ventas…" />
                ) : (
                  <table className="table-apple">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Pedido</th>
                        <th>Producto</th>
                        <th>Cant</th>
                        <th className="text-right">Total (Bs)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sal?.list?.map((r: any) => (
                        <tr key={r.id}>
                          <td>{r.order_date?.slice(0, 10)}</td>
                          <td>{r.order_id}</td>
                          <td>{r.product_name}</td>
                          <td>{r.qty}</td>
                          <td className="text-right">
                            {Number(r.total || 0).toLocaleString('es-BO', { maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                      {!sal?.list?.length && (
                        <tr>
                          <td colSpan={5} className="apple-caption text-[color:var(--app-muted)]">Sin ventas.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

/* === KPI usando tus utilidades === */
function Kpi({
  title, value, suffix = '', money = false, icon,
}: {
  title: string;
  value: number;
  suffix?: string;
  money?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <motion.div
      className="card-hover"
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center justify-between">
        <span className="apple-caption">{title}</span>
        <span className="pill">{icon}</span>
      </div>
      <div className="mt-2 text-apple-h2 font-semibold">
        {money ? 'Bs ' : ''}
        {Number(value || 0).toLocaleString('es-BO')}
        {suffix}
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
      {text && <div className="apple-caption mt-3">{text}</div>}
    </div>
  );
}
