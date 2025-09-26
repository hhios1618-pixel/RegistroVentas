'use client';
import React, { useEffect, useRef, useState } from 'react';

type Props = {
  onCapture: (dataUrl: string) => void;
  aspectRatio?: number; // 1 = cuadrado
};

export default function CameraCapture({ onCapture, aspectRatio = 1 }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream;
    const start = async () => {
      try {
        // getUserMedia solo funciona en HTTPS o localhost
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setReady(true);
        }
      } catch {
        setError('No se pudo acceder a la cámara. Usa HTTPS o permite permisos. Puedes subir foto como fallback.');
      }
    };
    start();
    return () => { if (stream) stream.getTracks().forEach(t => t.stop()); };
  }, []);

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current;
    const c = canvasRef.current;
    const w = v.videoWidth;
    const h = v.videoHeight;
    if (!w || !h) return;

    const targetW = w;
    const targetH = Math.round(w / aspectRatio);
    const sx = 0;
    const sy = Math.max(0, Math.round((h - targetH) / 2));

    c.width = targetW;
    c.height = targetH;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(v, 0, sy, targetW, targetH, 0, 0, targetW, targetH);
    const dataUrl = c.toDataURL('image/jpeg', 0.9);
    setPreview(dataUrl);
    onCapture(dataUrl);
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPreview(dataUrl);
      onCapture(dataUrl);
    };
    reader.readAsDataURL(f);
  };

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {/* Preview si ya hay foto */}
      {preview ? (
        <img src={preview} alt="selfie" style={{ width: '100%', maxWidth: 480, borderRadius: 12 }} />
      ) : (
        <>
          {!error ? (
            <video ref={videoRef} playsInline muted style={{ width: '100%', maxWidth: 480, borderRadius: 12, display: ready ? 'block' : 'none' }} />
          ) : (
            <div style={{ padding: 12, background: '#2a2a2a', color: '#fff', borderRadius: 8 }}>{error}</div>
          )}
          {!ready && !error && <div style={{ padding: 12, color: '#9ca3af' }}>Cargando cámara…</div>}
        </>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button type="button" onClick={takePhoto} disabled={!ready}
          style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #3a3a3a', background: '#0f172a', color: '#fff' }}>
          Tomar selfie
        </button>

        {/* Fallback */}
        <input ref={fileRef} type="file" accept="image/*" capture="user" onChange={onFile} style={{ display: 'none' }} />
        <button type="button" onClick={() => fileRef.current?.click()}
          style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #3a3a3a', background: '#0b3d3f', color: '#fff' }}>
          Subir foto (fallback)
        </button>
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}