'use client';
import React, { useState } from 'react';

export default function SelfieClip({ attendanceId }: { attendanceId: string }) {
  const [open, setOpen] = useState(false);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const fetchUrl = async () => {
    try {
      setLoading(true);
      setErr(null);
      const r = await fetch(`/endpoints/selfie-url?attendance_id=${attendanceId}`, { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'No se pudo firmar la URL');
      setImgUrl(j.url);
      setOpen(true);
    } catch (e: any) {
      setErr(e?.message || 'Error cargando selfie');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={fetchUrl}
        title="Ver selfie"
        style={{
          border: '1px solid rgba(148,163,184,.25)',
          background: 'rgba(15,23,42,.7)',
          color: '#e5e7eb',
          padding: '6px 10px',
          borderRadius: 10,
          cursor: 'pointer',
          fontSize: 13,
        }}
      >
        {loading ? '…' : '📎 Selfie'}
      </button>

      {err && <span style={{ color: '#f87171', fontSize: 12, marginLeft: 8 }}>{err}</span>}

      {open && imgUrl && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, display: 'grid', placeItems: 'center',
            background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(6px)', zIndex: 9999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'rgba(15,23,42,.95)',
              border: '1px solid rgba(148,163,184,.2)',
              borderRadius: 16,
              padding: 16,
              maxWidth: '92vw',
              maxHeight: '88vh',
              boxShadow: '0 20px 60px rgba(0,0,0,.4)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
              <strong style={{ color: '#e5e7eb' }}>Selfie del marcaje</strong>
              <button
                onClick={() => setOpen(false)}
                style={{ background: 'transparent', color: '#94a3b8', border: 'none', fontSize: 18, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <img
              src={imgUrl}
              alt="Selfie asistencia"
              style={{ width: 'min(86vw, 560px)', height: 'auto', borderRadius: 12, display: 'block' }}
            />
            <div style={{ marginTop: 8, color: '#94a3b8', fontSize: 12 }}>
              *La URL expira en ~2 minutos por seguridad.
            </div>
          </div>
        </div>
      )}
    </>
  );
}