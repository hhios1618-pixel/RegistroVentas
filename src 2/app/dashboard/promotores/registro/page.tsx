'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import useSWR from 'swr';
import { createClient } from '@supabase/supabase-js';

// ==================
// Configuración
// ==================
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error('Error al cargar datos');
    return res.json();
  });

// ==================
// Tipos
// ==================
type Origin = 'cochabamba' | 'lapaz' | 'elalto' | 'santacruz' | 'sucre' | 'tienda';

interface ProductRow {
  code: string;   // <- no hay id; usamos code como clave
  name: string;
  stock: number;
}

interface SaleLine {
  product_id: string | null; // lo mantenemos por compatibilidad; guardamos null
  product_name: string;
  quantity: number;
  unit_price: number;
  customer_name?: string | null;
  customer_phone?: string | null;
  notes?: string | null;
  warehouse_origin?: string | null;
  district?: string | null;
}

// ==================
// Utils
// ==================
const dbPhoneOrNull = (raw?: string | null) => {
  if (!raw) return null;
  const v = raw.trim();
  return /^(\+)?\d{8,15}$/.test(v) ? v : null;
};

const ALLOWED_WAREHOUSES = new Set([
  'cochabamba',
  'lapaz',
  'elalto',
  'santacruz',
  'sucre',
  'tienda',
]);

const cleanWarehouse = (w?: string | null) => {
  const v = (w || '').toLowerCase().trim();
  return ALLOWED_WAREHOUSES.has(v) ? v : null;
};

const getInitials = (name?: string) => {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  return parts.slice(0, 2).map((p: string) => p.charAt(0).toUpperCase()).join('');
};

const fmt = (n: number) => `Bs. ${n.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`;

