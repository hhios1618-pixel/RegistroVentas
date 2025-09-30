'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Users, ShieldCheck, CheckCircle2, XCircle, CircleDollarSign, Search, Filter, CalendarDays, Image as ImageIcon,
} from 'lucide-react';
import { hasFinancialAccess } from '@/lib/auth/financial';

const fetcher = (u: string) => fetch(u, { cache: 'no-store' }).then(r => r.json());

type Role = 'admin'|'promotor'|'coordinador'|'lider'|'asesor'|'unknown';
const norm = (r?: string): Role => {
  const x = (r || '').toUpperCase();
  if (['GERENCIA','ADMIN','ADMINISTRADOR'].includes(x)) return 'admin';
  if (['PROMOTOR','PROMOTORA'].includes(x)) return 'promotor';
  if (['COORDINADOR','COORDINADORA','COORDINACION'].includes(x)) return 'coordinador';
  if (['LIDER','JEFE','SUPERVISOR'].includes(x)) return 'lider';
  if (['ASESOR','VENDEDOR','VENDEDORA'].includes(x)) return 'asesor';
  return 'unknown';
};

type Permission = {
  id: string;
  employee_name: string;
  employee_role?: string|null;
  branch?: string|null;
  date: string; // YYYY-MM-DD
  type: 'total'|'parcial';
  start_time?: string|null; // HH:mm
  end_time?: string|null;
  reason: string;
  notes?: string|null;
  proof_url?: string|null;
  status: 'pendiente'|'aprobado_con_rem'|'aprobado_sin_rem'|'rechazado';
  created_at: string;
};

const STATUS_LABEL: Record<Permission['status'], string> = {
  pendiente: 'Pendiente',
  aprobado_con_rem: 'Aprobado (con remuneración)',
  aprobado_sin_rem: 'Aprobado (sin remuneración)',
  rechazado: 'Rechazado',
};

