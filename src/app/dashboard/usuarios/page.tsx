'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Plus, RefreshCcw, Search, Edit2, Save, X, EyeOff, Eye, KeyRound, ShieldCheck, Users, Filter,
} from 'lucide-react';

import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Badge } from '@/components/badge';
import { Separator } from '@/components/separator';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/select';
import { Checkbox } from '@/components/Checkbox';

// ===== Tipos que devuelve v_users_admin (ajústalos si tu vista cambia) =====
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
  // de users_profile (si están en la vista)
  branch_id?: string | null;
  phone?: string | null;
  vehicle_type?: string | null;
};

const ROLES = [
  'GERENCIA','ADMIN','COORDINADOR','ASESOR','PROMOTOR','VENDEDOR','LOGISTICA','USER'
] as const;

const vehiculos = ['moto','auto','camioneta','camión'];

// ===== Helpers =====
const roleColor = (r?: string | null) => {
  const x = (r || '').toUpperCase();
  if (x === 'GERENCIA') return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
  if (x === 'ADMIN') return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
  if (x === 'VENDEDOR') return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
  if (x === 'PROMOTOR') return 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30';
  if (x === 'LOGISTICA') return 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30';
  return 'bg-slate-500/15 text-slate-300 border-slate-500/30';
};

function niceDate(d?: string | null) {
  if (!d) return '-';
  try { return new Date(d).toLocaleString(); } catch { return d; }
}

// ===== Form de Crear/Editar =====
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
  password?: string; // solo creación o reset manual
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

