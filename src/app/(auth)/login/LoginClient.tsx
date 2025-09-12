'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, Variants } from 'framer-motion';

// --- Iconos UI ---
const UserIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
  </svg>
);
const LockIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
  </svg>
);
export const Spinner = () => (
  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
    <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
);

// --- Componente ---
export function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [username, setUsername]   = useState('');
  const [password, setPassword]   = useState('');
  const [showPwd, setShowPwd]     = useState(false);
  const [loading, setLoading]     = useState(false);
  const [notice, setNotice]       = useState<{ type: 'success' | 'error' | 'info'; msg: string } | null>(null);

  const ui = {
    ok: (m: string)  => setNotice({ type: 'success', msg: m }),
    err: (m: string) => setNotice({ type: 'error',  msg: m }),
    info:(m: string) => setNotice({ type: 'info',    msg: m }),
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

      // 🚀 Ahora todos pasan por /post-login
      const dest = searchParams.get('redirectTo') || '/post-login';

      ui.ok('Acceso verificado. Redirigiendo…');
      setTimeout(() => router.replace(dest), 250);
    } catch {
      ui.err('Usuario o contraseña incorrectos.');
    } finally {
      setLoading(false);
    }
  }

  const containerVariants: Variants = {
    hidden:  { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  };

  return (
    <div className="min-h-dvh flex items-center justify-center p-6 relative overflow-hidden">
      <video autoPlay loop muted playsInline className="absolute top-0 left-0 w-full h-full object-cover z-0" src="/1.mp4" />
      <div className="absolute top-0 left-0 w-full h-full bg-black/60 z-10" />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-20 w-full max-w-md rounded-2xl p-[1px] shadow-2xl bg-gradient-to-br from-cyan-400/40 via-transparent to-green-400/40"
      >
        <div
          className="w-full h-full rounded-2xl p-8"
          style={{ background: 'rgba(12, 16, 32, 0.7)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
        >
          <div className="mb-8 flex items-center gap-4">
            <div
              className="h-12 w-12 rounded-xl grid place-items-center text-white text-xl font-bold"
              style={{ background: 'conic-gradient(from 160deg,#00E0FF,#00FFA3,#00E0FF)', boxShadow: '0 0 32px rgba(0,255,195,.40)' }}
            >
              F
            </div>
            <div>
              <h1 className="text-white text-xl font-semibold tracking-wide">Acceso a la Plataforma</h1>
              <p className="text-sm text-white/60">Sistema de Gestión Fenix</p>
            </div>
          </div>

          {notice && (
            <div
              className={`mb-4 rounded-lg px-4 py-2.5 text-sm font-medium ${
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

          <form onSubmit={handlePassword} className="space-y-5">
            <div className="relative">
              <UserIcon className="absolute top-1/2 left-3 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                type="text"
                autoComplete="username"
                placeholder="Usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full h-12 rounded-lg bg-white/5 border border-white/15 px-10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 transition-all"
              />
            </div>

            <div className="relative">
              <LockIcon className="absolute top-1/2 left-3 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                type={showPwd ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-12 rounded-lg bg-white/5 border border-white/15 px-10 pr-11 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 transition-all"
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

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 flex items-center justify-center rounded-lg font-semibold text-white bg-gradient-to-r from-cyan-500 to-green-500 hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity shadow-lg shadow-cyan-500/20"
            >
              {loading ? <Spinner /> : 'Ingresar'}
            </button>
          </form>

          <div className="mt-8 text-center text-xs text-white/50">
            © {new Date().getFullYear()} Fenix Corp. Todos los derechos reservados.
          </div>
        </div>
      </motion.div>
    </div>
  );
}