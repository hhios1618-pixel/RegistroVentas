'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import {
  Search,
  Shield,
  Mail,
  Phone,
  Building2,
  UserRound,
  KeyRound,
  RefreshCw,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Loader2,
  Pencil,
  Trash2,
  UserPlus,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal';
import { Input } from '@/components/Input';
import { cn } from '@/lib/utils/cn';

/* ==========================================================================
   Tipos
   ========================================================================= */

type UserRow = {
  id: string;
  full_name: string;
  fenix_role: string | null;
  privilege_level: number | null;
  username: string | null;
  email: string | null;
  active: boolean;
  created_at: string;
  branch_id: string | null;
  phone: string | null;
  vehicle_type: string | null;
  initial_password_plain_text?: string | null;
};

type UsersResponse = {
  ok: boolean;
  data: UserRow[];
  total: number;
  page: number;
  pageSize: number;
  error?: string;
};

type BaseResponse = {
  ok?: boolean;
  error?: string | null;
};

type Site = {
  id: string;
  name: string;
};

/* ==========================================================================
   Constantes y helpers
   ========================================================================= */

const ROLE_OPTIONS = [
  { value: 'ADMIN', label: 'Administración' },
  { value: 'GERENCIA', label: 'Gerencia' },
  { value: 'COORDINADOR', label: 'Coordinación' },
  { value: 'LIDER', label: 'Liderazgo' },
  { value: 'ASESOR', label: 'Asesor' },
  { value: 'PROMOTOR', label: 'Promotor' },
  { value: 'LOGISTICA', label: 'Logística' },
];

const PRIVILEGE_OPTIONS = [1, 2, 3, 4, 5];

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'inactive', label: 'Inactivos' },
];

const NO_BRANCH_OPTION = '__none__';