export default function UsersAdminPage() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<UserRow[]>([]);
  const [q, setQ] = useState('');
  const [fRole, setFRole] = useState<string>('ALL');
  const [fActive, setFActive] = useState<'ALL'|'true'|'false'>('ALL');

  // Crear
  const [creating, setCreating] = useState(false);
  const [cForm, setCForm] = useState<FormState>({ ...emptyForm, role: 'VENDEDOR', fenix_role: 'VENDEDOR' });

  // Editar
  const [editingId, setEditingId] = useState<string | null>(null);
  const [eForm, setEForm] = useState<FormState>(emptyForm);

  // Reset pass
  const [showPass, setShowPass] = useState(false);

  // ====== Data ======
  async function load() {
    setLoading(true);
    try {
      const r = await fetch('/endpoints/users', { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || 'Error cargando usuarios');
      setRows(j.data as UserRow[]);
    } catch (e:any) {
      toast.error(e.message || 'Error cargando usuarios');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  // ====== Filtros ======
  const filtered = useMemo(() => {
    return rows.filter((u) => {
      if (fRole !== 'ALL') {
        const rr = (u.fenix_role || u.role || '').toUpperCase();
        if (rr !== fRole) return false;
      }
      if (fActive !== 'ALL') {
        if (String(u.active) !== fActive) return false;
      }
      if (q) {
        const s = q.toLowerCase();
        const blob = [
          u.username, u.full_name, u.email, u.branch_id, u.phone, u.vehicle_type,
          u.role, u.fenix_role
        ].filter(Boolean).join(' ').toLowerCase();
        return blob.includes(s);
      }
      return true;
    });
  }, [rows, q, fRole, fActive]);

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
      load();
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
      username: u.username,             // solo lectura en UI (no se edita)
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
      load();
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

  // ====== UI ======
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" /> Mantenedor de Usuarios
          </h1>
          <Badge className="bg-white/5 border border-white/10">Total: {rows.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={load} loading={loading}>
            <RefreshCcw className="w-4 h-4 mr-2" /> Actualizar
          </Button>
          <Button onClick={() => setCreating(true)}>
            <Plus className="w-4 h-4 mr-2" /> Nuevo Usuario
          </Button>
        </div>
      </div>

      <Card className="mb-5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" /> Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="col-span-2">
            <Label>Búsqueda</Label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <Input
                className="pl-9"
                placeholder="Nombre, usuario, email, sucursal…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>Rol</Label>
            <Select value={fRole} onValueChange={setFRole}>
              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Estado</Label>
            <Select value={fActive} onValueChange={(v:any)=>setFActive(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                <SelectItem value="true">Activos</SelectItem>
                <SelectItem value="false">Inactivos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usuarios</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-400">
              <tr className="border-b border-slate-700/50">
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
              {filtered.map(u => (
                <tr key={u.id} className="border-b border-slate-800/60">
                  <td className="py-2 pr-3 font-mono">{u.username}</td>
                  <td className="py-2 pr-3">{u.full_name || '-'}</td>
                  <td className="py-2 pr-3">{u.email || '-'}</td>
                  <td className="py-2 pr-3">
                    <span className={`px-2 py-1 rounded border text-xs ${roleColor(u.fenix_role || u.role)}`}>
                      {(u.fenix_role || u.role || 'USER').toString().toUpperCase()}
                    </span>
                  </td>
                  <td className="py-2 pr-3">{u.branch_id || '-'}</td>
                  <td className="py-2 pr-3">{u.phone || '-'}</td>
                  <td className="py-2 pr-3">
                    {u.active ? (
                      <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30">Activo</Badge>
                    ) : (
                      <Badge className="bg-rose-500/15 text-rose-300 border-rose-500/30">Inactivo</Badge>
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
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="py-8 text-center text-slate-500">Sin resultados</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Drawer/Modal Crear */}
      {creating && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm grid place-items-center z-50">
          <div className="w-full max-w-2xl bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
            <div className="p-4 flex items-center justify-between border-b border-slate-700">
              <h3 className="font-semibold flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" /> Nuevo Usuario
              </h3>
              <Button variant="ghost" onClick={() => setCreating(false)}><X className="w-5 h-5" /></Button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nombre Completo</Label>
                  <Input value={cForm.full_name} onChange={(e)=>setCForm(p=>({...p, full_name:e.target.value}))}/>
                </div>
                <div>
                  <Label>Username</Label>
                  <Input value={cForm.username} onChange={(e)=>setCForm(p=>({...p, username:e.target.value}))}/>
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={cForm.email} onChange={(e)=>setCForm(p=>({...p, email:e.target.value}))}/>
                </div>
                <div>
                  <Label>Password</Label>
                  <div className="flex gap-2">
                    <Input type={showPass ? 'text' : 'password'} value={cForm.password || ''} onChange={(e)=>setCForm(p=>({...p, password:e.target.value}))}/>
                    <Button variant="outline" onClick={()=>setShowPass(v=>!v)}>{showPass?'Ocultar':'Ver'}</Button>
                  </div>
                </div>
                <div>
                  <Label>Rol</Label>
                  <Select value={cForm.role} onValueChange={(v)=>setCForm(p=>({...p, role:v, fenix_role:v}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Privilegios</Label>
                  <Input type="number" min={1} max={10} value={cForm.privilege_level} onChange={(e)=>setCForm(p=>({...p, privilege_level:Number(e.target.value||1)}))}/>
                </div>
                <div>
                  <Label>Sucursal</Label>
                  <Input value={cForm.branch_id} onChange={(e)=>setCForm(p=>({...p, branch_id:e.target.value}))}/>
                </div>
                <div>
                  <Label>Teléfono</Label>
                  <Input value={cForm.phone} onChange={(e)=>setCForm(p=>({...p, phone:e.target.value}))}/>
                </div>
                <div>
                  <Label>Vehículo</Label>
                  <Select value={cForm.vehicle_type} onValueChange={(v)=>setCForm(p=>({...p, vehicle_type:v}))}>
                    <SelectTrigger><SelectValue placeholder="(opcional)" /></SelectTrigger>
                    <SelectContent>
                      {vehiculos.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2">
                  <Checkbox checked={cForm.active} onCheckedChange={(v)=>setCForm(p=>({...p, active: !!v}))}/>
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

      {/* Drawer/Modal Editar */}
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
                  <Input value={eForm.full_name} onChange={(e)=>setEForm(p=>({...p, full_name:e.target.value}))}/>
                </div>
                <div>
                  <Label>Username</Label>
                  <Input value={eForm.username} disabled />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={eForm.email} onChange={(e)=>setEForm(p=>({...p, email:e.target.value}))}/>
                </div>
                <div>
                  <Label>Rol</Label>
                  <Select value={eForm.role} onValueChange={(v)=>setEForm(p=>({...p, role:v, fenix_role:v}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Privilegios</Label>
                  <Input type="number" min={1} max={10} value={eForm.privilege_level} onChange={(e)=>setEForm(p=>({...p, privilege_level:Number(e.target.value||1)}))}/>
                </div>
                <div>
                  <Label>Sucursal</Label>
                  <Input value={eForm.branch_id} onChange={(e)=>setEForm(p=>({...p, branch_id:e.target.value}))}/>
                </div>
                <div>
                  <Label>Teléfono</Label>
                  <Input value={eForm.phone} onChange={(e)=>setEForm(p=>({...p, phone:e.target.value}))}/>
                </div>
                <div>
                  <Label>Vehículo</Label>
                  <Select value={eForm.vehicle_type} onValueChange={(v)=>setEForm(p=>({...p, vehicle_type:v}))}>
                    <SelectTrigger><SelectValue placeholder="(opcional)" /></SelectTrigger>
                    <SelectContent>
                      {vehiculos.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2">
                  <Checkbox checked={eForm.active} onCheckedChange={(v)=>setEForm(p=>({...p, active: !!v}))}/>
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