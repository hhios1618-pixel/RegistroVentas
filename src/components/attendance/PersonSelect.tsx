'use client';
import React, { useEffect, useMemo, useState } from 'react';

type Person = {
  id: string;
  full_name: string;
  role?: string | null;
  local?: string | null;   // sucursal
  phone?: string | null;
  active?: boolean | null;
};

export default function PersonSelect({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const [q, setQ] = useState('');
  const [list, setList] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Carga inicial
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch('/api/people?limit=500', {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('application/json')) throw new Error('non_json');
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'fetch_failed');
        setList(json.data as Person[]);
      } catch (e: any) {
        console.error('[PersonSelect] fetch error:', e);
        setErr('No se pudo cargar la lista.');
        setList([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Búsqueda remota (>=2 letras) con debounce
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const t = setTimeout(async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(`/api/people?q=${encodeURIComponent(term)}&limit=300`, {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'fetch_failed');
        setList(json.data as Person[]);
      } catch (e: any) {
        console.error('[PersonSelect] search error:', e);
        setErr('Error buscando personas.');
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  // Cuando <2 letras, filtramos en cliente por cortesía
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s || s.length >= 2) return list;
    return list.filter((p) => (p.full_name || '').toLowerCase().includes(s));
  }, [q, list]);

  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <label>Persona</label>

      <input
        placeholder="Buscar por nombre o teléfono… (>=2 letras)"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{
          padding: '8px 10px',
          borderRadius: 8,
          border: '1px solid #334155',
          background: '#0b1225',
          color: '#e5e7eb',
        }}
      />

      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={loading}
        style={{
          padding: '10px',
          borderRadius: 8,
          border: '1px solid #334155',
          background: '#0b1225',
          color: '#e5e7eb',
        }}
      >
        <option value="">{loading ? 'Cargando…' : 'Selecciona persona'}</option>
        {filtered.map((p) => (
          <option key={p.id} value={p.id}>
            {p.full_name} {p.local ? `— ${p.local}` : ''}
          </option>
        ))}
      </select>

      {err && <small style={{ color: '#f87171' }}>{err}</small>}
      {!loading && filtered.length === 0 && !err && (
        <small style={{ color: '#9ca3af' }}>Sin resultados.</small>
      )}
    </div>
  );
}