const fetcher = async (url: string): Promise<UsersResponse> => {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Fallo al cargar usuarios (${res.status})`);
  }
  const json: UsersResponse = await res.json();
  if (!json.ok) {
    throw new Error(json.error || 'No se pudo obtener la lista de usuarios');
  }
  return json;
};

const fetchSites = async (): Promise<Site[]> => {
  const res = await fetch('/endpoints/sites');
  if (!res.ok) {
    console.error('[usuarios] No se pudieron cargar las sucursales', res.status);
    return [];
  }
  const json = (await res.json()) as { ok?: boolean; results?: Site[] };
  if (!json.ok || !Array.isArray(json.results)) return [];
  return json.results;
};

const fmtDate = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('es-BO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const roleLabel = (value?: string | null) => {
  if (!value) return '—';
  const upper = value.toUpperCase();
  return ROLE_OPTIONS.find((r) => r.value === upper)?.label ?? upper;
};

const randomPassword = (length = 10) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789$%*!@#';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const getErrorMessage = (err: unknown, fallback: string) => {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'string' && err.trim()) return err;
  return fallback;
};

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handle);
  }, [value, delay]);
  return debounced;
}

const StatusBadge = ({ active }: { active: boolean }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-apple-caption font-medium',
      active
        ? 'bg-apple-green-500/20 border border-apple-green-500/40 text-apple-green-300'
        : 'bg-apple-red-500/15 border border-apple-red-500/40 text-apple-red-300'
    )}
  >
    {active ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
    {active ? 'Activo' : 'Inactivo'}
  </span>
);

const EmptyState = () => (
  <div className="py-16 text-center">
    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/5">
      <UserRound size={24} className="text-apple-gray-400" />
    </div>
    <p className="apple-h4 text-white">Sin usuarios</p>
    <p className="apple-body text-apple-gray-400">
      Ajusta los filtros o crea un nuevo usuario para comenzar.
    </p>
  </div>
);

const LoadingState = () => (
  <div className="flex items-center justify-center py-20">
    <div className="flex items-center gap-3 text-apple-gray-300">
      <Loader2 size={20} className="animate-spin" />
      <span className="apple-body">Cargando usuarios...</span>
    </div>
  </div>
);

/* ==========================================================================
   Página principal
   ========================================================================= */

export default function AdminUsuariosPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), 350);
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    if (debouncedSearch) params.set('q', debouncedSearch);
    if (roleFilter !== 'all') params.set('role', roleFilter.toUpperCase());
    if (statusFilter === 'active') params.set('active', 'true');
    if (statusFilter === 'inactive') params.set('active', 'false');
    if (branchFilter !== 'all') params.set('branch', branchFilter);
    return params.toString();
  }, [page, pageSize, debouncedSearch, roleFilter, statusFilter, branchFilter]);

  const { data, error, isLoading, mutate } = useSWR<UsersResponse>(
    `/endpoints/users?${queryString}`,
    fetcher,
    { keepPreviousData: true }
  );

  const { data: sites } = useSWR<Site[]>('/endpoints/sites', fetchSites);
  const branchOptions = useMemo(() => {
    const list = new Set<string>();
    (sites ?? []).forEach((site) => {
      const name = site?.name?.trim();
      if (name) list.add(name);
    });
    return Array.from(list).sort((a, b) => a.localeCompare(b));
  }, [sites]);

  const total = data?.total ?? 0;
  const rows = data?.data ?? [];
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, roleFilter, statusFilter, branchFilter]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  /* === Estado de formularios === */
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createdUser, setCreatedUser] = useState<UserRow | null>(null);
  const [createForm, setCreateForm] = useState({
    full_name: '',
    fenix_role: 'ASESOR',
    email: '',
    username: '',
    privilege_level: 1,
    branch_id: '',
    phone: '',
    vehicle_type: '',
    password: '',
  });

  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    fenix_role: 'ASESOR',
    privilege_level: 1,
    branch_id: '',
    phone: '',
    vehicle_type: '',
    active: true,
  });
  const [editLoading, setEditLoading] = useState(false);

  const [resetTarget, setResetTarget] = useState<UserRow | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const openCreate = () => {
    setCreatedUser(null);
    setCreateForm({
      full_name: '',
      fenix_role: 'ASESOR',
      email: '',
      username: '',
      privilege_level: 1,
      branch_id: '',
      phone: '',
      vehicle_type: '',
      password: '',
    });
    setCreateOpen(true);
  };

  const handleCreate = async (evt: React.FormEvent<HTMLFormElement>) => {
    evt.preventDefault();
    setCreateLoading(true);
    setCreatedUser(null);
    try {
      const payload = {
        full_name: createForm.full_name.trim(),
        fenix_role: createForm.fenix_role.trim(),
        email: createForm.email.trim() || undefined,
        username: createForm.username.trim() || undefined,
        privilege_level: Number(createForm.privilege_level) || 1,
        branch_id: createForm.branch_id.trim() || null,
        phone: createForm.phone.trim() || null,
        vehicle_type: createForm.vehicle_type.trim() || null,
        password: createForm.password.trim() || undefined,
      };

      if (!payload.full_name) {
        toast.error('El nombre completo es obligatorio');
        return;
      }

      const res = await fetch('/endpoints/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = (await res.json()) as BaseResponse & { data?: UserRow };
      if (!res.ok || !json.ok) {
        throw new Error(json.error || `Fallo al crear usuario (${res.status})`);
      }

      setCreatedUser(json.data ?? null);
      toast.success('Usuario creado correctamente');
      await mutate();
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo crear el usuario'));
    } finally {
      setCreateLoading(false);
    }
  };

  const openEdit = (user: UserRow) => {
    setEditingUser(user);
    setEditForm({
      full_name: user.full_name ?? '',
      email: user.email ?? '',
      fenix_role: (user.fenix_role || 'ASESOR').toUpperCase(),
      privilege_level: user.privilege_level ?? 1,
      branch_id: user.branch_id ?? '',
      phone: user.phone ?? '',
      vehicle_type: user.vehicle_type ?? '',
      active: user.active,
    });
  };

  const handleEdit = async (evt: React.FormEvent<HTMLFormElement>) => {
    evt.preventDefault();
    if (!editingUser) return;
    setEditLoading(true);
    try {
      const payload = {
        full_name: editForm.full_name.trim(),
        email: editForm.email.trim(),
        fenix_role: editForm.fenix_role.trim(),
        privilege_level: Number(editForm.privilege_level) || 1,
        branch_id: editForm.branch_id.trim() || null,
        phone: editForm.phone.trim() || null,
        vehicle_type: editForm.vehicle_type.trim() || null,
        active: !!editForm.active,
      };

      const res = await fetch(`/endpoints/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as BaseResponse;
      if (!res.ok || !json.ok) {
        throw new Error(json.error || `No se pudo actualizar (${res.status})`);
      }

      toast.success('Usuario actualizado');
      setEditingUser(null);
      await mutate();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Error al actualizar'));
    } finally {
      setEditLoading(false);
    }
  };

  const handleToggleActive = async (user: UserRow) => {
    try {
      const res = await fetch(`/endpoints/users/${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle' }),
      });
      const json = (await res.json()) as BaseResponse & { active?: boolean };
      if (!res.ok || !json.ok) {
        throw new Error(json.error || `No se pudo actualizar (${res.status})`);
      }
      toast.success(json.active ? 'Usuario activado' : 'Usuario desactivado');
      await mutate();
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo cambiar el estado'));
    }
  };

  const openReset = (user: UserRow) => {
    setResetTarget(user);
    setResetPassword(randomPassword(10));
    setShowPassword(false);
  };

  const handleReset = async (evt: React.FormEvent<HTMLFormElement>) => {
    evt.preventDefault();
    if (!resetTarget) return;
    const pwd = resetPassword.trim();
    if (pwd.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setResetLoading(true);
    try {
      const res = await fetch(`/endpoints/users/${resetTarget.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset-password', newPassword: pwd }),
      });
      const json = (await res.json()) as BaseResponse;
      if (!res.ok || !json.ok) {
        throw new Error(json.error || `No se pudo actualizar (${res.status})`);
      }

      toast.success('Contraseña restablecida');
      setResetTarget(null);
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo restablecer la contraseña'));
    } finally {
      setResetLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/endpoints/users/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      const json = (await res.json()) as BaseResponse;
      if (!res.ok || !json.ok) {
        throw new Error(json.error || `No se pudo eliminar (${res.status})`);
      }
      toast.success('Usuario eliminado');
      setDeleteTarget(null);
      await mutate();
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo eliminar el usuario'));
    } finally {
      setDeleteLoading(false);
    }
  };

  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success('Copiado al portapapeles');
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo copiar'));
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="apple-h1 text-white">Usuarios</h1>
          <p className="apple-body text-apple-gray-400">
            Administra las cuentas y accesos del sistema Fenix.
          </p>
        </div>
        <Button leftIcon={<UserPlus size={18} />} onClick={openCreate}>
          Nuevo usuario
        </Button>
      </header>

      <section className="glass-card space-y-4 p-4 sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row">
            <label className="relative flex-1">
              <span className="sr-only">Buscar</span>
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-apple-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, email o sucursal"
                className="pl-9"
              />
            </label>
            <label className="flex-1">
              <span className="apple-caption text-apple-gray-400 mb-1 block">Rol</span>
              <select
                className="input-apple w-full"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="all">Todos</option>
                {ROLE_OPTIONS.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex-1">
              <span className="apple-caption text-apple-gray-400 mb-1 block">Estado</span>
              <select
                className="input-apple w-full"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex-1">
              <span className="apple-caption text-apple-gray-400 mb-1 block">Sucursal</span>
              <select
                className="input-apple w-full"
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
              >
                <option value="all">Todas</option>
                {branchOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
                <option value={NO_BRANCH_OPTION}>Sin sucursal</option>
              </select>
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<RefreshCw size={16} />}
              onClick={() => mutate()}
            >
              Recargar
            </Button>
            <div className="apple-caption text-apple-gray-400">
              {total.toLocaleString('es-BO')} usuarios
            </div>
          </div>
        </div>
      </section>

      <section className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/5">
            <thead>
              <tr className="text-left text-apple-caption uppercase text-apple-gray-400">
                <th className="px-6 py-4">Usuario</th>
                <th className="px-6 py-4">Rol</th>
                <th className="px-6 py-4">Contacto</th>
                <th className="px-6 py-4">Sucursal</th>
                <th className="px-6 py-4">Privilegio</th>
                <th className="px-6 py-4">Creado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading && (
                <tr>
                  <td colSpan={7}>
                    <LoadingState />
                  </td>
                </tr>
              )}

              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <EmptyState />
                  </td>
                </tr>
              )}

              {!isLoading && rows.map((user) => (
                <tr key={user.id} className="transition hover:bg-white/5">
                  <td className="px-6 py-4 align-top">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <p className="apple-body text-white font-semibold">
                          {user.full_name || 'Sin nombre'}
                        </p>
                        <StatusBadge active={user.active} />
                      </div>
                      <div className="apple-caption text-apple-gray-400 flex items-center gap-2">
                        <Shield size={14} />
                        {user.username || '—'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 align-top">
                    <div className="apple-body text-white">{roleLabel(user.fenix_role)}</div>
                    <div className="apple-caption text-apple-gray-500">
                      {(user.fenix_role || '').toUpperCase() || '—'}
                    </div>
                  </td>
                  <td className="px-6 py-4 align-top">
                    <div className="space-y-1 apple-caption text-apple-gray-300">
                      <div className="flex items-center gap-2">
                        <Mail size={14} className="text-apple-gray-500" />
                        <span>{user.email || '—'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone size={14} className="text-apple-gray-500" />
                        <span>{user.phone || '—'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 align-top">
                    <div className="flex items-center gap-2 apple-body text-white/80">
                      <Building2 size={14} className="text-apple-gray-500" />
                      <span>{user.branch_id || 'Sin sucursal'}</span>
                    </div>
                    {user.vehicle_type && (
                      <div className="apple-caption text-apple-gray-500 mt-1">
                        Vehículo: {user.vehicle_type}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 align-top">
                    <div className="apple-body text-white">
                      Nivel {user.privilege_level ?? '—'}
                    </div>
                  </td>
                  <td className="px-6 py-4 align-top">
                    <div className="apple-caption text-apple-gray-400">
                      {fmtDate(user.created_at)}
                    </div>
                  </td>
                  <td className="px-6 py-4 align-top">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Pencil size={16} />}
                        onClick={() => openEdit(user)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<KeyRound size={16} />}
                        onClick={() => openReset(user)}
                      >
                        Reset
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={user.active ? <EyeOff size={16} /> : <Eye size={16} />}
                        onClick={() => handleToggleActive(user)}
                      >
                        {user.active ? 'Desactivar' : 'Activar'}
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        leftIcon={<Trash2 size={16} />}
                        onClick={() => setDeleteTarget(user)}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {error && (
          <div className="border-t border-apple-red-500/40 bg-apple-red-500/10 p-4 text-apple-red-200">
            {error.message}
          </div>
        )}

        {!isLoading && rows.length > 0 && (
          <div className="flex items-center justify-between border-t border-white/5 px-6 py-4 text-apple-caption text-apple-gray-400">
            <span>
              Página {page} de {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                Anterior
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* === Modal crear === */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} size="lg">
        <form onSubmit={handleCreate}>
          <ModalHeader>
            <div>
              <h2 className="apple-h3 text-white">Nuevo usuario</h2>
              <p className="apple-caption text-apple-gray-400">
                Completa los datos del colaborador. Los campos no obligatorios pueden quedar vacíos.
              </p>
            </div>
          </ModalHeader>
          <ModalBody className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="apple-caption text-apple-gray-300">Nombre completo *</span>
                <Input
                  required
                  value={createForm.full_name}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, full_name: e.target.value }))}
                />
              </label>
              <label className="space-y-1">
                <span className="apple-caption text-apple-gray-300">Correo electrónico</span>
                <Input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
                />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="apple-caption text-apple-gray-300">Usuario (opcional)</span>
                <Input
                  value={createForm.username}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, username: e.target.value }))}
                  placeholder="Se genera automáticamente si lo dejas vacío"
                />
              </label>
              <label className="space-y-1">
                <span className="apple-caption text-apple-gray-300">Contraseña inicial</span>
                <div className="flex gap-2">
                  <Input
                    value={createForm.password}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))}
                    placeholder="Se genera aleatoria si se deja vacío"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setCreateForm((prev) => ({ ...prev, password: randomPassword(12) }))}
                  >
                    Generar
                  </Button>
                </div>
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="apple-caption text-apple-gray-300">Rol</span>
                <select
                  className="input-apple"
                  value={createForm.fenix_role}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, fenix_role: e.target.value }))}
                >
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="apple-caption text-apple-gray-300">Nivel de privilegio</span>
                <select
                  className="input-apple"
                  value={createForm.privilege_level}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, privilege_level: Number(e.target.value) }))}
                >
                  {PRIVILEGE_OPTIONS.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      Nivel {lvl}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="apple-caption text-apple-gray-300">Sucursal</span>
                <Input
                  value={createForm.branch_id}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, branch_id: e.target.value }))}
                  placeholder="Nombre o código"
                />
              </label>
              <label className="space-y-1">
                <span className="apple-caption text-apple-gray-300">Teléfono</span>
                <Input
                  value={createForm.phone}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="Ej. 70000000"
                />
              </label>
            </div>
            <label className="space-y-1">
              <span className="apple-caption text-apple-gray-300">Tipo de vehículo</span>
              <Input
                value={createForm.vehicle_type}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, vehicle_type: e.target.value }))}
                placeholder="Motocicleta, automóvil, etc."
              />
            </label>

            {createdUser && (
              <div className="rounded-apple border border-apple-green-500/40 bg-apple-green-500/10 p-4 text-apple-body text-white">
                <p className="mb-2 font-semibold">Credenciales generadas</p>
                <div className="space-y-2 apple-caption text-white/80">
                  <div className="flex items-center gap-3">
                    <div className="w-24 text-apple-gray-400">Usuario</div>
                    <div className="font-medium">
                      {createdUser.username}
                    </div>
                    {createdUser.username && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(createdUser.username || '')}
                      >
                        Copiar
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 text-apple-gray-400">Correo</div>
                    <div className="font-medium">
                      {createdUser.email}
                    </div>
                    {createdUser.email && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(createdUser.email || '')}
                      >
                        Copiar
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 text-apple-gray-400">Contraseña</div>
                    <div className="font-medium">
                      {createdUser.initial_password_plain_text || '—'}
                    </div>
                    {createdUser.initial_password_plain_text && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(createdUser.initial_password_plain_text || '')}
                      >
                        Copiar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
              Cerrar
            </Button>
            <Button type="submit" loading={createLoading}>
              Guardar usuario
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* === Modal editar === */}
      <Modal isOpen={!!editingUser} onClose={() => setEditingUser(null)} size="lg">
        <form onSubmit={handleEdit}>
          <ModalHeader>
            <div>
              <h2 className="apple-h3 text-white">Editar usuario</h2>
              <p className="apple-caption text-apple-gray-400">
                Actualiza los datos básicos del usuario seleccionado.
              </p>
            </div>
          </ModalHeader>
          <ModalBody className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="apple-caption text-apple-gray-300">Nombre completo</span>
                <Input
                  required
                  value={editForm.full_name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, full_name: e.target.value }))}
                />
              </label>
              <label className="space-y-1">
                <span className="apple-caption text-apple-gray-300">Correo electrónico</span>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="apple-caption text-apple-gray-300">Rol</span>
                <select
                  className="input-apple"
                  value={editForm.fenix_role}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, fenix_role: e.target.value }))}
                >
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="apple-caption text-apple-gray-300">Nivel de privilegio</span>
                <select
                  className="input-apple"
                  value={editForm.privilege_level}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, privilege_level: Number(e.target.value) }))}
                >
                  {PRIVILEGE_OPTIONS.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      Nivel {lvl}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="apple-caption text-apple-gray-300">Sucursal</span>
                <Input
                  value={editForm.branch_id}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, branch_id: e.target.value }))}
                />
              </label>
              <label className="space-y-1">
                <span className="apple-caption text-apple-gray-300">Teléfono</span>
                <Input
                  value={editForm.phone}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                />
              </label>
            </div>
            <label className="space-y-1">
              <span className="apple-caption text-apple-gray-300">Tipo de vehículo</span>
              <Input
                value={editForm.vehicle_type}
                onChange={(e) => setEditForm((prev) => ({ ...prev, vehicle_type: e.target.value }))}
              />
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-white/30 bg-transparent"
                checked={editForm.active}
                onChange={(e) => setEditForm((prev) => ({ ...prev, active: e.target.checked }))}
              />
              <span className="apple-body text-apple-gray-200">Usuario activo</span>
            </label>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="ghost" onClick={() => setEditingUser(null)}>
              Cancelar
            </Button>
            <Button type="submit" loading={editLoading}>
              Guardar cambios
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* === Modal reset password === */}
      <Modal isOpen={!!resetTarget} onClose={() => setResetTarget(null)} size="md">
        <form onSubmit={handleReset}>
          <ModalHeader>
            <div>
              <h2 className="apple-h3 text-white">Restablecer contraseña</h2>
              <p className="apple-caption text-apple-gray-400">
                Nueva contraseña para {resetTarget?.full_name || 'usuario'}.
              </p>
            </div>
          </ModalHeader>
          <ModalBody className="space-y-4">
            <label className="space-y-1">
              <span className="apple-caption text-apple-gray-300">Contraseña nueva</span>
              <div className="flex gap-2">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={resetPassword}
                  minLength={6}
                  onChange={(e) => setResetPassword(e.target.value)}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setResetPassword(randomPassword(12))}
                >
                  Generar
                </Button>
              </div>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
              />
              <span className="apple-caption text-apple-gray-300">Mostrar contraseña</span>
            </label>
            <Button
              type="button"
              variant="ghost"
              onClick={() => copyToClipboard(resetPassword)}
              leftIcon={<KeyRound size={16} />}
            >
              Copiar contraseña
            </Button>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="ghost" onClick={() => setResetTarget(null)}>
              Cancelar
            </Button>
            <Button type="submit" loading={resetLoading}>
              Restablecer
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* === Modal eliminar === */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} size="sm">
        <ModalHeader>
          <div>
            <h2 className="apple-h3 text-white">Eliminar usuario</h2>
            <p className="apple-caption text-apple-gray-400">
              Esta acción no se puede deshacer. Confirma para eliminar definitivamente a {deleteTarget?.full_name}.
            </p>
          </div>
        </ModalHeader>
        <ModalBody>
          <div className="rounded-apple border border-apple-red-500/30 bg-apple-red-500/10 p-4 text-apple-body text-apple-red-200">
            Se perderá el acceso y los datos vinculados al usuario.
          </div>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="ghost" onClick={() => setDeleteTarget(null)}>
            Cancelar
          </Button>
          <Button variant="danger" loading={deleteLoading} onClick={handleDelete}>
            Eliminar
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
