'use client';
import React, { useEffect, useState } from 'react';

type Site = { id: string; name: string; lat: number|null; lng: number|null; radius_m: number };

export default function AdminSucursalesPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch('/api/sites', { cache: 'no-store', headers: { Accept: 'application/json' } });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || 'sites_fetch_failed');
    setSites(json.data as Site[]);
  };

  useEffect(() => { load(); }, []);

  const useMyLocation = async (s: Site) => {
    setMsg(null);
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      const payload = { lat: coords.latitude, lng: coords.longitude };
      const res = await fetch(`/api/sites/${s.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) { setMsg(`Coordenadas actualizadas para "${s.name}"`); load(); }
      else setMsg('No se pudo actualizar.');
    }, () => setMsg('Activa GPS y permisos.'), { enableHighAccuracy: true, timeout: 10000 });
  };

  const updateRadius = async (s: Site, radius: number) => {
    const res = await fetch(`/api/sites/${s.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ radius_m: radius }) });
    if (res.ok) load();
  };

  return (
    <div style={{ minHeight: '100dvh', background:'#0a0f1f', color:'#e5e7eb' }}>
      <div style={{ maxWidth: 900, margin:'40px auto', padding: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Sucursales (setear coordenadas)</h1>
        {msg && <div style={{ background:'#122132', border:'1px solid #1f3348', padding:10, borderRadius:10, marginBottom:12 }}>{msg}</div>}
        <div style={{ display:'grid', gap:12 }}>
          {sites.map(s => (
            <div key={s.id} style={{ display:'grid', gap:8, padding:14, borderRadius:12, border:'1px solid #1f2a44', background:'rgba(17,24,39,0.6)' }}>
              <div style={{ fontWeight:600 }}>{s.name}</div>
              <div style={{ fontSize:13, color:'#9ca3af' }}>
                {s.lat && s.lng ? `Lat: ${s.lat.toFixed(6)} | Lng: ${s.lng.toFixed(6)}` : 'Coordenadas: sin definir'}
              </div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                <button onClick={() => useMyLocation(s)} style={{ padding:'8px 12px', borderRadius:10, border:'1px solid #2a3b55', background:'#12324a', color:'#e5e7eb' }}>
                  Usar mi ubicación (estoy en la sucursal)
                </button>
                <label style={{ display:'flex', alignItems:'center', gap:8 }}>
                  Radio (m):
                  <input
                    type="number" defaultValue={s.radius_m}
                    onBlur={(e) => updateRadius(s, Number(e.currentTarget.value || 100))}
                    style={{ width:100, padding:'6px 8px', borderRadius:8, border:'1px solid #2a3b55', background:'transparent', color:'#e5e7eb' }}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
        <p style={{ marginTop:14, color:'#9ca3af' }}>Recomendado: 100 m. Si hay falsos negativos por GPS, sube a 120–150 m.</p>
      </div>
    </div>
  );
}