// ==================
// Página
// ==================
export default function SalesEntry() {
  // Identidad
  const { data: me, isLoading: meLoading } = useSWR('/endpoints/me', fetcher);
  const promoterName = useMemo(() => me?.full_name || '', [me?.full_name]);
  const initials = useMemo(() => getInitials(promoterName), [promoterName]);
  const canAccess = !!me?.ok;

  // Cabecera
  const [saleDate, setSaleDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [origin, setOrigin] = useState<Origin>('santacruz');
  const [warehouse, setWarehouse] = useState<string>('');

  // Línea en edición
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProductRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const lastReqIdRef = useRef(0);

  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [district, setDistrict] = useState('');

  // Líneas acumuladas
  const [lines, setLines] = useState<SaleLine[]>([]);
  const [saving, setSaving] = useState(false);

  const total = useMemo(
    () => lines.reduce((s: number, l: SaleLine) => s + l.quantity * l.unit_price, 0),
    [lines]
  );

  // ==================
  // Autosuggest (debounce + anti-race) usando code|name|stock
  // ==================
  useEffect(() => {
    let active = true;

    const run = async () => {
      const q = query.trim();
      setProductName(q);
      setSearchError(null);

      if (q.length < 3) {
        setResults([]);
        return;
      }

      setSearching(true);
      const reqId = ++lastReqIdRef.current;

      try {
        const { data, error } = await supabase
          .from('products')
          .select('code, name, stock')
          .or(`name.ilike.%${q}%,code.ilike.%${q}%`)
          .limit(6);

        if (!active || reqId !== lastReqIdRef.current) return;

        if (error) {
          console.warn('[products search] error:', error);
          setSearchError('Búsqueda no disponible.');
          setResults([]);
        } else {
          setResults((data as ProductRow[]) || []);
        }
      } catch (err: any) {
        if (!active) return;
        console.warn('[products search] unexpected:', err);
        setSearchError('Error inesperado en búsqueda.');
        setResults([]);
      } finally {
        if (active) setSearching(false);
      }
    };

    const t = setTimeout(run, 300);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [query]);

  // ==================
  // Acciones
  // ==================
  const addLine = () => {
    if (!productName || quantity <= 0 || unitPrice <= 0) return;
    setLines((prev) => [
      ...prev,
      {
        product_id: null, // no hay id en products; mantenemos null
        product_name: productName,
        quantity,
        unit_price: unitPrice,
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        notes: notes || null,
        warehouse_origin: warehouse || null,
        district: district || null,
      },
    ]);
    setProductName('');
    setQuantity(1);
    setUnitPrice(0);
    setCustomerName('');
    setCustomerPhone('');
    setNotes('');
    setDistrict('');
    setQuery('');
    setResults([]);
  };

  const removeLine = (idx: number) => {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const saveAll = async () => {
    if (lines.length === 0) return;
    setSaving(true);

    const payload = lines.map((l) => ({
      promoter_name: promoterName,
      sale_date: saleDate,
      origin,
      product_id: l.product_id, // sigue null
      product_name: l.product_name,
      quantity: l.quantity,
      unit_price: l.unit_price,
      customer_name: l.customer_name ?? null,
      customer_phone: dbPhoneOrNull(l.customer_phone),
      notes: l.notes ?? null,
      warehouse_origin: cleanWarehouse(l.warehouse_origin),
      district: l.district ?? null,
    }));

    const { error } = await supabase.from('promoter_sales').insert(payload);

    if (error) {
      alert('Error al guardar: ' + error.message);
    } else {
      setLines([]);
      alert('✅ Ventas registradas con éxito.');
    }
    setSaving(false);
  };

  // ==================
  // Loading / Guard Clauses
  // ==================
  if (meLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-8">
          <div className="w-12 h-12 rounded-full border-2 border-white/20 border-t-white/70 animate-spin mx-auto mb-4" />
          <p className="text-white/80 font-medium">Cargando sistema…</p>
        </div>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="relative backdrop-blur-xl bg-white/5 border border-rose-300/30 rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-rose-400/20 border border-rose-300/40 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-rose-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M4.08 15.5h15.84c1.54 0 2.5-1.67 1.73-2.5L13.73 4c-.77-.83-1.96-.83-2.73 0L2.35 13c-.77.83.19 2.5 1.73 2.5z" />
            </svg>
          </div>
          <h3 className="text-white text-lg font-semibold mb-1">Acceso denegado</h3>
          <p className="text-white/70">No tienes permisos para esta sección.</p>
        </div>
      </div>
    );
  }

  // ==================
  // Render (dark + glassmorphism)
  // ==================
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-40">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-white/10" />
          <div className="relative backdrop-blur-xl bg-white/5 border-b border-white/10">
            <div className="max-w-7xl mx-auto px-6 py-6">
              <div className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-r from-blue-500/30 to-purple-500/30 border border-blue-400/30 rounded-xl">
                    <svg width="26" height="26" viewBox="0 0 24 24" className="text-white"><path fill="currentColor" d="M7 3h10v2H7zm10 16H7v2h10zM3 7h2v10H3zm16 0h2v10h-2zM8 8h8v8H8z"/></svg>
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold">Registro de Ventas (Promotores)</h1>
                    <p className="text-white/60 text-sm">Captura rápida de líneas de venta con validación básica</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs text-white/60">Usuario activo</p>
                    <p className="font-semibold">{promoterName}</p>
                  </div>
                  <div className="w-11 h-11 bg-white/10 border border-white/20 rounded-xl flex items-center justify-center font-bold">
                    {initials}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Configuración de Venta */}
        <section className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10 rounded-xl" />
          <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <div className="px-6 py-5 border-b border-white/10">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-400" />
                Configuración de Venta
              </h2>
            </div>
            <div className="px-6 py-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white/70">Fecha de venta</label>
                  <input
                    type="date"
                    value={saleDate}
                    onChange={(e) => setSaleDate(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white/70">Ciudad de origen</label>
                  <select
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value as Origin)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50"
                  >
                    <option className="bg-black" value="santacruz">Santa Cruz</option>
                    <option className="bg-black" value="lapaz">La Paz</option>
                    <option className="bg-black" value="elalto">El Alto</option>
                    <option className="bg-black" value="cochabamba">Cochabamba</option>
                    <option className="bg-black" value="sucre">Sucre</option>
                    <option className="bg-black" value="tienda">Tienda</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white/70">Bodega de origen</label>
                  <input
                    type="text"
                    value={warehouse}
                    onChange={(e) => setWarehouse(e.target.value)}
                    placeholder="Especifica la bodega (opcional)"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Agregar Producto */}
        <section className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10 rounded-xl" />
          <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <div className="px-6 py-5 border-b border-white/10">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
                Agregar Producto
              </h2>
              <p className="text-white/60 text-sm">Completa los detalles y añádelo al registro</p>
            </div>

            <div className="px-6 py-6">
              {/* Primera fila */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div className="md:col-span-2 space-y-2 relative">
                  <label className="block text-sm font-semibold text-white/70">Producto</label>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar producto (mín. 3 caracteres)…"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50"
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setResults([]);
                    }}
                  />
                  {results.length > 0 && (
                    <div className="absolute z-50 w-full bg-black/80 border border-white/20 rounded-lg shadow-2xl mt-1 max-h-56 overflow-y-auto backdrop-blur-md">
                      {results.map((r) => (
                        <button
                          key={r.code} // <- usamos code como key
                          type="button"
                          className="w-full text-left p-3 hover:bg-white/10 border-b border-white/10 last:border-b-0"
                          onClick={() => {
                            setProductName(r.name);
                            setQuery(r.name);
                            setResults([]);
                          }}
                        >
                          <div className="font-medium">{r.name}</div>
                          <div className="text-xs text-white/70">Stock: {r.stock} • Código: {r.code}</div>
                        </button>
                      ))}
                    </div>
                  )}
                  {searching && query.trim().length >= 3 && results.length === 0 && (
                    <div className="mt-2 text-xs text-white/50">Buscando…</div>
                  )}
                  {searchError && (
                    <div className="mt-2 text-xs text-rose-300">{searchError}</div>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white/70">Cantidad</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    min="1"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white/70">Precio unitario (Bs.)</label>
                  <input
                    type="number"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50"
                  />
                </div>
              </div>

              {/* Segunda fila */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white/70">Nombre del cliente</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nombre completo (opcional)"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white/70">Teléfono de contacto</label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Número de teléfono (opcional)"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50"
                  />
                </div>
              </div>

              {/* Tercera fila */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white/70">Notas adicionales</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Observaciones o comentarios (opcional)"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white/70">Distrito / Zona</label>
                  <input
                    type="text"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="Ubicación de entrega (opcional)"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50"
                  />
                </div>
              </div>

              {/* Acción Agregar */}
              <div className="flex justify-between items-center pt-4 border-t border-white/10">
                <div className="text-sm text-white/70">
                  {productName && quantity > 0 && unitPrice > 0 && (
                    <span>Subtotal: <span className="font-semibold text-white">{fmt(quantity * unitPrice)}</span></span>
                  )}
                </div>
                <button
                  onClick={addLine}
                  disabled={!productName || quantity <= 0 || unitPrice <= 0}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500/30 to-blue-600/30 border border-blue-400/30 text-white font-semibold rounded-lg hover:from-blue-500/40 hover:to-blue-600/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Agregar al Registro
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Resumen de Venta / Tabla */}
        {lines.length > 0 && (
          <section className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10 rounded-xl" />
            <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl overflow-hidden">
              <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-cyan-400" />
                    Resumen de Venta
                  </h2>
                  <p className="text-white/60 text-sm">{lines.length} productos registrados</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-white/60">Total</p>
                  <p className="text-2xl font-extrabold text-white">{fmt(total)}</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-white/5 border-b border-white/10">
                    <tr>
                      <th className="text-left px-6 py-4 text-xs font-bold text-white/70 uppercase">Producto</th>
                      <th className="text-center px-6 py-4 text-xs font-bold text-white/70 uppercase">Cantidad</th>
                      <th className="text-right px-6 py-4 text-xs font-bold text-white/70 uppercase">Precio Unit.</th>
                      <th className="text-left px-6 py-4 text-xs font-bold text-white/70 uppercase">Cliente</th>
                      <th className="text-left px-6 py-4 text-xs font-bold text-white/70 uppercase">Teléfono</th>
                      <th className="text-right px-6 py-4 text-xs font-bold text-white/70 uppercase">Subtotal</th>
                      <th className="px-6 py-4" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {lines.map((l, idx) => (
                      <tr key={`${l.product_name}-${idx}`} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium">{l.product_name}</div>
                          {l.notes && <div className="text-xs text-white/60 mt-1">{l.notes}</div>}
                          <div className="text-[11px] text-white/50 mt-1">
                            {l.district ? `Zona: ${l.district}` : ''}{l.warehouse_origin ? ` • Bodega: ${l.warehouse_origin}` : ''}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">{l.quantity}</td>
                        <td className="px-6 py-4 text-right">{fmt(l.unit_price)}</td>
                        <td className="px-6 py-4">
                          <div>{l.customer_name || '-'}</div>
                        </td>
                        <td className="px-6 py-4">{l.customer_phone || '-'}</td>
                        <td className="px-6 py-4 text-right font-semibold">{fmt(l.quantity * l.unit_price)}</td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => removeLine(idx)}
                            className="px-3 py-1.5 text-xs rounded-md bg-white/10 border border-white/20 hover:bg-white/20 transition-colors"
                          >
                            Quitar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer acciones */}
              <div className="px-6 py-5 border-t border-white/10 flex items-center justify-between">
                <div className="text-sm text-white/60">
                  {lines.length === 0 ? 'No hay productos en el registro' : `${lines.length} productos listos para guardar`}
                </div>
                <button
                  onClick={saveAll}
                  disabled={saving || lines.length === 0}
                  className="px-8 py-3 bg-emerald-500/30 border border-emerald-400/40 text-white font-semibold rounded-lg hover:bg-emerald-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {saving ? 'Guardando…' : 'Guardar Registro'}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Estado vacío persistente */}
        {lines.length === 0 && (
          <section className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10 rounded-xl" />
            <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-8 text-center">
              <p className="text-white/70">Agrega productos para iniciar el registro.</p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}