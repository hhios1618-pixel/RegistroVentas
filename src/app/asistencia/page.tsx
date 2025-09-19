'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, Camera, Clock, CheckCircle, AlertCircle, 
  Smartphone, Monitor, QrCode, User, Building,
  Navigation, Loader2
} from 'lucide-react';

import CameraCapture from '@/components/attendance/CameraCapture';
import { checkIn, getQR, type CheckInPayload } from '@/lib/attendance/api';
import { isMobileUA } from '@/lib/device';
import { compressDataUrl } from '@/lib/image';

/* ================== GPS MEJORADO ================== */
type GeoFix = { lat: number; lng: number; accuracy: number; ts: number };
type GeoResult = { lat: number; lng: number; accuracy: number };

async function getBestLocation(opts?: {
  samples?: number; 
  minAccuracy?: number; 
  hardLimit?: number; 
  timeoutMs?: number;
}): Promise<GeoFix> {
  const samples = opts?.samples ?? 10;
  const minAcc = opts?.minAccuracy ?? 35;
  const hard = opts?.hardLimit ?? 60;
  const tmo = opts?.timeoutMs ?? 15000;

  const fixes: GeoFix[] = [];
  const started = Date.now();

  const getOnce = () =>
    new Promise<GeoFix>((resolve, reject) => {
      const id = navigator.geolocation.watchPosition(
        (pos) => {
          navigator.geolocation.clearWatch(id);
          const c = pos.coords;
          resolve({ 
            lat: c.latitude, 
            lng: c.longitude, 
            accuracy: c.accuracy ?? 9999, 
            ts: Date.now() 
          });
        },
        (err) => { 
          navigator.geolocation.clearWatch(id); 
          reject(err); 
        },
        { 
          enableHighAccuracy: true, 
          maximumAge: 0, 
          timeout: Math.min(4000, tmo) 
        }
      );
    });

  while (fixes.length < samples && Date.now() - started < tmo) {
    try {
      const fix = await getOnce();
      fixes.push(fix);
      if (fix.accuracy <= minAcc) break;
      await new Promise(r => setTimeout(r, 300));
    } catch {}
  }

  if (!fixes.length) throw new Error('gps_unavailable');
  fixes.sort((a, b) => a.accuracy - b.accuracy);
  const best = fixes.slice(0, Math.max(1, Math.floor(fixes.length * 0.7)));

  const good = best.find(f => f.accuracy <= minAcc);
  if (good) return good;
  const hardOk = best.find(f => f.accuracy <= hard);
  if (hardOk) return hardOk;
  return best[0];
}

/* ================== TIPOS ================== */
type CheckType = 'in' | 'out' | 'lunch_out' | 'lunch_in';

type Me = {
  ok: boolean;
  id: string;
  full_name: string;
  role?: string;
  email?: string;
  local?: string | null;
};

/* ================== COMPONENTES UI ================== */
const Toast: React.FC<{ message: string; onClose: () => void }> = ({ message, onClose }) => (
  <motion.div
    initial={{ opacity: 0, y: -20, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: -20, scale: 0.95 }}
    className="fixed top-6 right-6 z-50 glass-card max-w-md"
  >
    <div className="flex items-center gap-3">
      <CheckCircle size={20} className="text-apple-green-400" />
      <span className="apple-body text-white flex-1">{message}</span>
      <button
        onClick={onClose}
        className="text-white/60 hover:text-white transition-colors"
      >
        ×
      </button>
    </div>
  </motion.div>
);

