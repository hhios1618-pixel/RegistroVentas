'use client';

import React, { useEffect, useMemo, useState } from 'react';
import CameraCapture from '@/components/attendance/CameraCapture';
import { checkIn, getQR, type CheckInPayload } from '@/lib/attendance/api';
import { isMobileUA } from '@/lib/device';
import { compressDataUrl } from '@/lib/image';

/* ================== GPS mejorado (muestreo) ================== */
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
/* ============================================================= */

type CheckType = 'in' | 'out';

type Me = {
  ok: boolean;
  id: string;
  full_name: string;
  role?: string;
  email?: string;
  local?: string | null;
};

export default function AsistenciaPage() {
  /* ------- Montaje seguro (evita hydration mismatch) ------- */
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  /* --------------------------------------------------------- */

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

  // device id
  const deviceId = useMemo<string>(() => {
    const k = 'fx_device_id';
    let v = typeof window !== 'undefined' ? localStorage.getItem(k) : null;
    if (!v) {
      v = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
      if (typeof window !== 'undefined') localStorage.setItem(k, v);
    }
    return v || 'web-client';
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  /* ============= Bloqueo de escritorio (sin mismatch) ============= */
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => { setIsDesktop(!isMobileUA()); }, []);
  if (!mounted) {
    // Render consistente para SSR
    return (
      <div style={{minHeight:'100dvh',display:'grid',placeItems:'center',background:'#0f172a',color:'#e5e7eb'}}>
        Cargando…
      </div>
    );
  }
  if (isDesktop) {
    return (
      <div style={{minHeight:'100dvh',display:'grid',placeItems:'center',background:'#0f172a',color:'#e5e7eb',fontFamily:'system-ui'}}>
        <div style={{maxWidth:560,padding:24,borderRadius:16,border:'1px solid #334155',background:'rgba(15,23,42,.85)',textAlign:'center'}}>
          <h1 style={{margin:'0 0 8px'}}>Marcaje solo desde teléfono 📱</h1>
          <p style={{margin:0,opacity:.85}}>Para precisión real usamos el GPS del dispositivo. Abre este link en tu celular y activa ubicación precisa.</p>
        </div>
      </div>
    );
  }
  /* ================================================================ */

  /* ==================== Cargar identidad ==================== */
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/endpoints/me', { cache: 'no-store' });
        const d: Me = await r.json();
        if (!r.ok || !d?.ok) throw new Error((d as any)?.error || 'me_failed');
        setMe(d);
      } catch {
        setToast('No se pudo cargar tu sesión');
      }
    })();
  }, []);

  /* ============== Resolver sucursal asignada ============== */
  useEffect(() => {
    if (!me?.id) return;
    (async () => {
      setResolvingSite(true);
      try {
        // 1) Asignada (endpoint ya normaliza alias/nombres)
        const r = await fetch('/endpoints/sites?assigned_to=me', { cache: 'no-store' });
        const j = await r.json();
        const s = Array.isArray(j?.results) ? j.results[0] : null;

        if (s?.id) {
          setSiteId(s.id);
          setSiteName(s.name ?? 'Sucursal asignada');
          setResolvingSite(false);
          return;
        }

        // 2) Fallback por nombre crudo de people.local
        if (me.local) {
          const r2 = await fetch(`/endpoints/sites?name=${encodeURIComponent(me.local)}`, { cache: 'no-store' });
          const j2 = await r2.json();
          const s2 = Array.isArray(j2?.results) ? j2.results[0] : null;
          if (s2?.id) {
            setSiteId(s2.id);
            setSiteName(s2.name ?? me.local);
            setResolvingSite(false);
            return;
          }
        }

        setSiteId(null);
        setSiteName(me?.local ? `${me.local} (no mapeada)` : 'No asignada');
        setToast('Tu sucursal no está mapeada en /sites. Contacta a admin.');
      } catch (e) {
        setToast('Fallo resolviendo sucursal');
      } finally {
        setResolvingSite(false);
      }
    })();
  }, [me?.id, me?.local]);

  const canSubmit = Boolean(me?.id && siteId && selfie && loc && qr);
  const progress = [Boolean(me?.id), Boolean(siteId), Boolean(selfie), Boolean(loc)].filter(Boolean).length;
  const progressPercent = (progress / 4) * 100;

  /* =================== Acciones botones =================== */
  const handleGetQR = async () => {
    if (!siteId) { setToast('⚠️ No hay sucursal asignada'); return; }
    try {
      const r = await getQR(siteId);
      setQr(r);
      setToast(`✅ Código QR generado (expira en 60s)`);
    } catch (e: any) {
      setToast(`QR error: ${e?.message || 'falló la función'}`);
    }
  };

  const handleGetLocation = async () => {
    setLocLoading(true);
    try {
      const fix = await getBestLocation({ samples: 10, minAccuracy: 35, hardLimit: 60, timeoutMs: 15000 });
      setLoc({ lat: fix.lat, lng: fix.lng, accuracy: fix.accuracy });
      setToast(`📍 Ubicación lista (±${Math.round(fix.accuracy)} m)`);
    } catch (e: any) {
      setToast(e?.message || 'No se pudo obtener ubicación');
    } finally {
      setLocLoading(false);
    }
  };

  const handleMeasureDistance = async () => {
    if (!loc || !siteId) return;
    try {
      const r = await fetch('/api/debug/distance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site_id: siteId, lat: loc.lat, lng: loc.lng })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'debug_failed');
      setToast(`Distancia a ${j.site_name}: ${Math.round(j.distance_m)} m (radio ${j.site_radius_m} m)`);
    } catch (e:any) {
      setToast(e?.message || 'debug_failed');
    }
  };

  const submit = async () => {
    if (!canSubmit) { setToast('❌ Completa todos los pasos y genera el QR'); return; }
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
      const r = await checkIn(payload);
      if (r.ok) {
        setToast(`🎉 ${checkType === 'in' ? 'Entrada' : 'Salida'} registrada`);
        setSelfie(null); setLoc(null); setQr(null);
      } else {
        setToast('❌ Error al registrar');
      }
    } catch (err: any) {
      setToast(err?.message || '❌ Error al registrar');
    } finally {
      setLoading(false);
    }
  };

  /* ============================ UI ============================ */
  return (
    <div style={{
      minHeight: '100dvh',
      background: `
        radial-gradient(circle at 20% 10%, rgba(99, 102, 241, 0.15) 0%, transparent 50%),
        radial-gradient(circle at 80% 20%, rgba(168, 85, 247, 0.12) 0%, transparent 50%),
        radial-gradient(circle at 40% 80%, rgba(59, 130, 246, 0.08) 0%, transparent 50%),
        linear-gradient(135deg, #0f172a 0%, #1e293b 100%)
      `,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50, background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(148, 163, 184, 0.1)'
      }}>
        <div style={{ maxWidth: 896, margin: '0 auto', padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: 'white' }}>A</div>
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f8fafc', margin: 0 }}>Registro de Asistencia</h1>
                <p style={{ color: '#94a3b8', fontSize: 14, margin: 0 }}>Selfie + GPS mejorado + QR</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 80, height: 4, background: 'rgba(148,163,184,0.2)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${progressPercent}%`, height: '100%', background: 'linear-gradient(90deg, #10b981, #059669)', transition: 'width 0.3s ease' }} />
              </div>
              <span style={{ color: '#94a3b8', fontSize: 12, fontWeight: 500 }}>{progress}/4</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 896, margin: '0 auto', padding: '32px 20px' }}>
        {/* Identidad (solo lectura) */}
        <div style={{ background:'rgba(30,41,59,.6)', backdropFilter:'blur(16px)', border:'1px solid rgba(148,163,184,.1)', borderRadius:20, padding:24, marginBottom:32, boxShadow:'0 10px 40px rgba(0,0,0,.2)' }}>
          <div style={{ display:'grid', gap:12 }}>
            <div style={{ display:'grid', gridTemplateColumns:'120px 1fr', gap:12, alignItems:'center' }}>
              <div style={{ color:'#94a3b8' }}>Empleado</div>
              <div style={{ background:'rgba(15,23,42,.7)', border:'1px solid rgba(148,163,184,.18)', borderRadius:12, padding:'10px 12px', color:'#e5e7eb' }}>
                {me?.full_name ?? '—'}
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'120px 1fr', gap:12, alignItems:'center' }}>
              <div style={{ color:'#94a3b8' }}>Sucursal</div>
              <div style={{ background:'rgba(15,23,42,.7)', border:'1px solid rgba(148,163,184,.18)', borderRadius:12, padding:'10px 12px', color: siteId ? '#e5e7eb' : '#f59e0b' }}>
                {resolvingSite ? 'Resolviendo…' : (siteName ?? me?.local ?? 'No asignada')}
              </div>
            </div>
          </div>
        </div>

        {/* Grid principal */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(320px, 1fr))', gap:24, marginBottom:32 }}>
          {/* Biométrico */}
          <div style={{ background:'rgba(30,41,59,.6)', backdropFilter:'blur(16px)', border:'1px solid rgba(148,163,184,.1)', borderRadius:20, padding:24, boxShadow:'0 10px 40px rgba(0,0,0,.2)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
              <div style={{ width:32, height:32, borderRadius:8, background:'linear-gradient(135deg,#8b5cf6,#7c3aed)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:'white' }}>🔒</div>
              <h3 style={{ color:'#f1f5f9', fontSize:16, fontWeight:600, margin:0 }}>Verificación Biométrica</h3>
            </div>
            <div style={{ display:'grid', gap:16 }}>
              <CameraCapture onCapture={async (raw) => {
                const small = await compressDataUrl(raw, 720, 0.72);
                setSelfie(small);
              }} />
              <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                <button type="button" onClick={handleGetLocation} disabled={locLoading}
                  style={{ padding:'12px 16px', borderRadius:12, border:'1px solid rgba(148,163,184,.2)', background: locLoading ? 'rgba(71,85,105,.5)' : 'rgba(15,23,42,.8)', color:'#e5e7eb', fontWeight:600, cursor: locLoading ? 'not-allowed' : 'pointer' }}>
                  {locLoading ? 'Obteniendo ubicación…' : '📍 Obtener ubicación (mejorada)'}
                </button>
                {loc && siteId && (
                  <button type="button" onClick={handleMeasureDistance}
                    style={{ padding:'12px 16px', borderRadius:12, border:'1px solid rgba(148,163,184,.2)', background:'rgba(15,23,42,.8)', color:'#e5e7eb', fontWeight:600, cursor:'pointer' }}>
                    🧭 Medir distancia a sede
                  </button>
                )}
              </div>
              {loc && <div style={{ color:'#94a3b8', fontSize:13 }}>Precisión: <b>±{Math.round(loc.accuracy)} m</b> — lat {loc.lat.toFixed(6)}, lng {loc.lng.toFixed(6)}</div>}
            </div>
          </div>

          {/* Tipo + QR */}
          <div style={{ display:'grid', gap:24 }}>
            <div style={{ background:'rgba(30,41,59,.6)', backdropFilter:'blur(16px)', border:'1px solid rgba(148,163,184,.1)', borderRadius:20, padding:24, boxShadow:'0 10px 40px rgba(0,0,0,.2)' }}>
              <div style={{ textAlign:'center', marginBottom:20 }}>
                <h2 style={{ color:'#f1f5f9', fontSize:18, fontWeight:600, margin:0 }}>Tipo de Marcaje</h2>
                <p style={{ color:'#64748b', fontSize:14, margin:'4px 0 0 0' }}>Entrada o salida</p>
              </div>
              <div style={{ display:'flex', background:'rgba(15,23,42,.6)', borderRadius:16, padding:6, maxWidth:280, margin:'0 auto' }}>
                <button onClick={() => setCheckType('in')}
                  style={{ flex:1, padding:'14px 20px', borderRadius:12, border:'none',
                    background: checkType==='in' ? 'linear-gradient(135deg,#10b981,#059669)' : 'transparent',
                    color: checkType==='in' ? 'white' : '#94a3b8', fontWeight: checkType==='in' ? 700 : 500, fontSize:15, cursor:'pointer',
                    transition:'all .3s', boxShadow: checkType==='in' ? '0 4px 12px rgba(16,185,129,.3)' : 'none' }}>
                  🟢 Entrada
                </button>
                <button onClick={() => setCheckType('out')}
                  style={{ flex:1, padding:'14px 20px', borderRadius:12, border:'none',
                    background: checkType==='out' ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'transparent',
                    color: checkType==='out' ? 'white' : '#94a3b8', fontWeight: checkType==='out' ? 700 : 500, fontSize:15, cursor:'pointer',
                    transition:'all .3s', boxShadow: checkType==='out' ? '0 4px 12px rgba(239,68,68,.3)' : 'none' }}>
                  🔴 Salida
                </button>
              </div>
            </div>

            <div style={{ background:'rgba(30,41,59,.6)', backdropFilter:'blur(16px)', border:'1px solid rgba(148,163,184,.1)', borderRadius:20, padding:24, boxShadow:'0 10px 40px rgba(0,0,0,.2)' }}>
              <div style={{ display:'flex', gap:16, flexWrap:'wrap', justifyContent:'center' }}>
                <button type="button" onClick={handleGetQR}
                  disabled={!siteId || resolvingSite}
                  style={{ padding:'16px 24px', borderRadius:16, border:'none', background: (!siteId || resolvingSite) ? 'rgba(71,85,105,.5)' : 'linear-gradient(135deg,#0ea5e9,#0284c7)', color:'white', fontWeight:600, fontSize:15, cursor: (!siteId || resolvingSite) ? 'not-allowed' : 'pointer', transition:'all .3s', boxShadow: (!siteId || resolvingSite) ? 'none' : '0 8px 25px rgba(14,165,233,.3)', minWidth:160, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                  🔲 Obtener QR
                </button>
                <button type="button" onClick={submit}
                  disabled={(!me?.id) || (!siteId) || !selfie || !loc || !qr || loading}
                  style={{ padding:'16px 32px', borderRadius:16, border:'none',
                    background: ((!me?.id) || (!siteId) || !selfie || !loc || !qr || loading) ? 'rgba(71,85,105,.5)' : (checkType==='in' ? 'linear-gradient(135deg,#10b981,#059669)' : 'linear-gradient(135deg,#ef4444,#dc2626)'),
                    color:'white', fontWeight:700, fontSize:16, cursor: ((!me?.id) || (!siteId) || !selfie || !loc || !qr || loading) ? 'not-allowed' : 'pointer', transition:'all .3s',
                    boxShadow: ((!me?.id) || (!siteId) || !selfie || !loc || !qr || loading) ? 'none' : (checkType==='in' ? '0 8px 25px rgba(16,185,129,.4)' : '0 8px 25px rgba(239,68,68,.4)'),
                    minWidth:180, display:'flex', alignItems:'center', justifyContent:'center', gap:8, transform: ((!me?.id) || (!siteId) || !selfie || !loc || !qr || loading) ? 'none' : 'translateY(-2px)' }}>
                  {loading ? (<><div style={{ width:16, height:16, border:'2px solid rgba(255,255,255,.3)', borderTop:'2px solid white', borderRadius:'50%', animation:'spin 1s linear infinite' }} /> Procesando...</>) : (`${checkType==='in' ? '✅' : '🚪'} Marcar ${checkType==='in' ? 'Entrada' : 'Salida'}`)}
                </button>
              </div>

              {/* Status */}
              <div style={{ display:'flex', gap:12, marginTop:20, fontSize:13, justifyContent:'center', flexWrap:'wrap' }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, color: me?.id ? '#10b981' : '#64748b' }}>{me?.id ? '✅' : '⏳'} Empleado</div>
                <div style={{ display:'flex', alignItems:'center', gap:6, color: siteId ? '#10b981' : '#64748b' }}>{siteId ? `✅ ${siteName}` : '⏳ Sucursal'}</div>
                <div style={{ display:'flex', alignItems:'center', gap:6, color: selfie ? '#10b981' : '#64748b' }}>{selfie ? '✅' : '⏳'} Foto</div>
                <div style={{ display:'flex', alignItems:'center', gap:6, color: loc ? '#10b981' : '#64748b' }}>{loc ? `✅ Ubicación (±${Math.round(loc.accuracy)} m)` : '⏳ Ubicación'}</div>
                <div style={{ display:'flex', alignItems:'center', gap:6, color: qr ? '#10b981' : '#64748b' }}>{qr ? '✅' : '⏳'} QR</div>
              </div>

              {!siteId && !resolvingSite && (
                <div style={{ marginTop:12, textAlign:'center', color:'#f59e0b', fontSize:13 }}>
                  ⚠️ No encontramos tu sucursal en /sites. Pide a un admin que la registre como “{me?.local ?? '—'}”.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div style={{ position:'fixed', top:20, right:20, background:'rgba(15,23,42,.95)', backdropFilter:'blur(16px)', border:'1px solid rgba(148,163,184,.2)', borderRadius:16, padding:'16px 20px', color:'#f1f5f9', fontSize:14, fontWeight:500, boxShadow:'0 10px 40px rgba(0,0,0,.3)', zIndex:100, maxWidth:320, animation:'slideInRight .3s ease' }}>
            {toast}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideInRight { from { transform: translateX(100%); opacity:0; } to { transform: translateX(0); opacity:1; } }
      `}</style>
    </div>
  );
}