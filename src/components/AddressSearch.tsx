// src/components/AddressSearch.tsx (CORREGIDO)
'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Search, MapPin, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { AddressSearchProps, AddressSuggestion } from '@/types';

export const AddressSearch: React.FC<AddressSearchProps> = ({
  value,
  onChange,
  onPick,
  placeholder = 'Buscar dirección…',
  disabled = false,
  className
}) => {
  const [items, setItems] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const searchNow = useCallback(async (q: string) => {
    if (!q.trim()) {
      setItems([]); setOpen(false); setError(null); return;
    }
    try {
      setLoading(true); setError(null);
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      const url = `/api/geocode?q=${encodeURIComponent(q)}&limit=8`;
      const res = await fetch(url, { signal: abortRef.current.signal, headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) throw new Error(`Error ${res.status}: ${await res.text()}`);
      const data = (await res.json()) as AddressSuggestion[];
      setItems(data || []); setOpen(true);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('Error searching address:', err);
      setError('Error al buscar direcciones'); setItems([]); setOpen(false);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!value.trim()) {
      setItems([]); setOpen(false); setError(null); return;
    }
    timerRef.current = setTimeout(() => searchNow(value), 350);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [value, searchNow]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (items.length > 0) handlePick(items[0]); else searchNow(value);
    } else if (e.key === 'Escape') {
      setOpen(false); inputRef.current?.blur();
    }
  };

  const handlePick = (suggestion: AddressSuggestion) => {
    onPick(suggestion); setOpen(false); setError(null);
  };

  const clearSearch = () => {
    onChange(''); setItems([]); setOpen(false); setError(null); inputRef.current?.focus();
  };

  return (
    <div className={cn('relative', className)} ref={boxRef}>
      <div className="relative">
        <input
          ref={inputRef} value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={handleKeyDown}
          placeholder={placeholder} disabled={disabled}
          className={cn('w-full bg-black/50 border border-white/15 rounded-lg px-3 py-2 text-white pr-20 transition-colors', 'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50', 'disabled:opacity-50 disabled:cursor-not-allowed', error && 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500/50')}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {loading && <Loader2 className="w-4 h-4 animate-spin text-white/50" />}
          {value && !loading && <button type="button" onClick={clearSearch} className="p-1 hover:bg-white/10 rounded text-white/50 hover:text-white/80 transition-colors"><X className="w-3 h-3" /></button>}
          <Search className="w-4 h-4 text-white/50" />
        </div>
      </div>
      {error && <div className="absolute z-20 mt-1 w-full p-3 rounded-lg border border-red-500/30 bg-red-500/10 backdrop-blur"><p className="text-sm text-red-400">{error}</p></div>}
      {open && items.length > 0 && !error && (
        <div className="absolute z-20 mt-1 w-full max-h-64 overflow-auto rounded-lg border border-white/15 bg-black/90 backdrop-blur shadow-xl">
          {items.map((suggestion, i) => (
            <button key={i} type="button" onClick={() => handlePick(suggestion)} className={cn('w-full text-left px-3 py-3 hover:bg-white/10 text-white/90 transition-colors', 'flex items-start gap-3 border-b border-white/5 last:border-b-0')}>
              <MapPin className="w-4 h-4 text-white/50 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{suggestion.label}</div>
                {suggestion.formatted_address && suggestion.formatted_address !== suggestion.label && <div className="text-xs text-white/60 mt-1 truncate">{suggestion.formatted_address}</div>}
              </div>
            </button>
          ))}
        </div>
      )}
      {open && items.length === 0 && !loading && !error && value.trim() && <div className="absolute z-20 mt-1 w-full p-3 rounded-lg border border-white/15 bg-black/80 backdrop-blur"><p className="text-sm text-white/60">No se encontraron direcciones</p></div>}
    </div>
  );
};

export default AddressSearch; // <-- EXPORTACIÓN POR DEFECTO