const StatusCard: React.FC<{
  title: string;
  value: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'orange' | 'purple';
}> = ({ title, value, icon, color }) => {
  const colorClasses = {
    blue: 'from-apple-blue-500/20 to-apple-blue-600/10 border-apple-blue-500/30 text-apple-blue-400',
    green: 'from-apple-green-500/20 to-apple-green-600/10 border-apple-green-500/30 text-apple-green-400',
    orange: 'from-apple-orange-500/20 to-apple-orange-600/10 border-apple-orange-500/30 text-apple-orange-400',
    purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400',
  };

  return (
    <div className="glass-card">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 bg-gradient-to-br ${colorClasses[color]} rounded-apple border`}>
          {icon}
        </div>
        <div className="flex-1">
          <p className="apple-caption text-apple-gray-400">{title}</p>
          <p className="apple-body text-white font-medium">{value}</p>
        </div>
      </div>
    </div>
  );
};

/* ================== COMPONENTE PRINCIPAL ================== */
export default function AsistenciaPage() {
  const [mounted, setMounted] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [siteName, setSiteName] = useState<string | null>(null);
  const [checkType, setCheckType] = useState<CheckType>('in');
  const [selfie, setSelfie] = useState<string | null>(null);
  const [loc, setLoc] = useState<GeoResult | null>(null);
  const [qr, setQr] = useState<{ code: string; exp_at: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const [resolvingSite, setResolvingSite] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  const deviceId = useMemo<string>(() => {
    const key = 'fx_device_id';
    let value = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
    if (!value) {
      value = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
      if (typeof window !== 'undefined') localStorage.setItem(key, value);
    }
    return value || 'web-client';
  }, []);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { setIsDesktop(!isMobileUA()); }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Cargar datos del usuario
  useEffect(() => {
    const loadMe = async () => {
      try {
        const res = await fetch('/endpoints/me');
        if (res.ok) {
          const data = await res.json();
          setMe(data);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };
    loadMe();
  }, []);

  // Obtener ubicación
  const handleGetLocation = async () => {
    setLocLoading(true);
    try {
      const fix = await getBestLocation();
      setLoc({ lat: fix.lat, lng: fix.lng, accuracy: fix.accuracy });
      setToast(`Ubicación obtenida (precisión: ${fix.accuracy.toFixed(0)}m)`);
    } catch (error) {
      setToast('Error al obtener ubicación. Verifica los permisos.');
    } finally {
      setLocLoading(false);
    }
  };

  // Generar QR
  const handleGenerateQR = async () => {
    if (!me?.id) return;
    try {
      const qrData = await getQR(me.id);
      setQr(qrData);
      setToast('Código QR generado exitosamente');
    } catch (error) {
      setToast('Error al generar código QR');
    }
  };

  // Registrar asistencia
  const handleCheckIn = async () => {
    if (!me || !selfie || !loc) {
      setToast('Completa todos los pasos requeridos');
      return;
    }

    setLoading(true);
    try {
      const compressed = await compressDataUrl(selfie, 0.8, 800);
      
      const payload: CheckInPayload = {
        user_id: me.id,
        check_type: checkType,
        selfie_data_url: compressed,
        lat: loc.lat,
        lng: loc.lng,
        accuracy: loc.accuracy,
        device_id: deviceId,
        site_id: siteId,
        qr_code: qr?.code,
      };

      await checkIn(payload);
      setToast('Asistencia registrada exitosamente');
      
      // Limpiar formulario
      setSelfie(null);
      setLoc(null);
      setQr(null);
      
    } catch (error: any) {
      setToast(error.message || 'Error al registrar asistencia');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="glass-card text-center">
          <Loader2 size={24} className="animate-spin mx-auto mb-4 text-apple-blue-400" />
          <p className="apple-body text-white">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!me?.ok) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black p-6">
        <div className="glass-card text-center max-w-md">
          <AlertCircle size={48} className="mx-auto mb-4 text-apple-red-400" />
          <h2 className="apple-h3 text-white mb-2">Acceso Requerido</h2>
          <p className="apple-body text-apple-gray-300 mb-6">
            Debes iniciar sesión para registrar tu asistencia.
          </p>
          <a href="/login" className="btn-primary">
            Iniciar Sesión
          </a>
        </div>
      </div>
    );
  }

  const checkTypeLabels = {
    in: 'Entrada',
    out: 'Salida',
    lunch_out: 'Salida a Almuerzo',
    lunch_in: 'Regreso de Almuerzo',
  };

  const isComplete = selfie && loc && (isDesktop || qr);

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card"
        >
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-apple-blue-500/20 to-apple-green-500/20 border border-apple-blue-500/30 rounded-apple-lg">
              <Clock size={28} className="text-apple-blue-400" />
            </div>
            <div>
              <h1 className="apple-h1 text-white mb-2">Control de Asistencia</h1>
              <p className="apple-body text-apple-gray-300">
                Registra tu entrada, salida y horarios de almuerzo
              </p>
            </div>
          </div>
        </motion.header>

        {/* User Info */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatusCard
              title="Usuario"
              value={me.full_name}
              icon={<User size={18} />}
              color="blue"
            />
            <StatusCard
              title="Dispositivo"
              value={isDesktop ? 'Escritorio' : 'Móvil'}
              icon={isDesktop ? <Monitor size={18} /> : <Smartphone size={18} />}
              color="green"
            />
            <StatusCard
              title="Sitio"
              value={siteName || 'No seleccionado'}
              icon={<Building size={18} />}
              color="orange"
            />
          </div>
        </motion.section>

        {/* Check Type Selection */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card"
        >
          <h2 className="apple-h3 text-white mb-6">Tipo de Registro</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(checkTypeLabels).map(([type, label]) => (
              <button
                key={type}
                onClick={() => setCheckType(type as CheckType)}
                className={`p-4 rounded-apple border transition-all duration-200 ${
                  checkType === type
                    ? 'bg-apple-blue-500/20 border-apple-blue-500/50 text-apple-blue-300'
                    : 'bg-white/5 border-white/20 text-white hover:bg-white/10'
                }`}
              >
                <div className="apple-body font-medium">{label}</div>
              </button>
            ))}
          </div>
        </motion.section>

        {/* Steps */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Camera Step */}
          <motion.section
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className={`p-2 rounded-apple border ${
                selfie 
                  ? 'bg-apple-green-500/20 border-apple-green-500/30' 
                  : 'bg-apple-blue-500/20 border-apple-blue-500/30'
              }`}>
                <Camera size={18} className={selfie ? 'text-apple-green-400' : 'text-apple-blue-400'} />
              </div>
              <h3 className="apple-h3 text-white">1. Tomar Selfie</h3>
              {selfie && <CheckCircle size={20} className="text-apple-green-400" />}
            </div>
            
            <CameraCapture
              onCapture={setSelfie}
              className="w-full aspect-square rounded-apple overflow-hidden"
            />
          </motion.section>

          {/* Location & QR Step */}
          <motion.section
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-6"
          >
            {/* Location */}
            <div className="glass-card">
              <div className="flex items-center gap-3 mb-6">
                <div className={`p-2 rounded-apple border ${
                  loc 
                    ? 'bg-apple-green-500/20 border-apple-green-500/30' 
                    : 'bg-apple-blue-500/20 border-apple-blue-500/30'
                }`}>
                  <MapPin size={18} className={loc ? 'text-apple-green-400' : 'text-apple-blue-400'} />
                </div>
                <h3 className="apple-h3 text-white">2. Obtener Ubicación</h3>
                {loc && <CheckCircle size={20} className="text-apple-green-400" />}
              </div>
              
              {loc ? (
                <div className="space-y-2">
                  <p className="apple-body text-white">
                    Lat: {loc.lat.toFixed(6)}, Lng: {loc.lng.toFixed(6)}
                  </p>
                  <p className="apple-caption text-apple-gray-400">
                    Precisión: {loc.accuracy.toFixed(0)}m
                  </p>
                </div>
              ) : (
                <button
                  onClick={handleGetLocation}
                  disabled={locLoading}
                  className="btn-primary w-full"
                >
                  {locLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Obteniendo ubicación...
                    </>
                  ) : (
                    <>
                      <Navigation size={18} />
                      Obtener Ubicación
                    </>
                  )}
                </button>
              )}
            </div>

            {/* QR Code (solo para desktop) */}
            {isDesktop && (
              <div className="glass-card">
                <div className="flex items-center gap-3 mb-6">
                  <div className={`p-2 rounded-apple border ${
                    qr 
                      ? 'bg-apple-green-500/20 border-apple-green-500/30' 
                      : 'bg-apple-blue-500/20 border-apple-blue-500/30'
                  }`}>
                    <QrCode size={18} className={qr ? 'text-apple-green-400' : 'text-apple-blue-400'} />
                  </div>
                  <h3 className="apple-h3 text-white">3. Código QR</h3>
                  {qr && <CheckCircle size={20} className="text-apple-green-400" />}
                </div>
                
                {qr ? (
                  <div className="text-center">
                    <div className="bg-white p-4 rounded-apple inline-block mb-3">
                      <img 
                        src={`data:image/svg+xml;base64,${btoa(qr.code)}`} 
                        alt="QR Code" 
                        className="w-32 h-32"
                      />
                    </div>
                    <p className="apple-caption text-apple-gray-400">
                      Expira: {new Date(qr.exp_at).toLocaleTimeString()}
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={handleGenerateQR}
                    className="btn-primary w-full"
                  >
                    <QrCode size={18} />
                    Generar Código QR
                  </button>
                )}
              </div>
            )}
          </motion.section>
        </div>

        {/* Submit Button */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center"
        >
          <button
            onClick={handleCheckIn}
            disabled={!isComplete || loading}
            className={`btn-primary btn-lg ${!isComplete ? 'btn-disabled' : ''}`}
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Registrando asistencia...
              </>
            ) : (
              <>
                <CheckCircle size={20} />
                Registrar {checkTypeLabels[checkType]}
              </>
            )}
          </button>
          
          {!isComplete && (
            <p className="apple-caption text-apple-gray-400 mt-3">
              Completa todos los pasos para continuar
            </p>
          )}
        </motion.section>
      </div>

      {/* Toast Notifications */}
      <AnimatePresence>
        {toast && (
          <Toast message={toast} onClose={() => setToast(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
