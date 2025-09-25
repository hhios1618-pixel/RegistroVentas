'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Lock, Eye, EyeOff, Shield, CheckCircle, AlertCircle } from 'lucide-react';

/* ─────────────────────────── SPINNER ─────────────────────────── */
export const Spinner = () => (
  <div className="w-6 h-6 border-2 border-apple-blue-500 border-t-transparent rounded-full animate-spin" />
);

/* ─────────────────────── PARTICLES BACKGROUND ─────────────────────── */
const ParticlesBG: React.FC = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let animationId = 0;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    
    const resize = () => {
      canvas.width = window.innerWidth * DPR;
      canvas.height = window.innerHeight * DPR;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(DPR, DPR);
    };
    
    resize();
    window.addEventListener('resize', resize);

    const particles = Array.from({ length: 50 }).map(() => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      radius: 0.5 + Math.random() * 1.5,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      alpha: 0.1 + Math.random() * 0.3,
    }));

    const animate = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      // Gradient overlay
      const gradient = ctx.createRadialGradient(
        window.innerWidth * 0.5, window.innerHeight * 0.4, 100,
        window.innerWidth * 0.5, window.innerHeight * 0.5, Math.max(window.innerWidth, window.innerHeight)
      );
      gradient.addColorStop(0, 'rgba(59, 130, 246, 0.05)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

      // Draw particles
      particles.forEach(particle => {
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Wrap around edges
        if (particle.x < -10) particle.x = window.innerWidth + 10;
        if (particle.x > window.innerWidth + 10) particle.x = -10;
        if (particle.y < -10) particle.y = window.innerHeight + 10;
        if (particle.y > window.innerHeight + 10) particle.y = -10;

        // Draw particle
        ctx.globalAlpha = particle.alpha;
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw connections
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.1)';
      ctx.globalAlpha = 1;
      
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 120) {
            ctx.lineWidth = (1 - distance / 120) * 0.5;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      animationId = requestAnimationFrame(animate);
    };
    
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={ref} className="absolute inset-0 z-10 pointer-events-none" />;
};

/* ──────────────────────── NOTIFICATION ──────────────────────── */
const Notification: React.FC<{
  type: 'success' | 'error' | 'info';
  message: string;
  onClose: () => void;
}> = ({ type, message, onClose }) => {
  const icons = {
    success: <CheckCircle size={20} className="text-apple-green-400" />,
    error: <AlertCircle size={20} className="text-apple-red-400" />,
    info: <AlertCircle size={20} className="text-apple-blue-400" />,
  };

  const colors = {
    success: 'border-apple-green-500/30 bg-apple-green-500/10',
    error: 'border-apple-red-500/30 bg-apple-red-500/10',
    info: 'border-apple-blue-500/30 bg-apple-blue-500/10',
  };

  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className={`fixed top-6 right-6 z-50 flex items-center gap-3 p-4 rounded-apple border backdrop-blur-apple ${colors[type]} shadow-apple-lg max-w-md`}
    >
      {icons[type]}
      <span className="apple-body text-white flex-1">{message}</span>
      <button
        onClick={onClose}
        className="text-white/60 hover:text-white transition-colors"
      >
        ×
      </button>
    </motion.div>
  );
};

/* ──────────────────────── MAIN COMPONENT ──────────────────────── */
const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;

