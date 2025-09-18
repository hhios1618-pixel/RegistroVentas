'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, Variants } from 'framer-motion';

/* ─────────────────────────── Icons ─────────────────────────── */
const UserIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.1a7.5 7.5 0 0 1 15 0A18 18 0 0 1 12 21.75c-2.7 0-5.2-.6-7.5-1.65Z"/>
  </svg>
);

const LockIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16.5 10.5V6.8a4.5 4.5 0 1 0-9 0v3.7m-.8 11.3h10.6a2.3 2.3 0 0 0 2.2-2.2v-6.8a2.3 2.3 0 0 0-2.2-2.2H6.8a2.3 2.3 0 0 0-2.2 2.2v6.8a2.3 2.3 0 0 0 2.2 2.2Z"/>
  </svg>
);

/* ─────────────────────────── Spinner ─────────────────────────── */
export const Spinner = () => (
  <svg className="h-5 w-5 animate-spin text-cyan-300" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
    <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"/>
  </svg>
);

/* ─────────────────────── Particles BG ─────────────────────── */
const ParticlesBG: React.FC = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext('2d')!;
    let raf = 0;

    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      c.width = innerWidth * DPR;
      c.height = innerHeight * DPR;
      ctx.setTransform(1, 0, 0, 1, 0, 0); // reset
      ctx.scale(DPR, DPR);
    };
    resize();
    addEventListener('resize', resize);

    const N = 70;
    const parts = Array.from({ length: N }).map(() => ({
      x: Math.random() * innerWidth,
      y: Math.random() * innerHeight,
      r: 0.7 + Math.random() * 1.8,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      a: 0.15 + Math.random() * 0.35,
    }));

    const loop = () => {
      ctx.clearRect(0, 0, innerWidth, innerHeight);

      // Vignette
      const g = ctx.createRadialGradient(
        innerWidth * 0.5, innerHeight * 0.4, 50,
        innerWidth * 0.5, innerHeight * 0.5, Math.max(innerWidth, innerHeight)
      );
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.45)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, innerWidth, innerHeight);

      // Particles
      ctx.fillStyle = 'rgba(148, 255, 230, 0.7)';
      for (const p of parts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < -10) p.x = innerWidth + 10;
        if (p.x > innerWidth + 10) p.x = -10;
        if (p.y < -10) p.y = innerHeight + 10;
        if (p.y > innerHeight + 10) p.y = -10;

        ctx.globalAlpha = p.a;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }

      // Links
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
      ctx.globalAlpha = 1;
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const a = parts[i], b = parts[j];
          const dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy);
          if (d < 110) {
            ctx.lineWidth = 1 - d / 110;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }

      raf = requestAnimationFrame(loop);
    };
    loop();

    return () => { cancelAnimationFrame(raf); removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} className="absolute inset-0 z-0 pointer-events-none" />;
};

/* ──────────────────────── Component ──────────────────────── */
const PASS_RULE = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;

