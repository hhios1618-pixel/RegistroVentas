'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, Camera, Clock, CheckCircle, AlertCircle, 
  Smartphone, Monitor, QrCode, User, Building,
  Navigation, Loader2, Target, Zap, Shield,
  ChevronRight, Wifi, Battery, Signal
} from 'lucide-react';

import CameraCapture from '@/components/attendance/CameraCapture';
import { checkIn, getQR, type CheckInPayload } from '@/lib/attendance/api';
import { isMobileUA } from '@/lib/device';
import { compressDataUrl } from '@/lib/image';

/* ================== GPS MEJORADO ================== */
type GeoFix = { lat: number; lng: number; accuracy: number; ts: number };
type GeoResult = { lat: number; lng: number; accuracy: number };

async function getBestLocation(opts?: {
  samples?: number; minAccuracy?: number; hardLimit?: number; timeoutMs?: number;
}): Promise<GeoFix> {
  const samples = opts?.samples ?? 10;
  const minAcc  = opts?.minAccuracy ?? 35;
  const hard    = opts?.hardLimit ?? 60;
  const tmo     = opts?.timeoutMs ?? 15000;

  const fixes: GeoFix[] = [];
  const started = Date.now();

  const getOnce = () =>
    new Promise<GeoFix>((resolve, reject) => {
      const id = navigator.geolocation.watchPosition(
        (pos) => {
          navigator.geolocation.clearWatch(id);
          const c = pos.coords;
          resolve({ lat: c.latitude, lng: c.longitude, accuracy: c.accuracy ?? 9999, ts: Date.now() });
        },
        (err) => { navigator.geolocation.clearWatch(id); reject(err); },
        { enableHighAccuracy: true, maximumAge: 0, timeout: Math.min(4000, tmo) }
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

type Site = { id: string; name?: string | null };

/* ================== COMPONENTES UI ================== */
const Toast: React.FC<{ message: string; onClose: () => void; type?: 'success' | 'error' | 'info' }> = ({ 
  message, onClose, type = 'info' 
}) => {
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

const ProgressBar: React.FC<{ progress: number; total: number }> = ({ progress, total }) => {
  const percentage = (progress / total) * 100;
  
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-apple-blue-500 to-apple-green-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
      <span className="apple-caption text-apple-gray-400 font-medium min-w-[3rem]">
        {progress}/{total}
      </span>
    </div>
  );
};

const StepCard: React.FC<{
  title: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
  children: React.ReactNode;
  stepNumber: number;
}> = ({ title, description, icon, completed, children, stepNumber }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: stepNumber * 0.1 }}
    className="glass-card"
  >
    <div className="flex items-center gap-4 mb-6">
      <div className={`relative p-3 rounded-apple-lg border transition-all duration-300 ${
        completed 
          ? 'bg-apple-green-500/20 border-apple-green-500/30' 
          : 'bg-apple-blue-500/20 border-apple-blue-500/30'
      }`}>
        <div className={`text-xl transition-colors duration-300 ${
          completed ? 'text-apple-green-400' : 'text-apple-blue-400'
        }`}>
          {icon}
        </div>
        {completed && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-apple-green-500 rounded-full flex items-center justify-center"
          >
            <CheckCircle size={12} className="text-white" />
          </motion.div>
        )}
      </div>
      
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="apple-caption2 text-apple-gray-500 font-semibold">
            PASO {stepNumber}
          </span>
          {completed && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-2 h-2 bg-apple-green-400 rounded-full"
            />
          )}
        </div>
        <h3 className="apple-h3 text-white mb-1">{title}</h3>
        <p className="apple-caption text-apple-gray-400">{description}</p>
      </div>
    </div>
    
    <div className="space-y-4">
      {children}
    </div>
  </motion.div>
);

