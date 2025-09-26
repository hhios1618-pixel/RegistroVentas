'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { normalizeName } from '@/lib/normalize';

type Site = {
  id: string;
  name: string;
  lat?: number | null;
  lng?: number | null;
  radius_m?: number | null;
  is_active?: boolean | null;
};

export default function SiteSelect({
  value,
  onChange,
  preselectName,   // p.ej. "Santa Cruz" que viene de /endpoints/me
  disabled,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
  preselectName?: string | null;
  disabled?: boolean;
}) {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Cargar sedes
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch('/endpoints/sites', { cache: 'no-store', headers: { Accept: 'application/json' } });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'sites_fetch_failed');
        if (alive) setSites(Array.isArray(json.data) ? json.data : []);
      } catch (e:any) {
        if (alive) { setErr('No se pudieron cargar sucursales.'); setSites([]); }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Preselección robusta cuando hay preselectName Y sites cargados
  useEffect(() => {
    if (!preselectName || !sites.length) return;
    const needle = normalizeName(preselectName);
    const match = sites.find(s => normalizeName(s.name) === needle);
    if (match && value !== match.id) onChange(match.id);
  }, [preselectName, sites, value, onChange]);

  const selected = useMemo(() => sites.find(s => s.id === value) || null, [sites, value]);

  const label = useMemo(() => {
    if (loading) return 'Cargando sedes…';
    if (!preselectName) return 'No asignada';
    if (selected) return selected.name;
    return `${preselectName} (no mapeada)`;
  }, [loading, preselectName, selected]);

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <label style={{ color: '#cbd5e1' }}>Sucursal</label>

      <div
        style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(17,24,39,0.7)', padding: 8,
          boxShadow: '0 8px 30px rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)',
        }}
      >
        <div style={{ display:'flex', flexDirection:'column' }}>
          <span style={{ fontWeight: 600, fontSize: 14, color:'#e5e7eb' }}>{label}</span>
          {selected && selected.lat && selected.lng && (
            <small style={{ color:'#9ca3af' }}>
              🎯 Geocerca: {Math.round(selected.radius_m || 150)} m
            </small>
          )}
          {!selected && preselectName && !loading && (
            <small style={{ color:'#9ca3af' }}>
              No encontramos “{preselectName}”. Elige manualmente.
            </small>
          )}
        </div>

        {/* Selector manual de respaldo */}
        <select
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value || null)}
          disabled={disabled || loading || !!err}
          style={{
            width: '48%', minWidth: 180,
            padding: '10px', borderRadius: 10,
            background: 'rgba(2,6,23,.6)', color: '#e5e7eb',
            border: '1px solid rgba(148,163,184,.2)', outline: 'none',
          }}
        >
          <option value="">{loading ? 'Cargando…' : 'Selecciona sucursal'}</option>
          {sites.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {err && <small style={{ color: '#f87171' }}>{err}</small>}
      {!err && selected && (
        <small style={{ color: '#9ca3af' }}>
          Sucursal seleccionada: <b style={{ color: '#e5e7eb' }}>{selected.name}</b>
        </small>
      )}
    </div>
  );
}