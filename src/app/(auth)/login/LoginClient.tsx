'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const BG = `
radial-gradient(1200px 600px at 15% 5%, rgba(0,255,163,.12), transparent 55%),
radial-gradient(900px 500px at 85% 20%, rgba(0,185,255,.10), transparent 55%),
linear-gradient(180deg,#0a0f1f 0%, #0a0c16 100%)
`;

// HOME por rol (para redirección post-login)
const HOME: Record<string, string> = {
  GERENCIA: '/',
  ADMIN: '/',
  COORDINADOR: '/',
  ASESOR: '/',
  PROMOTOR: '/promotores/registro',
  VENDEDOR: '/captura',
  LOGISTICA: '/delivery',
  USER: '/',
};
const roleHome = (r?: string) => HOME[String(r || 'USER').toUpperCase()] || HOME.USER;

export function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; msg: string } | null>(null);

  const ui = {
    ok: (m: string) => setNotice({ type: 'success', msg: m }),
    err: (m: string) => setNotice({ type: 'error', msg: m }),
    info: (m: string) => setNotice({ type: 'info', msg: m }),
    clear: () => setNotice(null),
  };

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    ui.clear();
    if (!username || !password) return ui.err('Completa tu usuario y contraseña.');

    try {
      setLoading(true);

      const r = await fetch('/endpoints/auth/basic-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) throw new Error(j?.error || 'Usuario o contraseña incorrectos.');

      const role = String(j?.user?.role || 'USER').toUpperCase();
      const dest = searchParams.get('redirectTo') || roleHome(role);

      ui.ok('Acceso verificado. Redirigiendo…');
      setTimeout(() => router.replace(dest), 250);
    } catch {
      ui.err('Usuario o contraseña incorrectos.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-6" style={{ background: BG }}>
      <div
        className="w-full max-w-md rounded-2xl p-6 border shadow-2xl"
        style={{
          background: 'linear-gradient(180deg, rgba(18,24,46,.55), rgba(12,16,32,.55))',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          borderColor: 'rgba(255,255,255,.08)',
        }}
      >
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-xl grid place-items-center text-white text-lg font-bold"
            style={{
              background: 'conic-gradient(from 160deg,#00E0FF,#00FFA3,#00E0FF)',
              boxShadow: '0 0 28px rgba(0,255,195,.35)',
            }}
            aria-label="Fenix"
          >
            F
          </div>
          <div className="flex flex-col">
            <h1 className="text-white text-lg font-semibold tracking-wide">Fenix — Acceso</h1>
            <p className="text-sm text-white/60">Control de asistencia, pedidos y paneles</p>
          </div>
        </div>

        {/* Banner */}
        <div className="mb-4 rounded-xl px-3 py-2 text-sm bg-white/5 text-white/80 border border-white/15">
          Acceso exclusivo para personal habilitado.
        </div>

        {/* Notice */}
        {notice && (
          <div
            className={`mb-4 rounded-xl px-3 py-2 text-sm ${
              notice.type === 'error'
                ? 'bg-red-500/15 text-red-300 border border-red-500/30'
                : notice.type === 'success'
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                : 'bg-white/10 text-white/80 border border-white/15'
            }`}
          >
            {notice.msg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handlePassword} className="space-y-4">
          <label className="block">
            <span className="text-sm text-white/80">Usuario</span>
            <input
              type="text"
              inputMode="text"
              autoComplete="username"
              placeholder="ej: leonardo.torres"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 w-full h-11 rounded-xl bg-white/5 border border-white/15 px-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
            />
          </label>

          <label className="block">
            <span className="text-sm text-white/80">Contraseña</span>
            <div className="mt-1 relative">
              <input
                type={showPwd ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 rounded-xl bg-white/5 border border-white/15 px-3 pr-11 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute inset-y-0 right-0 px-3 text-white/60 hover:text-white/90"
                aria-label={showPwd ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPwd ? '🙈' : '👁️'}
              </button>
            </div>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-xl font-semibold border border-white/10 text-black bg-white hover:bg-white/90 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Verificando…' : 'Ingresar'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-white/50">
          Al continuar aceptas las políticas internas de seguridad y uso de datos de Fenix.
        </div>
      </div>
    </div>
  );
}