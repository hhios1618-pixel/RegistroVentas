'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Plus, RefreshCcw, Search, Edit2, Save, X, EyeOff, Eye, KeyRound, Users, Filter,
  ChevronLeft, ChevronRight, Hash, MonitorCheck
} from 'lucide-react';

import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Badge } from '@/components/badge';
import { Separator } from '@/components/separator';
import { Label } from '@/components/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/select';
import { Checkbox } from '@/components/Checkbox';

/* =========================
   Tipos (match backend)
   ========================= */
type UserRow = {
  id: string;
  full_name?: string | null;
  username: string;
  email?: string | null;
  role?: string | null;
  fenix_role?: string | null;
  privilege_level?: number | null;
  active: boolean;
  created_at?: string | null;
  branch_id?: string | null;
  phone?: string | null;
  vehicle_type?: string | null;
};

const ROLES = [
  'GERENCIA','ADMIN','COORDINADOR','ASESOR','PROMOTOR','VENDEDOR','LOGISTICA','USER'
] as const;
const VEHICULOS = ['moto','auto','camioneta','camión'];

/* =========================
   Helpers UI
   ========================= */
const rolePill = (r?: string | null) => {
  const x = (r || '').toUpperCase();
  if (x === 'GERENCIA') return 'bg-emerald-500/18 text-emerald-200 border-emerald-400/25';
  if (x === 'ADMIN') return 'bg-indigo-500/18 text-indigo-200 border-indigo-400/25';
  if (x === 'VENDEDOR') return 'bg-blue-500/18 text-blue-200 border-blue-400/25';
  if (x === 'PROMOTOR') return 'bg-fuchsia-500/18 text-fuchsia-200 border-fuchsia-400/25';
  if (x === 'LOGISTICA') return 'bg-yellow-500/18 text-yellow-200 border-yellow-400/25';
  if (x === 'COORDINADOR') return 'bg-cyan-500/18 text-cyan-200 border-cyan-400/25';
  if (x === 'ASESOR') return 'bg-violet-500/18 text-violet-200 border-violet-400/25';
  return 'bg-slate-500/18 text-slate-200 border-slate-400/25';
};
const niceDate = (d?: string | null) => {
  if (!d) return '-';
  try { return new Date(d).toLocaleString('es-BO'); } catch { return d; }
};

/* =========================
   Estados de formulario
   ========================= */
type FormState = {
  full_name: string;
  username: string;
  email: string;
  role: string;
  fenix_role: string;
  privilege_level: number;
  branch_id: string;
  phone: string;
  vehicle_type: string;
  active: boolean;
  password?: string;
};
const emptyForm: FormState = {
  full_name: '',
  username: '',
  email: '',
  role: 'USER',
  fenix_role: 'USER',
  privilege_level: 1,
  branch_id: '',
  phone: '',
  vehicle_type: '',
  active: true,
};

/* =========================
   Página
   ========================= */
