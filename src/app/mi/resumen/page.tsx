'use client';

import { useMemo, useState, useEffect } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CalendarDays, User2, Activity, ListChecks, ShoppingCart, CircleDollarSign, ShieldCheck } from 'lucide-react';

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

  return (
    <div
      className="
        min-h-screen text-white
        /* Fondo con tu tailwind + radiales inline, sin clases nuevas */
        bg-[radial-gradient(1200px_600px_at_20%_-10%,rgba(96,165,250,0.14),transparent_60%)]
        bg-[#000000]
        [background-repeat:no-repeat]
      "
      /* segunda radial superpuesta */
      style={{
        backgroundImage:
          `radial-gradient(900px 500px at 90% -20%, rgba(168,85,247,.12), transparent 55%), 
           radial-gradient(1200px 600px at 20% -10%, rgba(96,165,250,.14), transparent 60%)`
      }}
    >
      {/* HEADER usando tus utilidades */}
      <header className="sticky top-0 z-sticky border-b border-[var(--app-border)] bg-black/30 backdrop-blur-apple">
        <div className="apple-container py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="pill"><Activity size={18} /></div>
            <div>
              <h1 className="apple-h1">Mi resumen</h1>
              <p className="apple-caption">Asistencia y ventas del mes</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Botón Gestión de permisos (pill de tu sistema) */}
            <button
              onClick={goPermisos}
              className="btn-secondary btn-sm"
              title={canReviewPerms ? 'Abrir dashboard de permisos' : 'Solicitar un permiso'}
            >
              <span className="pill"><ShieldCheck size={16} /></span>
              <span className="font-medium">Gestión de permisos</span>
            </button>

            <div className="hidden md:flex items-center gap-2 text-app-muted">
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
      <button
        onClick={goPermisos}
        className="md:hidden fixed right-4 bottom-4 z-fixed btn-secondary btn-sm shadow-apple"
      >
        <ShieldCheck size={16} />
        <span className="font-medium">Permisos</span>
      </button>

      <main className="apple-container py-8 space-y-8">
        {/* Identidad */}
        <section className="glass-card">
          <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-4 items-center">
            <div className="flex items-center gap-2 text-app-muted">
              <User2 size={18} />
              <span className="apple-footnote font-semibold">Usuario</span>
            </div>
            <div className="field">{name}</div>
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
            <section className="glass-card">
              <h3 className="apple-h3 mb-4">Asistencia</h3>
              {attLoading ? (
                <Skeleton text="Cargando asistencia…" />
              ) : (
                <div className="grid gap-3">
                  {att?.days?.length ? (
                    att.days.map((d: any) => (
                      <div key={d.date} className="glass-panel p-4">
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
                    <div className="apple-caption">Sin marcas este mes.</div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Ventas + Top productos */}
          <section className="grid gap-6">
            {/* Top productos */}
            <div className="glass-card">
              <h3 className="apple-h3 mb-3">Top productos</h3>
              {salLoading ? (
                <Skeleton text="Cargando productos…" />
              ) : (
                <div className="grid gap-2">
                  {sal?.topProducts?.length ? (
                    sal.topProducts.map((p: any) => (
                      <div key={p.name} className="flex items-center justify-between border-b border-[var(--app-border)] pb-2">
                        <div className="flex items-center gap-2">
                          <span className="badge-neutral">●</span>
                          <span>{p.name}</span>
                        </div>
                        <div className="apple-caption">
                          {p.qty} uds · Bs {Math.round(p.amount).toLocaleString('es-BO')}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="apple-caption">Sin ventas este mes.</div>
                  )}
                </div>
              )}
            </div>

            {/* Mis ventas */}
            <div className="glass-card max-h-[420px] overflow-auto">
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
                        <td colSpan={5} className="apple-caption">Sin ventas.</td>
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