export function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Login state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Change password state
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Notification state
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
  };

  const clearNotification = () => setNotification(null);

  // Login handler - CORREGIDO para usar endpoint unificado
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearNotification();
    
    if (!username || !password) {
      showNotification('error', 'Por favor completa tu usuario y contraseña.');
      return;
    }

    setLoading(true);
    
    try {
      // CAMBIO CRÍTICO: Usar endpoint unificado
      const response = await fetch('/endpoints/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          username: username.trim(), 
          password 
        }),
      });
      
      const data = await response.json().catch(() => ({}));
      
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || 'Usuario o contraseña incorrectos.');
      }

      const redirectTo = searchParams.get('redirectTo') || '/post-login';
      showNotification('success', 'Acceso verificado. Redirigiendo...');
      
      setTimeout(() => {
        router.replace(redirectTo);
      }, 1000);
      
    } catch (error: any) {
      showNotification('error', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Change password handler - CORREGIDO para usar endpoint unificado
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearNotification();

    if (!currentPassword || !newPassword || !confirmPassword) {
      showNotification('error', 'Por favor completa todos los campos.');
      return;
    }

    if (newPassword !== confirmPassword) {
      showNotification('error', 'Las contraseñas nuevas no coinciden.');
      return;
    }

    if (!PASSWORD_RULE.test(newPassword)) {
      showNotification('error', 'La contraseña debe tener al menos 8 caracteres, incluyendo letras y números.');
      return;
    }

    setChangingPassword(true);

    try {
      // CAMBIO CRÍTICO: Usar endpoint unificado
      const response = await fetch('/endpoints/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: username.trim(),
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || 'Error al cambiar la contraseña.');
      }

      showNotification('success', 'Contraseña cambiada exitosamente.');
      setShowChangePassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
    } catch (error: any) {
      showNotification('error', error.message);
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      {/* ======== VIDEO BACKGROUND ======== */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <video
          className="h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        >
          <source src="/1.mp4" type="video/mp4" />
        </video>
      </div>

      {/* Animated Background */}
      <ParticlesBG />
      
      {/* Gradient Overlays */}
      <div className="absolute inset-0 z-20 bg-gradient-to-br from-apple-blue-950/20 via-black to-apple-green-950/20" />
      <div className="absolute inset-0 z-30 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.2),transparent_55%)]" />

      {/* Content */}
      <div className="relative z-40 min-h-screen flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-apple-blue-500/20 to-apple-green-500/20 rounded-apple-xl border border-white/20 flex items-center justify-center"
            >
              <Shield size={32} className="text-apple-blue-400" />
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="apple-h1 text-white mb-2"
            >
              Fenix Store
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="apple-body text-apple-gray-300"
            >
              Sistema de gestión integral
            </motion.p>
          </div>

          {/* Login Form */}
          <AnimatePresence mode="wait">
            {!showChangePassword ? (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="glass-card"
              >
                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-4">
                    {/* Username Field */}
                    <div className="space-y-2">
                      <label className="block apple-caption text-apple-gray-300">
                        Usuario
                      </label>
                      <div className="relative">
                        <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-apple-gray-500" />
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="field pl-10"
                          placeholder="Ingresa tu usuario"
                          disabled={loading}
                          autoComplete="username"
                        />
                      </div>
                    </div>

                    {/* Password Field */}
                    <div className="space-y-2">
                      <label className="block apple-caption text-apple-gray-300">
                        Contraseña
                      </label>
                      <div className="relative">
                        <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-apple-gray-500" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="field pl-10 pr-10"
                          placeholder="Ingresa tu contraseña"
                          disabled={loading}
                          autoComplete="current-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-apple-gray-500 hover:text-white transition-colors"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-primary w-full"
                    >
                      {loading ? (
                        <>
                          <Spinner />
                          Verificando acceso...
                        </>
                      ) : (
                        'Iniciar Sesión'
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowChangePassword(true)}
                      className="btn-ghost w-full"
                      disabled={loading}
                    >
                      Cambiar Contraseña
                    </button>
                  </div>
                </form>
              </motion.div>
            ) : (
              /* Change Password Form */
              <motion.div
                key="change-password"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="glass-card"
              >
                <div className="mb-6">
                  <h2 className="apple-h3 text-white mb-2">Cambiar Contraseña</h2>
                  <p className="apple-caption text-apple-gray-400">
                    La contraseña debe tener al menos 8 caracteres, incluyendo letras y números.
                  </p>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-6">
                  <div className="space-y-4">
                    {/* Current Password */}
                    <div className="space-y-2">
                      <label className="block apple-caption text-apple-gray-300">
                        Contraseña Actual
                      </label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="field"
                        placeholder="Contraseña actual"
                        disabled={changingPassword}
                      />
                    </div>

                    {/* New Password */}
                    <div className="space-y-2">
                      <label className="block apple-caption text-apple-gray-300">
                        Nueva Contraseña
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="field"
                        placeholder="Nueva contraseña"
                        disabled={changingPassword}
                      />
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-2">
                      <label className="block apple-caption text-apple-gray-300">
                        Confirmar Contraseña
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="field"
                        placeholder="Confirmar nueva contraseña"
                        disabled={changingPassword}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowChangePassword(false)}
                      className="btn-ghost flex-1"
                      disabled={changingPassword}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={changingPassword}
                      className="btn-primary flex-1"
                    >
                      {changingPassword ? (
                        <>
                          <Spinner />
                          Cambiando...
                        </>
                      ) : (
                        'Cambiar'
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="text-center mt-8"
          >
            <p className="apple-caption text-apple-gray-500">
              © 2024 Fenix Store. Todos los derechos reservados.
            </p>
          </motion.div>
        </motion.div>
      </div>

      {/* Notifications */}
      <AnimatePresence>
        {notification && (
          <Notification
            type={notification.type}
            message={notification.message}
            onClose={clearNotification}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