export default function UsersAdminPage() {
  const [loading, setLoading] = useState(false);

  // data + conteo total del backend
  const [rows, setRows] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);

  // filtros
  const [q, setQ] = useState('');
  const [fRole, setFRole] = useState<string>('ALL');
  const [fActive, setFActive] = useState<'ALL'|'true'|'false'>('true'); // por defecto activos

  // paginación
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Crear
  const [creating, setCreating] = useState(false);
  const [cForm, setCForm] = useState<FormState>({ ...emptyForm, role: 'VENDEDOR', fenix_role: 'VENDEDOR' });
  const [showPass, setShowPass] = useState(false);

  // Editar
  const [editingId, setEditingId] = useState<string | null>(null);
  const [eForm, setEForm] = useState<FormState>(emptyForm);

  // ====== Loader con filtros/paginación ======
  async function fetchUsers({ signal }: { signal?: AbortSignal } = {}) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (q.trim()) params.set('q', q.trim());
      if (fRole !== 'ALL') params.set('role', fRole);
      if (fActive !== 'ALL') params.set('active', fActive);

      const r = await fetch(`/endpoints/users?${params.toString()}`, { cache: 'no-store', signal });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || 'Error cargando usuarios');

      setRows(j.data || []);
      setTotal(j.total ?? (j.data?.length ?? 0));
    } catch (e: any) {
      if (e.name !== 'AbortError') toast.error(e.message || 'Error cargando usuarios');
    } finally {
      setLoading(false);
    }
  }

  // debounce búsqueda
  useEffect(() => {
    const ctrl = new AbortController();
    const t = setTimeout(() => fetchUsers({ signal: ctrl.signal }), 300);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, fRole, fActive, page, pageSize]);

  // reset page al cambiar filtros
  useEffect(() => { setPage(1); }, [q, fRole, fActive]);

  // ====== Crear ======
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!cForm.full_name || !cForm.username || !cForm.email || !cForm.role || !cForm.password) {
      toast.error('Completa nombre, username, email, rol y password.'); return;
    }
    try {
      setLoading(true);
      const r = await fetch('/endpoints/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json'},
        body: JSON.stringify({
          full_name: cForm.full_name,
          username: cForm.username.trim(),
          email: cForm.email.trim(),
          fenix_role: cForm.fenix_role || cForm.role,
          role: cForm.role,
          privilege_level: Number(cForm.privilege_level || 1),
          password: cForm.password,
          branch_id: cForm.branch_id || null,
          phone: cForm.phone || null,
          vehicle_type: cForm.vehicle_type || null,
          active: cForm.active
        })
      });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || 'No se pudo crear');
      toast.success('Usuario creado');
      setCreating(false);
      setCForm({ ...emptyForm, role: 'VENDEDOR', fenix_role: 'VENDEDOR' });
      fetchUsers();
    } catch (e:any) {
      toast.error(e.message || 'Error al crear');
    } finally {
      setLoading(false);
    }
  }

  // ====== Editar ======
  function startEdit(u: UserRow) {
    setEditingId(u.id);
    setEForm({
      full_name: u.full_name || '',
      username: u.username,
      email: u.email || '',
      role: (u.role || u.fenix_role || 'USER').toUpperCase(),
      fenix_role: (u.fenix_role || u.role || 'USER').toUpperCase(),
      privilege_level: Number(u.privilege_level || 1),
      branch_id: u.branch_id || '',
      phone: u.phone || '',
      vehicle_type: u.vehicle_type || '',
      active: !!u.active,
    });
  }

  async function saveEdit() {
    if (!editingId) return;
    try {
      setLoading(true);
      const r = await fetch(`/endpoints/users/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({
          full_name: eForm.full_name,
          email: eForm.email,
          role: eForm.role,
          fenix_role: eForm.fenix_role,
          privilege_level: Number(eForm.privilege_level || 1),
          branch_id: eForm.branch_id || null,
          phone: eForm.phone || null,
          vehicle_type: eForm.vehicle_type || null,
          active: eForm.active
        })
      });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || 'No se pudo guardar');
      toast.success('Usuario actualizado');
      setEditingId(null);
      fetchUsers();
    } catch (e:any) {
      toast.error(e.message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  }

  // ====== Toggle activo ======
  async function toggleActive(u: UserRow) {
    try {
      const r = await fetch(`/endpoints/users/${u.id}`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ action:'toggle' })
      });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || 'No se pudo actualizar estado');
      setRows(prev => prev.map(x => x.id === u.id ? { ...x, active: j.active } : x));
      toast.success(j.active ? 'Activado' : 'Desactivado');
    } catch (e:any) {
      toast.error(e.message || 'Error al cambiar estado');
    }
  }

  // ====== Reset password ======
  async function resetPassword(u: UserRow) {
    const pass = prompt(`Nueva contraseña para ${u.username}:`);
    if (!pass) return;
    try {
      const r = await fetch(`/endpoints/users/${u.id}`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ action:'reset-password', newPassword: pass })
      });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || 'No se pudo resetear');
      toast.success('Contraseña actualizada');
    } catch (e:any) {
      toast.error(e.message || 'Error al resetear contraseña');
    }
  }

  /* =========================
     Render
     ========================= */
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" /> Mantenedor de Usuarios
          </h1>
          <Badge className="bg-white/8 border border-white/15">Total: {total}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => fetchUsers()} loading={loading}>
            <RefreshCcw className="w-4 h-4 mr-2" /> Actualizar
          </Button>
          <Button onClick={() => setCreating(true)}>
            <Plus className="w-4 h-4 mr-2" /> Nuevo Usuario
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card className="mb-5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" /> Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-2">
            <Label className="text-slate-300">Búsqueda</Label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-9 bg-slate-900/70 border-slate-700 placeholder:text-slate-500"
                placeholder="Nombre, usuario, email, sucursal…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label className="text-slate-300">Rol</Label>
            <Select value={fRole} onValueChange={setFRole}>
              <SelectTrigger className="bg-slate-900/70 border-slate-700">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">
                <SelectItem value="ALL">Todos</SelectItem>
                {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-slate-300">Estado</Label>
            <Select value={fActive} onValueChange={(v) => setFActive(v as any)}>
              <SelectTrigger className="bg-slate-900/70 border-slate-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">
                <SelectItem value="ALL">Todos</SelectItem>
                <SelectItem value="true">Activos</SelectItem>
                <SelectItem value="false">Inactivos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardHeader className="flex flex-col gap-3">
          <CardTitle className="flex items-center gap-2">
            <MonitorCheck className="w-5 h-5" /> Usuarios
          </CardTitle>

          {/* Barra de paginación */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Button variant="outline" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-slate-300">
                Página <b>{page}</b> de <b>{totalPages}</b>
              </span>
              <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4 text-slate-400" />
              <Label className="text-slate-300">Mostrar</Label>
              <Select value={String(pageSize)} onValueChange={(v)=> setPageSize(Number(v))}>
                <SelectTrigger className="w-28 bg-slate-900/70 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  {[20, 50, 100, 200, 500, 1000].map(n =>
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <span className="text-sm text-slate-400">filas por página</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-400">
              <tr className="border-b border-slate-800/70">
                <th className="py-2 pr-3">Usuario</th>
                <th className="py-2 pr-3">Nombre</th>
                <th className="py-2 pr-3">Email</th>
                <th className="py-2 pr-3">Rol</th>
                <th className="py-2 pr-3">Sucursal</th>
                <th className="py-2 pr-3">Teléfono</th>
                <th className="py-2 pr-3">Estado</th>
                <th className="py-2 pr-3">Creado</th>
                <th className="py-2 pr-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(u => (
                <tr key={u.id} className="border-b border-slate-900/60 hover:bg-white/5">
                  <td className="py-2 pr-3 font-mono">{u.username}</td>
                  <td className="py-2 pr-3">{u.full_name || '-'}</td>
                  <td className="py-2 pr-3">{u.email || '-'}</td>
                  <td className="py-2 pr-3">
                    <span className={`px-2 py-1 rounded border text-xs ${rolePill(u.fenix_role || u.role)}`}>
                      {(u.fenix_role || u.role || 'USER').toString().toUpperCase()}
                    </span>
                  </td>
                  <td className="py-2 pr-3">{u.branch_id || '-'}</td>
                  <td className="py-2 pr-3">{u.phone || '-'}</td>
                  <td className="py-2 pr-3">
                    {u.active ? (
                      <Badge className="bg-emerald-500/18 text-emerald-200 border border-emerald-400/25">Activo</Badge>
                    ) : (
                      <Badge className="bg-rose-500/18 text-rose-200 border border-rose-400/25">Inactivo</Badge>
                    )}
                  </td>
                  <td className="py-2 pr-3">{niceDate(u.created_at)}</td>
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-2 justify-end">
                      <Button variant="outline" onClick={() => startEdit(u)}>
                        <Edit2 className="w-4 h-4 mr-2" /> Editar
                      </Button>
                      <Button variant="outline" onClick={() => resetPassword(u)}>
                        <KeyRound className="w-4 h-4 mr-2" /> Reset
                      </Button>
                      <Button
                        variant={u.active ? 'secondary' : 'default'}
                        onClick={() => toggleActive(u)}
                        title={u.active ? 'Desactivar' : 'Activar'}
                      >
                        {u.active ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                        {u.active ? 'Desactivar' : 'Activar'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={9} className="py-10 text-center text-slate-500">Sin resultados</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Modal Crear */}
      {creating && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm grid place-items-center z-50">
          <div className="w-full max-w-2xl bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
            <div className="p-4 flex items-center justify-between border-b border-slate-700">
              <h3 className="font-semibold flex items-center gap-2">
                <Users className="w-5 h-5" /> Nuevo Usuario
              </h3>
              <Button variant="ghost" onClick={() => setCreating(false)}><X className="w-5 h-5" /></Button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nombre Completo</Label>
                  <Input className="bg-slate-900/70 border-slate-700" value={cForm.full_name} onChange={(e)=>setCForm(p=>({...p, full_name:e.target.value}))}/>
                </div>
                <div>
                  <Label>Username</Label>
                  <Input className="bg-slate-900/70 border-slate-700" value={cForm.username} onChange={(e)=>setCForm(p=>({...p, username:e.target.value}))}/>
                </div>
                <div>
                  <Label>Email</Label>
                  <Input className="bg-slate-900/70 border-slate-700" type="email" value={cForm.email} onChange={(e)=>setCForm(p=>({...p, email:e.target.value}))}/>
                </div>
                <div>
                  <Label>Password</Label>
                  <div className="flex gap-2">
                    <Input className="bg-slate-900/70 border-slate-700" type={showPass ? 'text' : 'password'} value={cForm.password || ''} onChange={(e)=>setCForm(p=>({...p, password:e.target.value}))}/>
                    <Button variant="outline" onClick={()=>setShowPass(v=>!v)}>{showPass?'Ocultar':'Ver'}</Button>
                  </div>
                </div>
                <div>
                  <Label>Rol</Label>
                  <Select value={cForm.role} onValueChange={(v)=>setCForm(p=>({...p, role:v, fenix_role:v}))}>
                    <SelectTrigger className="bg-slate-900/70 border-slate-700"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Privilegios</Label>
                  <Input className="bg-slate-900/70 border-slate-700" type="number" min={1} max={10} value={cForm.privilege_level} onChange={(e)=>setCForm(p=>({...p, privilege_level:Number(e.target.value||1)}))}/>
                </div>
                <div>
                  <Label>Sucursal</Label>
                  <Input className="bg-slate-900/70 border-slate-700" value={cForm.branch_id} onChange={(e)=>setCForm(p=>({...p, branch_id:e.target.value}))}/>
                </div>
                <div>
                  <Label>Teléfono</Label>
                  <Input className="bg-slate-900/70 border-slate-700" value={cForm.phone} onChange={(e)=>setCForm(p=>({...p, phone:e.target.value}))}/>
                </div>
                <div>
                  <Label>Vehículo</Label>
                  <Select value={cForm.vehicle_type} onValueChange={(v)=>setCForm(p=>({...p, vehicle_type:v}))}>
                    <SelectTrigger className="bg-slate-900/70 border-slate-700"><SelectValue placeholder="(opcional)" /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      {VEHICULOS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2">
                  <Checkbox
                    checked={cForm.active}
                    onChange={(e)=>setCForm(p=>({...p, active: !!e.target.checked}))}
                    className="bg-slate-900/70 border-slate-700"
                  />
                  <span className="text-sm">Activo</span>
                </div>
              </div>

              <Separator/>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={()=>setCreating(false)}>Cancelar</Button>
                <Button onClick={handleCreate} loading={loading}><Save className="w-4 h-4 mr-2" /> Guardar</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar */}
      {editingId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm grid place-items-center z-50">
          <div className="w-full max-w-2xl bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
            <div className="p-4 flex items-center justify-between border-b border-slate-700">
              <h3 className="font-semibold flex items-center gap-2">
                <Edit2 className="w-5 h-5" /> Editar Usuario
              </h3>
              <Button variant="ghost" onClick={() => setEditingId(null)}><X className="w-5 h-5" /></Button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nombre Completo</Label>
                  <Input className="bg-slate-900/70 border-slate-700" value={eForm.full_name} onChange={(e)=>setEForm(p=>({...p, full_name:e.target.value}))}/>
                </div>
                <div>
                  <Label>Username</Label>
                  <Input className="bg-slate-900/70 border-slate-700" value={eForm.username} disabled />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input className="bg-slate-900/70 border-slate-700" type="email" value={eForm.email} onChange={(e)=>setEForm(p=>({...p, email:e.target.value}))}/>
                </div>
                <div>
                  <Label>Rol</Label>
                  <Select value={eForm.role} onValueChange={(v)=>setEForm(p=>({...p, role:v, fenix_role:v}))}>
                    <SelectTrigger className="bg-slate-900/70 border-slate-700"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Privilegios</Label>
                  <Input className="bg-slate-900/70 border-slate-700" type="number" min={1} max={10} value={eForm.privilege_level} onChange={(e)=>setEForm(p=>({...p, privilege_level:Number(e.target.value||1)}))}/>
                </div>
                <div>
                  <Label>Sucursal</Label>
                  <Input className="bg-slate-900/70 border-slate-700" value={eForm.branch_id} onChange={(e)=>setEForm(p=>({...p, branch_id:e.target.value}))}/>
                </div>
                <div>
                  <Label>Teléfono</Label>
                  <Input className="bg-slate-900/70 border-slate-700" value={eForm.phone} onChange={(e)=>setEForm(p=>({...p, phone:e.target.value}))}/>
                </div>
                <div>
                  <Label>Vehículo</Label>
                  <Select value={eForm.vehicle_type} onValueChange={(v)=>setEForm(p=>({...p, vehicle_type:v}))}>
                    <SelectTrigger className="bg-slate-900/70 border-slate-700"><SelectValue placeholder="(opcional)" /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      {VEHICULOS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2">
                  <Checkbox
                    checked={eForm.active}
                    onChange={(e)=>setEForm(p=>({...p, active: !!e.target.checked}))}
                    className="bg-slate-900/70 border-slate-700"
                  />
                  <span className="text-sm">Activo</span>
                </div>
              </div>

              <Separator/>
              <div className="flex justify-between">
                <Button variant="outline" onClick={()=>setEditingId(null)}>
                  <X className="w-4 h-4 mr-2" /> Cancelar
                </Button>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={()=>resetPassword({ id: editingId, username: eForm.username, active: true } as UserRow)}>
                    <KeyRound className="w-4 h-4 mr-2" /> Reset Pass
                  </Button>
                  <Button onClick={saveEdit} loading={loading}>
                    <Save className="w-4 h-4 mr-2" /> Guardar Cambios
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}