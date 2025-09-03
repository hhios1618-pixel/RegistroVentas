'use client';
import React, { useEffect, useMemo, useState } from 'react';

type Site = { id: string; name: string };

export default function SiteSelect({
  value,
  onChange,
  preselectName, // ej. "La Paz"
}: {
  value: string | null;
  onChange: (id: string | null) => void;
  preselectName?: string | null;
}) {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch('/api/sites', { cache: 'no-store', headers: { Accept: 'application/json' } });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'fetch_failed');
        setSites(json.data as Site[]);
      } catch (e: any) {
        setErr('No se pudieron cargar sucursales.');
        setSites([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Preselección por coincidencia parcial con nombre
  useEffect(() => {
    if (!preselectName || !sites.length) return;
    const needle = preselectName.toLowerCase();
    const match = sites.find((s) => s.name.toLowerCase().includes(needle));
    if (match && value !== match.id) onChange(match.id);
  }, [preselectName, sites, value, onChange]);

  const selected = useMemo(() => sites.find((s) => s.id === value) || null, [sites, value]);

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <label style={{ color: '#cbd5e1' }}>Sucursal</label>

      <div
        style={{
          position: 'relative',
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(17,24,39,0.7)',
          padding: 8,
          boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <select
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value || null)}
          disabled={loading || !!err}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: 8,
            background: 'transparent',
            color: '#e5e7eb',
            border: 'none',
            outline: 'none',
            appearance: 'none',
          }}
        >
          <option value="">{loading ? 'Cargando…' : 'Selecciona sucursal'}</option>
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Etiqueta informativa clara debajo */}
      <div style={{ minHeight: 18 }}>
        {err && <small style={{ color: '#f87171' }}>{err}</small>}
        {!err && selected && (
          <small style={{ color: '#9ca3af' }}>
            Sucursal seleccionada: <b style={{ color: '#e5e7eb' }}>{selected.name}</b>
          </small>
        )}
      </div>
    </div>
  );
}