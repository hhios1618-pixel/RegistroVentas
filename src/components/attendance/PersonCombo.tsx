'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';

type Person = {
  id: string;
  full_name: string;
  role?: string | null;
  local?: string | null; // sucursal
  phone?: string | null;
  active?: boolean | null;
};

type Props = {
  value: Person | null;
  onSelect: (p: Person | null) => void;
};

export default function PersonCombo({ value, onSelect }: Props) {
  const [q, setQ] = useState('');
  const [list, setList] = useState<Person[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [idx, setIdx] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // click-outside para cerrar
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', h);
    return () => window.removeEventListener('mousedown', h);
  }, []);

  // carga inicial
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch('/endpoints/people?limit=500', { cache: 'no-store', headers: { Accept: 'application/json' } });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'fetch_failed');
        setList(json.data as Person[]);
      } catch (e) {
        setList([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // búsqueda remota (>=2 letras)
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/endpoints/people?q=${encodeURIComponent(term)}&limit=300`, { cache: 'no-store', headers: { Accept: 'application/json' } });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'fetch_failed');
        setList(json.data as Person[]);
        setIdx(0);
      } catch (e) {
        // noop
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s || s.length >= 2) return list;
    return list.filter(p => (p.full_name || '').toLowerCase().includes(s));
  }, [q, list]);

  const choose = (p: Person) => {
    onSelect(p);
    setQ(p.full_name);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); filtered[idx] && choose(filtered[idx]); }
    else if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
  };

  useEffect(() => {
    if (value) setQ(value.full_name);
  }, [value?.id]);

  return (
    <div ref={boxRef} style={{ display: 'grid', gap: 6, position: 'relative' }}>
      <label>Persona</label>

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
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); onSelect(null); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Escribe nombre o teléfono…"
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 8, outline: 'none',
            background: 'transparent', color: '#e5e7eb', border: 'none'
          }}
        />
        {/* etiqueta sucursal cuando ya hay persona */}
        {value?.local && (
          <div style={{ marginTop: 6, fontSize: 12, color: '#9ca3af' }}>
            Sucursal sugerida: <b style={{ color: '#e5e7eb' }}>{value.local}</b>
          </div>
        )}
      </div>

      {open && (
        <div
          style={{
            position: 'absolute', top: 82, left: 0, right: 0, zIndex: 50,
            borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(17,24,39,0.95)', backdropFilter: 'blur(10px)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.45)', maxHeight: 320, overflowY: 'auto'
          }}
        >
          {loading && <div style={{ padding: 12, color: '#9ca3af' }}>Buscando…</div>}
          {!loading && filtered.length === 0 && <div style={{ padding: 12, color: '#9ca3af' }}>Sin resultados</div>}
          {!loading && filtered.map((p, i) => (
            <div
              key={p.id}
              onMouseDown={(e) => { e.preventDefault(); choose(p); }}
              onMouseEnter={() => setIdx(i)}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 12px', cursor: 'pointer',
                background: i === idx ? 'rgba(59,130,246,0.15)' : 'transparent'
              }}
            >
              <div style={{ color: '#e5e7eb' }}>{p.full_name}</div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>{p.local ?? ''}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}