export default function DashboardPermisosPage() {
  const router = useRouter();
  const { data: me } = useSWR('/endpoints/me', fetcher);
  const role: Role = useMemo(() => norm(me?.role), [me?.role]);

  const hasAccess = useMemo(() => {
    if (!me) return false;
    if (role === 'admin') return true;
    return hasFinancialAccess(me);
  }, [me, role]);

  useEffect(() => {
    if (me && !hasAccess) router.replace('/mi/resumen');
  }, [me, hasAccess, router]);

  const [month, setMonth] = useState<string>(new Date().toISOString().slice(0,7)); // YYYY-MM
  const [branch, setBranch] = useState<string>('Todas');
  const [q, setQ] = useState<string>('');
  const shouldFetch = hasAccess ? `/endpoints/permissions?month=${month}&branch=${encodeURIComponent(branch)}&q=${encodeURIComponent(q)}` : null;
  const { data, mutate, isLoading } = useSWR<{
    list: Permission[];
    branches: string[];
  }>(shouldFetch, fetcher);

  const list = data?.list || [];
  const branches = ['Todas', ...(data?.branches || [])];

  const grouped = useMemo(() => {
    const map = new Map<string, Permission[]>();
    for (const r of list) {
      const key = r.branch || 'Sin Sucursal';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries()).sort((a,b)=>a[0].localeCompare(b[0]));
  }, [list]);

  const patchStatus = async (id: string, status: Permission['status']) => {
    const res = await fetch(`/endpoints/permissions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      alert('No se pudo actualizar el estado');
      return;
    }
    mutate();
  };

  return (
    <div
      className="min-h-screen text-white"
      style={{
        backgroundImage:
          `radial-gradient(900px 500px at 90% -20%, rgba(168,85,247,.12), transparent 55%),
           radial-gradient(1200px 600px at 20% -10%, rgba(96,165,250,.14), transparent 60%)`,
        backgroundColor: '#000',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Header */}
      <header className="sticky top-0 z-sticky border-b border-[var(--app-border)] bg-black/30 backdrop-blur-apple">
        <div className="apple-container py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="pill"><Users size={18} /></div>
            <div>
              <h1 className="apple-h1">Permisos del personal</h1>
              <p className="apple-caption">Revisión y estados por sucursal</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 text-app-muted">
              <CalendarDays size={18} /><span className="apple-caption">Mes</span>
            </div>
            <input type="month" value={month} onChange={e=>setMonth(e.target.value)} className="field-sm w-[150px]" />
          </div>
        </div>
      </header>

      {/* Filtros */}
      <section className="apple-container py-6">
        <div className="glass-card">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex items-center gap-2">
              <span className="pill"><Filter size={16}/></span>
              <select value={branch} onChange={(e)=>setBranch(e.target.value)} className="field-sm w-full">
                {branches.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="md:col-span-2 flex items-center gap-2">
              <span className="pill"><Search size={16}/></span>
              <input
                value={q}
                onChange={(e)=>setQ(e.target.value)}
                placeholder="Buscar por nombre, motivo, sucursal…"
                className="field-sm w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Listas por sucursal */}
      <main className="apple-container pb-10 space-y-8">
        {isLoading ? (
          <div className="glass-card apple-caption">Cargando solicitudes…</div>
        ) : grouped.length === 0 ? (
          <div className="glass-card apple-caption">Sin solicitudes en el período.</div>
        ) : (
          grouped.map(([branchName, rows]) => (
            <section key={branchName} className="glass-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="apple-h3">{branchName}</h3>
                <span className="badge-neutral">{rows.length} solicitudes</span>
              </div>

              <div className="overflow-auto">
                <table className="table-apple">
                  <thead>
                    <tr>
                      <th>Empleado</th>
                      <th>Fecha</th>
                      <th>Tipo</th>
                      <th>Horario</th>
                      <th>Motivo</th>
                      <th>Observaciones</th>
                      <th>Respaldo</th>
                      <th>Estado</th>
                      <th className="text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(r => (
                      <tr key={r.id}>
                        <td>
                          <div className="font-medium">{r.employee_name}</div>
                          <div className="apple-caption">{r.employee_role || '—'}</div>
                        </td>
                        <td>{r.date}</td>
                        <td className="capitalize">{r.type}</td>
                        <td>{r.type === 'parcial' ? `${r.start_time}–${r.end_time}` : '—'}</td>
                        <td>{r.reason}</td>
                        <td className="max-w-[320px]">
                          <div className="apple-caption text-white">{r.notes || '—'}</div>
                        </td>
                        <td>
                          {r.proof_url ? (
                            <a href={r.proof_url} target="_blank" className="btn-secondary btn-sm">
                              <ImageIcon size={14}/> Ver
                            </a>
                          ) : <span className="apple-caption">—</span>}
                        </td>
                        <td>
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              className="btn-secondary btn-sm"
                              onClick={()=>patchStatus(r.id, 'aprobado_con_rem')}
                              title="Aprobado con remuneración"
                            >
                              <CircleDollarSign size={14}/> Con remun.
                            </button>
                            <button
                              className="btn-secondary btn-sm"
                              onClick={()=>patchStatus(r.id, 'aprobado_sin_rem')}
                              title="Aprobado sin remuneración"
                            >
                              <CheckCircle2 size={14}/> Sin remun.
                            </button>
                            <button
                              className="btn-danger btn-sm"
                              onClick={()=>patchStatus(r.id, 'rechazado')}
                              title="Rechazar"
                            >
                              <XCircle size={14}/> Rechazar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))
        )}
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: 'pendiente'|'aprobado_con_rem'|'aprobado_sin_rem'|'rechazado' }) {
  if (status === 'pendiente') return <span className="badge badge-warning">Pendiente</span>;
  if (status === 'aprobado_con_rem') return <span className="badge badge-success">Aprobado (con remun.)</span>;
  if (status === 'aprobado_sin_rem') return <span className="badge badge-primary">Aprobado (sin remun.)</span>;
  return <span className="badge badge-danger">Rechazado</span>;
}
