'use client';
import React, { useState } from 'react';

export type GeoResult = { lat: number; lng: number; accuracy: number };

export default function LocationButton({ onOk }: { onOk: (loc: GeoResult) => void }) {
  const [loading, setLoading] = useState(false);
  const [last, setLast] = useState<GeoResult | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const getLocation = () => {
    setLoading(true);
    setErr(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const loc = { lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy ?? 9999 };
        setLast(loc);
        setLoading(false);
        onOk(loc);
      },
      e => {
        setErr('Activa GPS y concede permisos de ubicación.');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <button
        type="button"
        onClick={getLocation}
        disabled={loading}
        style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #3a3a3a', background: '#0b3d3f', color: '#fff' }}
      >
        {loading ? 'Obteniendo ubicación…' : 'Obtener ubicación (GPS)'}
      </button>
      {last && (
        <small style={{ color: '#9ca3af' }}>
          Lat: {last.lat.toFixed(6)} | Lng: {last.lng.toFixed(6)} | Precisión: {Math.round(last.accuracy)} m
        </small>
      )}
      {err && <small style={{ color: '#f87171' }}>{err}</small>}
    </div>
  );
}