export function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Login
  const [username, setUsername]   = useState('');
  const [password, setPassword]   = useState('');
  const [showPwd, setShowPwd]     = useState(false);
  const [loading, setLoading]     = useState(false);

  // Change password
  const [showChange, setShowChange] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd]         = useState('');
  const [newPwd2, setNewPwd2]       = useState('');
  const [changing, setChanging]     = useState(false);

  // Notices
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; msg: string } | null>(null);
  const ui = {
    ok:   (m: string) => setNotice({ type: 'success', msg: m }),
    err:  (m: string) => setNotice({ type: 'error',  msg: m }),
    info: (m: string) => setNotice({ type: 'info',    msg: m }),
    clear: () => setNotice(null),
  };

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    ui.clear();
    if (!username || !password) return ui.err('Completa tu usuario y contraseña.');
    setLoading(true);
    try {
      const r = await fetch('/endpoints/auth/basic-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) throw new Error(j?.error || 'Usuario o contraseña incorrectos.');

      const dest = searchParams.get('redirectTo') || '/post-login';
      ui.ok('Acceso verificado. Redirigiendo…');
      setTimeout(() => router.replace(dest), 250);
    } catch {
      ui.err('Usuario o contraseña incorrectos.');
    } finally {
      setLoading(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    ui.clear();

    const u = username.trim().toLowerCase();
    if (!u) return ui.err('Ingresa tu usuario (no email).');
    if (!PASS_RULE.test(newPwd)) return ui.err('La nueva contraseña debe ser alfanumérica (≥8, 1 letra y 1 número).');
    if (newPwd !== newPwd2) return ui.err('La confirmación no coincide.');

    setChanging(true);
    try {
      const r = await fetch('/endpoints/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, currentPassword: currentPwd, newPassword: newPwd }),
      });
      const j = await r.json().catch(() => ({} as any));
      if (!r.ok || !j?.ok) throw new Error(j?.error || 'No se pudo cambiar la contraseña.');

      ui.ok('¡Contraseña cambiada con éxito! Inicia sesión con tu nueva contraseña.');
      setShowChange(false);
      setPassword(''); setCurrentPwd(''); setNewPwd(''); setNewPwd2('');
    } catch (err: any) {
      ui.err(err?.message || 'No se pudo cambiar la contraseña.');
    } finally {
      setChanging(false);
    }
  }

  const variants: Variants = {
    hidden: { opacity: 0, y: 26 },
    show:   { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
  };

  return (
    <div className="min-h-dvh relative flex items-center justify-center overflow-hidden">
      {/* fondo */}
      <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover z-0" src="/1.mp4" />
      <div className="absolute inset-0 bg-black/60 z-10" />
      <ParticlesBG />

      {/* card */}
      <motion.div variants={variants} initial="hidden" animate="show" className="relative z-20 w-full max-w-md">
        <div className="rounded-2xl p-[1.5px] relative border-anim">
          <div className="rounded-2xl bg-[rgba(12,16,32,0.78)] backdrop-blur-xl ring-1 ring-white/10 px-8 py-7 shadow-2xl">
            {/* header con logo */}
            <div className="mb-7 flex items-center gap-4">
              <div className="relative w-11 h-11 rounded-md overflow-hidden ring-1 ring-white/20 shadow">
                {/* from /public/1.png */}
                <img src="/1.png" alt="Fenix" className="absolute inset-0 w-full h-full object-contain bg-black/5" />
              </div>
              <div>
                <h1 className="text-white text-lg sm:text-xl font-semibold tracking-tight">Acceso a la Plataforma</h1>
                <p className="text-[12px] text-white/60 -mt-0.5">Sistema de Gestión Fenix</p>
              </div>
            </div>

            {/* avisos */}
            {notice && (
              <div
                className={[
                  'mb-4 rounded-lg px-4 py-2.5 text-sm font-medium border',
                  notice.type === 'error'
                    ? 'bg-red-500/12 text-red-300 border-red-500/30'
                    : notice.type === 'success'
                    ? 'bg-emerald-500/12 text-emerald-300 border-emerald-500/30'
                    : 'bg-white/8 text-white/80 border-white/15',
                ].join(' ')}
              >
                {notice.msg}
              </div>
            )}

            {/* form login */}
            <form onSubmit={handlePassword} className="space-y-4">
              <div className="relative">
                <UserIcon className="absolute top-1/2 left-3 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  type="text"
                  autoComplete="username"
                  placeholder="Usuario (no email)"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full h-12 rounded-lg bg-white/6 border border-white/15 px-10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
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
                  className="w-full h-12 rounded-lg bg-white/6 border border-white/15 px-10 pr-12 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute inset-y-0 right-0 px-3 text-white/60 hover:text-white/90"
                >
                  {showPwd ? '🙈' : '👁️'}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 flex items-center justify-center rounded-lg font-semibold text-slate-900 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:opacity-95 disabled:opacity-60 shadow-lg shadow-emerald-500/15"
              >
                {loading ? <Spinner /> : 'Ingresar'}
              </button>
            </form>

            {/* toggle cambiar contraseña */}
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => { setShowChange((v) => !v); ui.clear(); }}
                className="text-xs text-cyan-300 hover:text-white underline underline-offset-4"
              >
                {showChange ? 'Cancelar cambio de contraseña' : 'Cambiar mi contraseña'}
              </button>
            </div>

            {/* form cambio */}
            {showChange && (
              <form onSubmit={handleChangePassword} className="mt-6 space-y-3 border-t border-white/10 pt-6">
                <div className="rounded-lg bg-white/6 border border-white/10 p-3">
                  <p className="text-xs text-white/70 font-medium mb-1">Requisitos de la nueva contraseña</p>
                  <ul className="text-[11px] text-white/60 list-disc list-inside space-y-0.5">
                    <li>Mínimo 8 caracteres</li>
                    <li>Alfanumérica: al menos 1 letra y 1 número</li>
                    <li>Solo letras (A–Z, a–z) y números (0–9)</li>
                  </ul>
                </div>

                <div className="relative">
                  <LockIcon className="absolute top-1/2 left-3 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <input
                    type="password"
                    placeholder="Contraseña actual"
                    value={currentPwd}
                    onChange={(e) => setCurrentPwd(e.target.value)}
                    className="w-full h-11 rounded-lg bg-white/6 border border-white/15 px-10 text-white placeholder:text-white/40 focus:ring-2 focus:ring-cyan-400/30"
                  />
                </div>

                <div className="relative">
                  <LockIcon className="absolute top-1/2 left-3 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <input
                    type="password"
                    placeholder="Nueva contraseña"
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
                    className="w-full h-11 rounded-lg bg-white/6 border border-white/15 px-10 text-white placeholder:text-white/40 focus:ring-2 focus:ring-cyan-400/30"
                  />
                </div>

                <div className="relative">
                  <LockIcon className="absolute top-1/2 left-3 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <input
                    type="password"
                    placeholder="Confirmar nueva contraseña"
                    value={newPwd2}
                    onChange={(e) => setNewPwd2(e.target.value)}
                    className="w-full h-11 rounded-lg bg-white/6 border border-white/15 px-10 text-white placeholder:text-white/40 focus:ring-2 focus:ring-cyan-400/30"
                  />
                </div>

                <button
                  type="submit"
                  disabled={changing}
                  className="w-full h-11 flex items-center justify-center rounded-lg font-semibold text-slate-900 bg-gradient-to-r from-emerald-400 to-cyan-400 hover:opacity-95 disabled:opacity-60 shadow-lg shadow-cyan-500/15"
                >
                  {changing ? <Spinner /> : 'Guardar nueva contraseña'}
                </button>
              </form>
            )}

            <div className="mt-7 text-center text-[11px] text-white/50">
              © {new Date().getFullYear()} Fenix Corp. Todos los derechos reservados.
            </div>
          </div>
        </div>
      </motion.div>

      {/* keyframes + helpers */}
      <style jsx global>{`
        .border-anim { position: relative; }
        .border-anim::before {
          content: '';
          position: absolute;
          inset: -1.5px;
          border-radius: 1.1rem;
          padding: 1.5px;
          background: conic-gradient(from var(--ang,0deg),
            #06b6d4 0%, #10b981 20%, #06b6d4 40%, #10b981 60%, #06b6d4 80%, #10b981 100%);
          -webkit-mask:
            linear-gradient(#000 0 0) content-box,
            linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
                  mask-composite: exclude;
          animation: border-rotate 8s linear infinite;
          z-index: -1;
        }
        @keyframes border-rotate { to { --ang: 360deg; } }
        .bg-white\\/6 { background-color: rgba(255,255,255,0.06); }
        .bg-white\\/8 { background-color: rgba(255,255,255,0.08); }
        .bg-red-500\\/12 { background-color: rgba(239,68,68,.12); }
        .bg-emerald-500\\/12 { background-color: rgba(16,185,129,.12); }
      `}</style>
    </div>
  );
}