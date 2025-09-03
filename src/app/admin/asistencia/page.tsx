'use client';

import React, { useEffect, useMemo, useState } from 'react';
import CameraCapture from '@/components/attendance/CameraCapture';
import LocationButton, { GeoResult } from '@/components/attendance/LocationButton';
import PersonCombo from '@/components/attendance/PersonCombo';
import SiteSelect from '@/components/attendance/SiteSelect';
import { checkIn, getQR, type CheckInPayload } from '@/lib/attendance/api';

type CheckType = 'in' | 'out' | 'lunch_in' | 'lunch_out';
type Person = { id: string; full_name: string; local?: string | null };

/** ---- helpers dispositivo ---- */
function isLocalLike(host: string) {
  return host === 'localhost' || host.startsWith('192.168.') || host.startsWith('127.') || host.endsWith('.local');
}
function detectMobile() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  // userAgentData (Chromium) si existe
  // @ts-ignore
  if (navigator.userAgentData?.mobile) return true;
  return /Android|iPhone|iPad|iPod|Mobile|BlackBerry|IEMobile|Opera Mini/i.test(ua);
}

export default function AsistenciaPage() {
  /** ---- device gate ---- */
  const [allow, setAllow] = useState<boolean>(false);
  const [why, setWhy] = useState<string>('');

  useEffect(() => {
    const mobile = detectMobile();
    const isHttps = typeof location !== 'undefined' && location.protocol === 'https:';
    const allowLocal = typeof location !== 'undefined' && isLocalLike(location.hostname);
    const permitted = mobile && (isHttps || allowLocal);

    setAllow(permitted);
    if (!mobile) setWhy('Esta página solo permite marcaje desde teléfono o tablet.');
    else if (!isHttps && !allowLocal) setWhy('Activa HTTPS para marcar (en producción). En local/LAN está permitido.');
  }, []);

  // Bloqueo total si no cumple
  if (!allow) {
    return (
      <div style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        background: 'linear-gradient(135deg,#0f172a 0%, #1e293b 100%)',
        color: '#e5e7eb',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{
          width: 'min(640px, 92vw)',
          background: 'rgba(15,23,42,.9)',
          border: '1px solid rgba(148,163,184,.15)',
          borderRadius: 16,
          padding: 20,
          textAlign: 'center'
        }}>
          <div style={{
            display:'inline-flex', alignItems:'center', justifyContent:'center',
            width:56, height:56, borderRadius:14,
            background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff',
            fontWeight:800, fontSize:22, marginBottom:10
          }}>A</div>
          <h1 style={{margin:'6px 0 8px 0', fontSize:22, fontWeight:800}}>Marcaje solo desde teléfono 📱</h1>
          <p style={{margin:0, color:'#94a3b8'}}>{why}</p>
          <p style={{margin:'10px 0 0 0', color:'#9ca3af', fontSize:13}}>
            Abre este enlace en tu celular y habilita <strong>Ubicación precisa</strong>.
          </p>
        </div>
      </div>
    );
  }

  /** ---- estado normal del page ---- */
  const [person, setPerson] = useState<Person | null>(null);
  const [personId, setPersonId] = useState<string | null>(null);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [checkType, setCheckType] = useState<CheckType>('in');

  const [selfie, setSelfie] = useState<string | null>(null);
  const [loc, setLoc] = useState<GeoResult | null>(null);
  const [qr, setQr] = useState<{ code: string; exp_at: string } | null>(null);

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Device id persistente
  const deviceId = useMemo<string>(() => {
    if (typeof window === 'undefined') return 'web-client';
    const k = 'fx_device_id';
    let v = localStorage.getItem(k);
    if (!v) { v = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2); localStorage.setItem(k, v); }
    return v;
  }, []);

  useEffect(() => { setPersonId(person?.id ?? null); }, [person?.id]);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 4000); return () => clearTimeout(t); } }, [toast]);

  // Reglas
  const isTurno = checkType === 'in' || checkType === 'out'; // exige selfie + QR + geo
  const isColacion = !isTurno;                               // solo geo
  const hasMinForTurno = Boolean(personId && siteId && loc && selfie && qr);
  const hasMinForColacion = Boolean(personId && siteId && loc);
  const canSubmit = isTurno ? hasMinForTurno : hasMinForColacion;

  const progress = (() => {
    const reqs = isTurno ? [personId, siteId, selfie, loc, qr] : [personId, siteId, loc];
    const done = reqs.filter(Boolean).length;
    return { done, total: reqs.length, percent: (done / reqs.length) * 100 };
  })();

  const handleGetQR = async () => {
    if (!siteId) { setToast('⚠️ Selecciona una sucursal primero'); return; }
    try {
      const r = await getQR(siteId);
      setQr(r);
      setToast(`✅ Código QR generado`);
    } catch { setToast('❌ No se pudo generar el QR'); }
  };

  const submit = async () => {
    if (!canSubmit) { setToast('❌ Completa los requisitos antes de marcar'); return; }
    setLoading(true);
    const payload: CheckInPayload = {
      person_id: personId!,
      site_id: siteId!,
      type: checkType,
      lat: loc!.lat,
      lng: loc!.lng,
      accuracy: loc!.accuracy,
      device_id: deviceId,
      selfie_base64: isTurno ? (selfie ?? '') : '',
      qr_code: isTurno ? (qr?.code ?? '') : '',
    };
    try {
      const r = await checkIn(payload);
      if (r.ok) {
        setToast(`🎉 ${labelByType(checkType)} registrada`);
        if (isTurno) { setSelfie(null); setQr(null); }
        setLoc(null);
      } else setToast('❌ Error al registrar la asistencia');
    } catch { setToast('❌ Error al registrar la asistencia'); }
    finally { setLoading(false); }
  };

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
      <div style={{ position:'sticky', top:0, zIndex:50, background:'rgba(15,23,42,.8)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(148,163,184,.1)' }}>
        <div style={{ maxWidth:896, margin:'0 auto', padding:'16px 20px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:40, height:40, borderRadius:12, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:700, color:'#fff' }}>A</div>
              <div>
                <h1 style={{ fontSize:24, fontWeight:700, color:'#f8fafc', margin:0 }}>Registro de Asistencia</h1>
                <p style={{ color:'#94a3b8', fontSize:14, margin:0 }}>Turno y colación con validaciones inteligentes</p>
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:80, height:4, background:'rgba(148,163,184,.2)', borderRadius:2, overflow:'hidden' }}>
                <div style={{ width:`${progress.percent}%`, height:'100%', background:'linear-gradient(90deg,#10b981,#059669)', transition:'width .3s ease' }} />
              </div>
              <span style={{ color:'#94a3b8', fontSize:12, fontWeight:500 }}>{progress.done}/{progress.total}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:896, margin:'0 auto', padding:'32px 20px' }}>
        {/* Selector tipo */}
        <div style={{ background:'rgba(30,41,59,.6)', border:'1px solid rgba(148,163,184,.1)', borderRadius:20, padding:16, marginBottom:16 }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
            {[
              { k: 'in', label: '🟢 Entrada' },
              { k: 'out', label: '🔴 Salida' },
              { k: 'lunch_in', label: '🥪 Inicio colación' },
              { k: 'lunch_out', label: '🍽️ Fin colación' },
            ].map(opt => (
              <button
                key={opt.k}
                onClick={() => { setCheckType(opt.k as CheckType); if (opt.k === 'lunch_in' || opt.k === 'lunch_out') setQr(null); }}
                style={{
                  padding:'12px', borderRadius:12, border:'1px solid rgba(148,163,184,.15)',
                  background: checkType === opt.k ? 'linear-gradient(135deg,#2563eb,#7c3aed)' : 'transparent',
                  color:'#fff', fontWeight:700, cursor:'pointer'
                }}
              >{opt.label}</button>
            ))}
          </div>
          <div style={{ marginTop:8, fontSize:12, color:'#94a3b8' }}>
            {isTurno ? 'Requisitos: Selfie + QR + ubicación (GPS).' : 'Requisito: ubicación (GPS). No se pide selfie ni QR.'}
          </div>
        </div>

        {/* Grid */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))', gap:24, marginBottom:24 }}>
          {/* Datos */}
          <div style={{ background:'rgba(30,41,59,.6)', border:'1px solid rgba(148,163,184,.1)', borderRadius:20, padding:20 }}>
            <h3 style={{ margin:0, marginBottom:12, color:'#f1f5f9' }}>Datos</h3>
            <div style={{ display:'grid', gap:12 }}>
              <PersonCombo value={person} onSelect={(p) => setPerson(p)} />
              <SiteSelect value={siteId} onChange={setSiteId} preselectName={person?.local ?? null} />
            </div>
          </div>

          {/* Verificaciones */}
          <div style={{ background:'rgba(30,41,59,.6)', border:'1px solid rgba(148,163,184,.1)', borderRadius:20, padding:20 }}>
            <h3 style={{ margin:0, marginBottom:12, color:'#f1f5f9' }}>Verificaciones</h3>
            <div style={{ display:'grid', gap:12 }}>
              {/* Selfie solo turno */}
              <div>
                <button disabled={!isTurno} title={isTurno ? 'Tomar selfie' : 'No requerido para colación'} style={{
                  width:'100%', padding:'10px', borderRadius:12, border:'1px solid rgba(148,163,184,.2)',
                  background: isTurno ? 'rgba(15,23,42,.7)' : 'rgba(71,85,105,.4)', color:'#e5e7eb',
                  cursor: isTurno ? 'pointer':'not-allowed', marginBottom:8
                }}> {isTurno ? 'Tomar selfie' : 'Selfie no requerido'} </button>
                {isTurno && <CameraCapture onCapture={setSelfie} />}
              </div>

              {/* Ubicación */}
              <LocationButton onOk={setLoc} />

              {/* QR solo turno */}
              <button type="button" onClick={handleGetQR} disabled={!isTurno || !siteId} style={{
                padding:'12px', borderRadius:12, border:'none',
                background: (!isTurno || !siteId) ? 'rgba(71,85,105,.5)' : 'linear-gradient(135deg,#0ea5e9,#0284c7)',
                color:'#fff', fontWeight:700, cursor: (!isTurno || !siteId) ? 'not-allowed':'pointer'
              }}>
                🔲 Obtener QR {qr ? '✅' : ''}
              </button>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div style={{ background:'rgba(30,41,59,.6)', border:'1px solid rgba(148,163,184,.1)', borderRadius:20, padding:16 }}>
          <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
            <button type="button" onClick={submit} disabled={!canSubmit || loading} style={{
              padding:'14px 22px', borderRadius:14, border:'none',
              background: (!canSubmit || loading) ? 'rgba(71,85,105,.5)' : 'linear-gradient(135deg,#10b981,#059669)',
              color:'#fff', fontWeight:800, fontSize:16, cursor: (!canSubmit || loading) ? 'not-allowed' : 'pointer',
              boxShadow: (!canSubmit || loading) ? 'none' : '0 8px 25px rgba(16,185,129,.35)'
            }}>
              {loading ? 'Procesando…' : `Marcar ${labelByType(checkType)}`}
            </button>
          </div>

          <div style={{ display:'flex', gap:10, marginTop:14, justifyContent:'center', flexWrap:'wrap', fontSize:13 }}>
            <Status ok={!!personId} label="Empleado" />
            <Status ok={!!siteId} label="Sucursal" />
            <Status ok={!!loc} label="Ubicación" />
            {isTurno && <Status ok={!!selfie} label="Selfie" />}
            {isTurno && <Status ok={!!qr} label="QR" />}
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position:'fixed', top:20, right:20,
          background:'rgba(15,23,42,.95)', border:'1px solid rgba(148,163,184,.2)',
          borderRadius:16, padding:'12px 16px', color:'#f1f5f9', fontSize:14, zIndex:100
        }}>{toast}</div>
      )}
    </div>
  );
}

function Status({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, color: ok ? '#10b981' : '#94a3b8' }}>
      {ok ? '✅' : '⏳'} {label}
    </div>
  );
}
function labelByType(t: CheckType) {
  switch (t) {
    case 'in': return 'Entrada';
    case 'out': return 'Salida';
    case 'lunch_in': return 'Inicio colación';
    case 'lunch_out': return 'Fin colación';
    default: return 'Marcaje';
  }
}