const CheckTypeSelector: React.FC<{
  checkType: CheckType;
  onCheckTypeChange: (type: CheckType) => void;
}> = ({ checkType, onCheckTypeChange }) => {
  const checkTypes = [
    { key: 'in' as CheckType, label: 'Entrada', icon: '🌅', color: 'from-apple-green-500 to-apple-green-600' },
    { key: 'out' as CheckType, label: 'Salida', icon: '🌆', color: 'from-apple-red-500 to-apple-red-600' },
    { key: 'lunch_out' as CheckType, label: 'Salida Almuerzo', icon: '🍽️', color: 'from-apple-orange-500 to-apple-orange-600' },
    { key: 'lunch_in' as CheckType, label: 'Regreso Almuerzo', icon: '💼', color: 'from-apple-blue-500 to-apple-blue-600' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {checkTypes.map((type) => (
        <motion.button
          key={type.key}
          onClick={() => onCheckTypeChange(type.key)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`relative p-4 rounded-apple-lg border transition-all duration-200 ${
            checkType === type.key
              ? 'border-white/30 bg-white/10'
              : 'border-white/10 bg-white/5 hover:bg-white/10'
          }`}
        >
          <div className="text-2xl mb-2">{type.icon}</div>
          <div className="apple-caption1 text-white font-medium">{type.label}</div>
          
          {checkType === type.key && (
            <motion.div
              layoutId="checkTypeIndicator"
              className="absolute inset-0 rounded-apple-lg border-2 border-apple-blue-500/50 bg-apple-blue-500/10"
            />
          )}
        </motion.button>
      ))}
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
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const [resolvingSite, setResolvingSite] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  const deviceId = useMemo<string>(() => {
    const k = 'fx_device_id';
    let v = typeof window !== 'undefined' ? localStorage.getItem(k) : null;
    if (!v) {
      v = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
      if (typeof window !== 'undefined') localStorage.setItem(k, v);
    }
    return v || 'web-client';
  }, []);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { setIsDesktop(!isMobileUA()); }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/endpoints/me', { cache: 'no-store' });
        const d: Me = await r.json();
        if (!r.ok || !d?.ok) throw new Error((d as any)?.error || 'me_failed');
        setMe(d);
      } catch (e) {
        setToast({ message: 'No se pudo cargar tu sesión', type: 'error' });
      }
    })();
  }, []);

  useEffect(() => {
    if (!me?.id) return;
    (async () => {
      setResolvingSite(true);
      try {
        let foundSite: Site | null = null;

        const r1 = await fetch('/endpoints/sites?assigned_to=me', { cache: 'no-store' });
        if (r1.ok) {
          const j1 = (await r1.json()) as { results?: Site[] };
          foundSite = Array.isArray(j1?.results) && j1.results.length > 0 ? j1.results[0] : null;
        }

        if (!foundSite && me.local) {
          const r2 = await fetch(`/endpoints/sites?name=${encodeURIComponent(me.local)}`, { cache: 'no-store' });
          if (r2.ok) {
            const j2 = (await r2.json()) as { results?: Site[] };
            foundSite = Array.isArray(j2?.results) && j2.results.length > 0 ? j2.results[0] : null;
          }
        }

        if (foundSite?.id) {
          setSiteId(foundSite.id);
          setSiteName(foundSite.name ?? me.local ?? 'Sucursal asignada');
        } else {
          setSiteId(null);
          setSiteName(me?.local ? `${me.local} (no mapeada)` : 'No asignada');
          setToast({ message: 'Tu sucursal no está mapeada en /sites. Contacta a admin.', type: 'error' });
        }
      } catch (e) {
        setToast({ message: 'Fallo resolviendo sucursal', type: 'error' });
      } finally {
        setResolvingSite(false);
      }
    })();
  }, [me?.id, me?.local]);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="glass-card text-center">
          <Loader2 size={24} className="animate-spin mx-auto mb-4 text-apple-blue-400" />
          <p className="apple-body text-white">Cargando sistema de asistencia...</p>
        </div>
      </div>
    );
  }

  if (isDesktop) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card text-center max-w-lg"
        >
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-apple-orange-500/20 to-apple-red-500/20 rounded-apple-xl border border-apple-orange-500/30 flex items-center justify-center">
            <Smartphone size={32} className="text-apple-orange-400" />
          </div>
          
          <h1 className="apple-h1 text-white mb-4">Marcaje Móvil Requerido</h1>
          <p className="apple-body text-apple-gray-300 mb-6">
            Para garantizar la precisión del GPS y la verificación biométrica, 
            el registro de asistencia solo está disponible desde dispositivos móviles.
          </p>
          
          <div className="flex items-center justify-center gap-2 p-4 bg-apple-blue-500/10 border border-apple-blue-500/30 rounded-apple mb-6">
            <QrCode size={20} className="text-apple-blue-400" />
            <span className="apple-caption text-apple-blue-300">
              Escanea el código QR con tu teléfono
            </span>
          </div>
          
          <p className="apple-caption text-apple-gray-500">
            Abre este enlace en tu dispositivo móvil para continuar
          </p>
        </motion.div>
      </div>
    );
  }
  
  const canSubmit = Boolean(me?.id && siteId && selfie && loc && qr);
  const progress = [Boolean(me?.id), Boolean(siteId), Boolean(selfie), Boolean(loc)].filter(Boolean).length;

  const handleGetQR = async () => {
    if (!siteId) { 
      setToast({ message: 'No hay sucursal asignada', type: 'error' }); 
      return; 
    }
    try {
      setLoading(true);
      const r = await getQR(siteId);
      setQr(r);
      setToast({ message: 'Código QR generado (expira en 60s)', type: 'success' });
    } catch (e: any) {
      setToast({ message: `Error QR: ${e?.message || 'Falló la función. Revisa CORS o la URL.'}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleGetLocation = async () => {
    setLocLoading(true);
    try {
      const fix = await getBestLocation({ samples: 10, minAccuracy: 35, hardLimit: 60, timeoutMs: 15000 });
      setLoc({ lat: fix.lat, lng: fix.lng, accuracy: fix.accuracy });
      setToast({ message: `Ubicación obtenida (±${Math.round(fix.accuracy)} m)`, type: 'success' });
    } catch (e: any) {
      setToast({ message: e?.message || 'No se pudo obtener ubicación', type: 'error' });
    } finally {
      setLocLoading(false);
    }
  };

  const handleMeasureDistance = async () => {
    if (!loc || !siteId) return;
    try {
      const r = await fetch('/endpoints/debug/distance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site_id: siteId, lat: loc.lat, lng: loc.lng })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'debug_failed');
      setToast({ 
        message: `Distancia a ${j.site_name}: ${Math.round(j.distance_m)} m (radio ${j.site_radius_m} m)`, 
        type: 'info' 
      });
    } catch (e: any) {
      console.error("Fallo al medir distancia:", e);
      setToast({ message: `Error al medir distancia: ${e?.message || 'falló el endpoint'}`, type: 'error' });
    }
  };

  const submit = async () => {
    if (!canSubmit) { 
      setToast({ message: 'Completa todos los pasos y genera el QR', type: 'error' }); 
      return; 
    }
    setLoading(true);
    try {
      const payload: CheckInPayload = {
        person_id: me!.id,
        site_id: siteId!,
        type: checkType,
        lat: loc!.lat,
        lng: loc!.lng,
        accuracy: loc!.accuracy,
        device_id: deviceId,
        selfie_base64: selfie!,
        qr_code: qr!.code,
      };
      await checkIn(payload);
      
      const successMessages = {
        in: 'Marca de Entrada Exitosa',
        out: 'Marca de Salida Exitosa',
        lunch_out: '¡Buen provecho! Salida a almuerzo registrada.',
        lunch_in: '¡Bienvenido de vuelta! Vuelta de almuerzo registrada.',
      };
      
      setToast({ message: successMessages[checkType], type: 'success' });
      setSelfie(null); 
      setLoc(null); 
      setQr(null);

    } catch (err: any) {
      const errorMessage = err?.message || '';
      
      if (errorMessage.includes('outside_geofence')) {
        setToast({ message: 'Marca NO registrada: ¡Estás demasiado lejos de tu Fenix asignado!', type: 'error' });
      } else if (errorMessage.includes('qr_invalid_or_expired')) {
        setToast({ message: 'QR inválido o expirado. Vuelve a generarlo.', type: 'error' });
      } else if (errorMessage.includes('accuracy_too_high')) {
        setToast({ message: 'Precisión de GPS muy baja. Intenta de nuevo en un lugar con mejor señal.', type: 'error' });
      } else {
        setToast({ message: `Error: ${errorMessage}`, type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Header con progreso */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 glass backdrop-blur-apple-lg border-b border-white/10"
      >
        <div className="max-w-4xl mx-auto p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-apple-blue-500/20 to-apple-green-500/20 border border-apple-blue-500/30 rounded-apple-lg flex items-center justify-center">
                <Clock size={24} className="text-apple-blue-400" />
              </div>
              <div>
                <h1 className="apple-h1 text-white">Control de Asistencia</h1>
                <p className="apple-caption text-apple-gray-400">Verificación biométrica + GPS + QR</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Signal size={16} className="text-apple-green-400" />
              <Wifi size={16} className="text-apple-blue-400" />
              <Battery size={16} className="text-apple-gray-400" />
            </div>
          </div>
          
          <ProgressBar progress={progress} total={4} />
        </div>
      </motion.header>

      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Info del usuario */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-apple-blue-500/20 to-apple-blue-600/10 border border-apple-blue-500/30 rounded-apple-lg flex items-center justify-center">
                <User size={20} className="text-apple-blue-400" />
              </div>
              <div>
                <p className="apple-caption text-apple-gray-400">Empleado</p>
                <p className="apple-body text-white font-medium">{me?.full_name ?? '—'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 bg-gradient-to-br border rounded-apple-lg flex items-center justify-center ${
                siteId 
                  ? 'from-apple-green-500/20 to-apple-green-600/10 border-apple-green-500/30' 
                  : 'from-apple-orange-500/20 to-apple-orange-600/10 border-apple-orange-500/30'
              }`}>
                <Building size={20} className={siteId ? 'text-apple-green-400' : 'text-apple-orange-400'} />
              </div>
              <div>
                <p className="apple-caption text-apple-gray-400">Sucursal</p>
                <p className={`apple-body font-medium ${siteId ? 'text-white' : 'text-apple-orange-400'}`}>
                  {resolvingSite ? 'Resolviendo…' : (siteName ?? 'No asignada')}
                </p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Selector de tipo de marcaje */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card"
        >
          <div className="text-center mb-6">
            <h2 className="apple-h2 text-white mb-2">Tipo de Marcaje</h2>
            <p className="apple-body text-apple-gray-400">Selecciona el tipo de registro que deseas realizar</p>
          </div>
          
          <CheckTypeSelector checkType={checkType} onCheckTypeChange={setCheckType} />
        </motion.section>

        {/* Pasos de verificación */}
        <div className="space-y-6">
          {/* Paso 1: Selfie */}
          <StepCard
            stepNumber={1}
            title="Verificación Biométrica"
            description="Toma una selfie para verificar tu identidad"
            icon={<Camera size={20} />}
            completed={Boolean(selfie)}
          >
            <div className="w-full aspect-square rounded-apple-lg overflow-hidden">
              <CameraCapture 
                onCapture={async (raw) => {
                  const small = await compressDataUrl(raw, 720, 0.72);
                  setSelfie(small);
                }} 
              />
            </div>
          </StepCard>

          {/* Paso 2: Ubicación */}
          <StepCard
            stepNumber={2}
            title="Verificación de Ubicación"
            description="Obtén tu ubicación GPS con alta precisión"
            icon={<MapPin size={20} />}
            completed={Boolean(loc)}
          >
            <div className="space-y-4">
              {loc ? (
                <div className="p-4 bg-apple-green-500/10 border border-apple-green-500/30 rounded-apple">
                  <div className="flex items-center gap-3 mb-3">
                    <Target size={18} className="text-apple-green-400" />
                    <span className="apple-body text-apple-green-300 font-medium">Ubicación obtenida</span>
                  </div>
                  <div className="space-y-2 text-apple-caption">
                    <p className="text-white">
                      <strong>Coordenadas:</strong> {loc.lat.toFixed(6)}, {loc.lng.toFixed(6)}
                    </p>
                    <p className="text-apple-gray-300">
                      <strong>Precisión:</strong> ±{Math.round(loc.accuracy)} metros
                    </p>
                  </div>
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
                      Obteniendo ubicación GPS...
                    </>
                  ) : (
                    <>
                      <Navigation size={18} />
                      Obtener Ubicación de Alta Precisión
                    </>
                  )}
                </button>
              )}
              
              {loc && siteId && (
                <button
                  onClick={handleMeasureDistance}
                  className="btn-secondary w-full"
                >
                  <Target size={18} />
                  Medir Distancia a Sucursal
                </button>
              )}
            </div>
          </StepCard>

          {/* Paso 3: QR Code */}
          <StepCard
            stepNumber={3}
            title="Código de Verificación"
            description="Genera un código QR temporal para validar el registro"
            icon={<QrCode size={20} />}
            completed={Boolean(qr)}
          >
            <div className="space-y-4">
              {qr ? (
                <div className="p-4 bg-apple-green-500/10 border border-apple-green-500/30 rounded-apple">
                  <div className="flex items-center gap-3 mb-3">
                    <CheckCircle size={18} className="text-apple-green-400" />
                    <span className="apple-body text-apple-green-300 font-medium">Código QR generado</span>
                  </div>
                  <p className="apple-caption text-apple-gray-300">
                    <strong>Expira:</strong> {new Date(qr.exp_at).toLocaleTimeString()}
                  </p>
                </div>
              ) : (
                <button
                  onClick={handleGetQR}
                  disabled={loading || !siteId}
                  className="btn-primary w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Generando código...
                    </>
                  ) : (
                    <>
                      <QrCode size={18} />
                      Generar Código QR
                    </>
                  )}
                </button>
              )}
            </div>
          </StepCard>
        </div>

        {/* Botón de envío */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-center pt-6"
        >
          <button
            onClick={submit}
            disabled={!canSubmit || loading}
            className={`btn-lg w-full ${
              canSubmit 
                ? 'btn-success' 
                : 'btn-disabled'
            }`}
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Registrando asistencia...
              </>
            ) : (
              <>
                <Shield size={20} />
                Registrar {checkType === 'in' ? 'Entrada' : 
                         checkType === 'out' ? 'Salida' : 
                         checkType === 'lunch_out' ? 'Salida a Almuerzo' : 
                         'Regreso de Almuerzo'}
                <ChevronRight size={20} />
              </>
            )}
          </button>
          
          {!canSubmit && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="apple-caption text-apple-gray-500 mt-3"
            >
              Completa todos los pasos de verificación para continuar
            </motion.p>
          )}
        </motion.div>
      </div>

      {/* Toast Notifications */}
      <AnimatePresence>
        {toast && (
          <Toast 
            message={toast.message} 
            type={toast.type}
            onClose={() => setToast(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}