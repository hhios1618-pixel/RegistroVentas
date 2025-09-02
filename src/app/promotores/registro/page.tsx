'use client';

import { useEffect, useMemo, useState } from 'react';
import type { SVGProps } from 'react';
import { motion } from 'framer-motion';

type IconProps = SVGProps<SVGSVGElement>;

type ProductRow = {
  id: string;                // usamos code como id
  code: string | null;
  name: string;
  category: string | null;
  stock: number | null;
};

type OriginKey =
  | 'cochabamba'
  | 'lapaz'
  | 'elalto'
  | 'santacruz'
  | 'sucre'
  | 'encomienda'
  | 'tienda';

type WarehouseKey = Exclude<OriginKey, 'encomienda'>;

type SaleLine = {
  id: string;
  origin: OriginKey;
  warehouseOrigin?: WarehouseKey | null; // si origin = encomienda
  district?: string;                      // si origin ≠ encomienda
  productId?: string | null;              // guardamos code aquí
  productName: string;
  quantity: number;
  unitPrice: number;
  customerName: string;
  customerPhone: string;
  notes?: string;
  phoneError?: string | null;             // UI-only
};

// Catálogo de distritos por ciudad (ajústalo a tu realidad)
const DISTRICTS_BY_CITY: Record<Exclude<OriginKey, 'encomienda' | 'tienda'>, string[]> = {
  cochabamba: [
    'Centro','Queru Queru','Temporal','Sarco','Tiquipaya','Colcapirhua',
    'Quillacollo','Sacaba','Cala Cala','Huañani','Otro',
  ],
  lapaz: [
    'Centro','Sopocachi','Miraflores','San Pedro','Calacoto','Achumani',
    'Obrajes','Cotahuma','Max Paredes','Periférica','Otro',
  ],
  elalto: [
    'Distrito 1','Distrito 2','Distrito 3','Distrito 4','Distrito 5','Distrito 6',
    'Villa Adela','Ciudad Satélite','12 de Octubre','Rio Seco','Otro',
  ],
  santacruz: [
    '1er Anillo','2do Anillo','4to Anillo','Equipetrol','Plan 3000','Pampa de la Isla',
    'La Guardia','Warnes','Montero','Villa 1ro de Mayo','Otro',
  ],
  sucre: [
    'Centro','Distrito 1','Distrito 2','Distrito 3','Yotala','Zona Mercado Campesino','Otro',
  ],
};

const ORIGINS: { key: OriginKey; label: string }[] = [
  { key: 'cochabamba', label: 'Cochabamba' },
  { key: 'lapaz',      label: 'La Paz' },
  { key: 'elalto',     label: 'El Alto' },
  { key: 'santacruz',  label: 'Santa Cruz' },
  { key: 'sucre',      label: 'Sucre' },
  { key: 'encomienda', label: 'Encomienda' },
  { key: 'tienda',     label: 'Tienda' },
];

const WAREHOUSES: { key: WarehouseKey; label: string }[] =
  ORIGINS.filter(o => o.key !== 'encomienda').map(o => ({ key: o.key as WarehouseKey, label: o.label }));

// ----------------- utils -----------------
const uid = () => Math.random().toString(36).slice(2, 9);

function emptyLine(): SaleLine {
  return {
    id: uid(),
    origin: 'cochabamba',
    warehouseOrigin: null,
    district: '',
    productId: null,
    productName: '',
    quantity: 1,
    unitPrice: 0,
    customerName: '',
    customerPhone: '',
    notes: '',
    phoneError: null,
  };
}
function clampInt(v: string, min = 1) {
  const n = parseInt(v || '0', 10);
  return isNaN(n) ? min : Math.max(min, n);
}
function clampNumber(v: string, min = 0) {
  const n = parseFloat(v || '0');
  return isNaN(n) ? min : Math.max(min, n);
}
function formatMoney(n: number) {
  return new Intl.NumberFormat('es-BO', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
}
function useDebounce<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// Normaliza a +591######## si es posible; devuelve {val, error}
function normalizeBoPhone(raw: string): { val: string; error: string | null } {
  const only = raw.replace(/[^\d+]/g, '');
  if (!only) return { val: '', error: 'Requerido' };

  let f = only;

  // Quitar + si es doble
  if (f.startsWith('++')) f = f.replace(/^\++/, '+');

  // Si empieza con 591 (sin +), agrégalo
  if (!f.startsWith('+') && f.startsWith('591')) f = '+' + f;

  // Si son 8 dígitos, asume móvil Bolivia -> +591
  const onlyDigits = f.replace(/\D/g, '');
  if (!f.startsWith('+') && (onlyDigits.length === 8 || onlyDigits.length === 7)) {
    // Para WhatsApp pedimos móvil: 8 dígitos empezando 6/7
    f = `+591${onlyDigits}`;
  }

  // Validación final móvil BO: +591[67]\d{7}
  const ok = /^\+591[67]\d{7}$/.test(f);
  return ok ? { val: f, error: null } : { val: f, error: 'Debe ser +591 y 8 dígitos (móvil 6/7)' };
}

// ----------------- page -----------------
export default function PromotoresRegistroPage() {
  // Lista real de promotores desde DB (solo nombre)
  const [promoters, setPromoters] = useState<{ name: string }[]>([]);
  const [promotersLoading, setPromotersLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/promoters/list', { cache: 'no-store' });
        const data = await res.json();
        setPromoters(Array.isArray(data.items) ? data.items : []);
      } catch {
        setPromoters([]);
      } finally {
        setPromotersLoading(false);
      }
    };
    load();
  }, []);

  // Meta
  const [promoterName, setPromoterName] = useState<string>('');
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().slice(0, 10)); // yyyy-mm-dd

  // Setear el primero cuando lleguen
  useEffect(() => {
    if (!promoterName && promoters.length) {
      setPromoterName(promoters[0].name);
    }
  }, [promoters, promoterName]);

  // Líneas
  const [lines, setLines] = useState<SaleLine[]>([emptyLine()]);

  // Búsqueda por línea
  const [queryByLine, setQueryByLine] = useState<Record<string, string>>({});
  const debouncedQueryByLine = useDebounce(queryByLine, 300);
  const [resultsByLine, setResultsByLine] = useState<Record<string, ProductRow[]>>({});

  // Control del dropdown por línea
  const [openSuggest, setOpenSuggest] = useState<Record<string, boolean>>({});

  // Autocomplete productos (busca por nombre/código; 3+ letras)
  useEffect(() => {
    const run = async () => {
      const newResults: Record<string, ProductRow[]> = {};
      await Promise.all(
        lines.map(async (line) => {
          const q = (debouncedQueryByLine[line.id] || '').trim();
          if (q.length < 3) {
            newResults[line.id] = [];
            return;
          }
          try {
            const res = await fetch(`/api/products/search?q=${encodeURIComponent(q)}&limit=10`, {
              method: 'GET',
              headers: { Accept: 'application/json' },
              cache: 'no-store',
            });
            if (!res.ok) throw new Error('API search error');
            const data = await res.json();
            newResults[line.id] = (data.items || []) as ProductRow[];
          } catch {
            newResults[line.id] = [];
          }
        })
      );
      setResultsByLine(newResults);

      // Abre/cierra según haya resultados y query >= 3
      setOpenSuggest((prev) => {
        const next = { ...prev };
        lines.forEach((line) => {
          const q = (debouncedQueryByLine[line.id] || '').trim();
          next[line.id] = q.length >= 3 && (newResults[line.id]?.length || 0) > 0;
        });
        return next;
      });
    };
    run();
  }, [debouncedQueryByLine, lines]);

  // Totales visuales
  const totals = useMemo(() => {
    const countByOrigin: Record<OriginKey, number> = {
      cochabamba: 0,
      lapaz: 0,
      elalto: 0,
      santacruz: 0,
      sucre: 0,
      encomienda: 0,
      tienda: 0,
    };
    let items = 0;
    let totalBs = 0;
    for (const l of lines) {
      countByOrigin[l.origin] += l.quantity;
      items += l.quantity;
      totalBs += l.quantity * (Number(l.unitPrice) || 0);
    }
    return { countByOrigin, items, totalBs };
  }, [lines]);

  // Guardar
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState<null | 'ok' | 'err'>(null);

  const handleSave = async () => {
    if (!promoterName?.trim()) return alert('Selecciona el promotor/a');
    if (!saleDate) return alert('Selecciona la fecha de la venta');

    // Validaciones de cada línea
    for (const [i, l] of lines.entries()) {
      if (!l.productName.trim()) return alert(`Falta producto en línea ${i + 1}`);
      if (l.quantity <= 0) return alert(`Cantidad inválida en línea ${i + 1}`);
      if (l.unitPrice < 0) return alert(`Precio inválido en línea ${i + 1}`);
      if (l.origin === 'encomienda' && !l.warehouseOrigin) return alert(`Falta bodega (encomienda) en línea ${i + 1}`);
      if (l.origin !== 'encomienda' && l.origin !== 'tienda') {
        if (!l.district || !l.district.trim()) return alert(`Falta distrito/zona en línea ${i + 1}`);
        if (l.district === 'Otro' && !l.notes?.trim()) return alert(`Especifica zona en “Notas” (línea ${i + 1})`);
      }
      // Teléfono
      const { val, error } = normalizeBoPhone(l.customerPhone || '');
      if (error) {
        updateLine(l.id, { phoneError: error });
        return alert(`Teléfono inválido en línea ${i + 1}: ${error}`);
      } else {
        updateLine(l.id, { customerPhone: val, phoneError: null });
      }
    }

    setSaving(true);
    setSavedOk(null);
    try {
      const rows = lines.map(l => ({
        origin: l.origin,
        warehouseOrigin: l.origin === 'encomienda' ? (l.warehouseOrigin as WarehouseKey) : null,
        district: l.origin !== 'encomienda' ? (l.district?.trim() || null) : null,
        productId: l.productId ?? null, // code si vino del autocomplete
        productName: l.productName,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        customerName: l.customerName,
        customerPhone: l.customerPhone, // ya normalizado
        notes: l.notes,
      }));

      const res = await fetch('/api/promoters/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promoterName, saleDate, lines: rows }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error al guardar');
      }
      setSavedOk('ok');
      setLines([emptyLine()]);
    } catch (e) {
      console.error(e);
      setSavedOk('err');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      <div className="relative max-w-7xl mx-auto p-6 space-y-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
              Registro de Ventas – Promotores
            </h1>
            <span className="text-xs uppercase tracking-widest text-gray-400">v1.8</span>
          </div>
        </header>

        {/* Meta */}
        <section className="grid md:grid-cols-3 gap-4">
          {/* Promotor */}
          <div className="bg-gray-900/70 border border-gray-700/40 rounded-xl p-4">
            <label className="block text-xs text-gray-400 mb-1">Promotor/a</label>
            <select
              value={promoterName}
              onChange={(e) => setPromoterName(e.target.value)}
              disabled={promotersLoading}
              className="w-full bg-black/30 border border-gray-700/40 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-60"
            >
              {promoters.map((p) => (
                <option key={p.name} value={p.name}>{p.name}</option>
              ))}
              {!promoters.length && <option value="">(Sin datos)</option>}
            </select>
            {!promotersLoading && !promoters.length && (
              <div className="text-[11px] text-amber-400 mt-2">
                No se encontraron promotores activos en <code>public.people</code>.
              </div>
            )}
          </div>

          {/* Fecha */}
          <div className="bg-gray-900/70 border border-gray-700/40 rounded-xl p-4">
            <label className="block text-xs text-gray-400 mb-1">Fecha de venta</label>
            <input
              type="date"
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
              className="w-full bg-black/30 border border-gray-700/40 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          <SummaryCard totalBs={totals.totalBs} items={totals.items} />
        </section>

        {/* Líneas */}
        <section className="space-y-4">
          {lines.map((line, idx) => {
            const needsWarehouse = line.origin === 'encomienda';
            const needsDistrict = line.origin !== 'encomienda' && line.origin !== 'tienda';
            const cityKey = line.origin as keyof typeof DISTRICTS_BY_CITY;
            const cityDistricts = needsDistrict ? (DISTRICTS_BY_CITY[cityKey] || []) : [];

            return (
              <motion.div key={line.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="bg-gray-900/70 border border-gray-700/40 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm text-gray-400">Venta #{idx + 1}</div>
                  <button
                    className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-300 border border-red-500/20 hover:bg-red-500/20 disabled:opacity-50"
                    onClick={() => removeLine(line.id)}
                    disabled={lines.length === 1}
                  >
                    Eliminar
                  </button>
                </div>

                <div className="grid md:grid-cols-12 gap-3">
                  {/* Origen */}
                  <div className="md:col-span-3">
                    <label className="block text-xs text-gray-400 mb-1">Origen / Sucursal</label>
                    <select
                      value={line.origin}
                      onChange={(e) => {
                        const value = e.target.value as OriginKey;
                        const patch: Partial<SaleLine> = { origin: value };
                        if (value === 'encomienda') {
                          patch.warehouseOrigin = null;
                          patch.district = '';
                        } else {
                          patch.warehouseOrigin = undefined;
                          patch.district = '';
                        }
                        updateLine(line.id, patch);
                        setOpenSuggest((p) => ({ ...p, [line.id]: false }));
                      }}
                      className="w-full bg-black/30 border border-gray-700/40 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                    >
                      {ORIGINS.map((o) => (
                        <option key={o.key} value={o.key}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Bodega de Origen (si encomienda) */}
                  {needsWarehouse && (
                    <div className="md:col-span-3">
                      <label className="block text-xs text-gray-400 mb-1">Bodega de origen</label>
                      <select
                        value={line.warehouseOrigin ?? ''}
                        onChange={(e) => updateLine(line.id, { warehouseOrigin: e.target.value as WarehouseKey })}
                        className="w-full bg-black/30 border border-gray-700/40 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                      >
                        <option value="" disabled>Selecciona bodega</option>
                        {WAREHOUSES.map(w => (
                          <option key={w.key} value={w.key}>{w.label}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Distrito/Zona (si no es encomienda/tienda) */}
                  {needsDistrict && (
                    <>
                      <div className="md:col-span-3">
                        <label className="block text-xs text-gray-400 mb-1">Distrito / Zona</label>
                        <select
                          value={line.district || ''}
                          onChange={(e) => updateLine(line.id, { district: e.target.value })}
                          className="w-full bg-black/30 border border-gray-700/40 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                        >
                          <option value="" disabled>Selecciona</option>
                          {cityDistricts.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      {line.district === 'Otro' && (
                        <div className="md:col-span-3">
                          <label className="block text-xs text-gray-400 mb-1">Especifica Distrito/Zona</label>
                          <input
                            value={line.notes || ''}
                            onChange={(e) => updateLine(line.id, { notes: e.target.value })}
                            placeholder="Ej: Zona X, Barrio Y"
                            className="w-full bg-black/30 border border-gray-700/40 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                          />
                          <div className="text-[11px] text-gray-500 mt-1">* Se guardará en “notes”.</div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Producto */}
                  <div className="md:col-span-4 relative">
                    <label className="block text-xs text-gray-400 mb-1">Producto</label>
                    <input
                      value={line.productName}
                      onChange={(e) => {
                        updateLine(line.id, { productName: e.target.value, productId: null });
                        setQueryByLine((prev) => ({ ...prev, [line.id]: e.target.value }));
                      }}
                      onFocus={() => {
                        const q = (queryByLine[line.id] || '').trim();
                        const has = (resultsByLine[line.id]?.length || 0) > 0;
                        if (q.length >= 3 && has) {
                          setOpenSuggest((p) => ({ ...p, [line.id]: true }));
                        }
                      }}
                      onBlur={() => {
                        setTimeout(() => setOpenSuggest((p) => ({ ...p, [line.id]: false })), 120);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setOpenSuggest((p) => ({ ...p, [line.id]: false }));
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                      placeholder="Escribe 3+ letras (ej. Aromatizante Avión)…"
                      className="w-full bg-black/30 border border-gray-700/40 rounded-t-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                    />

                    {openSuggest[line.id] && (resultsByLine[line.id]?.length ?? 0) > 0 && (
                      <div className="absolute z-50 left-0 right-0 max-h-56 overflow-auto bg-black/80 border-x border-b border-gray-700/50 rounded-b-lg backdrop-blur-sm">
                        {resultsByLine[line.id]!.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault(); // evita blur antes de seleccionar
                              updateLine(line.id, { productId: p.id, productName: p.name });
                              // Cerrar y "matar" la query para que no vuelva a abrir
                              setQueryByLine((prev) => ({ ...prev, [line.id]: '' }));
                              setResultsByLine((prev) => ({ ...prev, [line.id]: [] }));
                              setOpenSuggest((prev) => ({ ...prev, [line.id]: false }));
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-white/10 text-sm"
                          >
                            <div className="flex justify-between gap-2">
                              <div className="text-gray-200">
                                {p.name}
                                {p.code ? <span className="text-gray-500"> · {p.code}</span> : null}
                              </div>
                              <div className="text-xs text-gray-500">
                                {p.category || ''}{typeof p.stock === 'number' ? ` · stk ${p.stock}` : ''}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="text-[11px] text-gray-500 mt-1">
                      Si no aparece, déjalo escrito manual. No traemos precio desde la base.
                    </div>
                  </div>

                  {/* Cantidad */}
                  <div className="md:col-span-1">
                    <label className="block text-xs text-gray-400 mb-1">Cant.</label>
                    <input
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(e) => updateLine(line.id, { quantity: clampInt(e.target.value, 1) })}
                      className="w-full bg-black/30 border border-gray-700/40 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>

                  {/* Precio */}
                  <div className="md:col-span-2">
                    <label className="block text-xs text-gray-400 mb-1">Precio (Bs)</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={line.unitPrice}
                      onChange={(e) => updateLine(line.id, { unitPrice: clampNumber(e.target.value, 0) })}
                      className="w-full bg-black/30 border border-gray-700/40 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>

                  {/* Cliente / Teléfono */}
                  <div className="md:col-span-2">
                    <label className="block text-xs text-gray-400 mb-1">Cliente</label>
                    <input
                      value={line.customerName}
                      onChange={(e) => updateLine(line.id, { customerName: e.target.value })}
                      placeholder="Nombre del cliente"
                      className="w-full bg-black/30 border border-gray-700/40 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-gray-400 mb-1">WhatsApp (+591…)</label>
                    <input
                      inputMode="tel"
                      value={line.customerPhone}
                      onChange={(e) => {
                        // Permitimos solo dígitos y +
                        const raw = e.target.value.replace(/[^\d+]/g, '');
                        updateLine(line.id, { customerPhone: raw, phoneError: null });
                      }}
                      onBlur={(e) => {
                        const { val, error } = normalizeBoPhone(e.target.value);
                        updateLine(line.id, { customerPhone: val, phoneError: error });
                      }}
                      placeholder="+5917*******"
                      className={`w-full bg-black/30 border ${line.phoneError ? 'border-red-500/60' : 'border-gray-700/40'} rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ${line.phoneError ? 'focus:ring-red-500/30' : 'focus:ring-blue-500/30'}`}
                    />
                    {line.phoneError && (
                      <div className="text-[11px] text-red-400 mt-1">{line.phoneError}</div>
                    )}
                  </div>

                  {/* Notas */}
                  <div className="md:col-span-12">
                    <label className="block text-xs text-gray-400 mb-1">Notas (opcional)</label>
                    <input
                      value={line.notes || ''}
                      onChange={(e) => updateLine(line.id, { notes: e.target.value })}
                      placeholder="Referencia, color (rojo), etc."
                      className="w-full bg-black/30 border border-gray-700/40 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}

          <div className="flex items-center gap-3">
            <button
              onClick={() => setLines((prev) => [...prev, emptyLine()])}
              className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-sm"
            >
              + Agregar otra venta
            </button>
            <button
              onClick={handleSave}
              disabled={
                saving ||
                promotersLoading ||
                !promoterName ||
                lines.some(l => !!l.phoneError) // bloquea si hay error visible
              }
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm disabled:opacity-60"
            >
              {saving ? 'Guardando…' : 'Guardar ventas'}
            </button>
            {savedOk === 'ok' && <span className="text-green-400 text-sm">✓ Guardado</span>}
            {savedOk === 'err' && <span className="text-red-400 text-sm">✗ Error al guardar</span>}
          </div>
        </section>

        {/* Resumen visual */}
        <section className="grid md:grid-cols-2 gap-4">
          <div className="bg-gray-900/70 border border-gray-700/40 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white/90 mb-3">Conteo por origen</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {ORIGINS.map((o) => (
                <div key={o.key} className="rounded-lg bg-black/30 border border-gray-700/40 p-3">
                  <div className="text-xs text-gray-400">{o.label}</div>
                  <div className="text-xl font-semibold">{totals.countByOrigin[o.key]}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-900/70 border border-gray-700/40 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white/90 mb-1">Totales</h3>
            <div className="text-2xl font-semibold text-white">{totals.items} ítem(s)</div>
            <div className="text-sm text-gray-300">TOTAL Bs {formatMoney(totals.totalBs)}</div>
          </div>
        </section>

        <footer className="text-center text-gray-500 text-xs pt-4">Foco: registro limpio para cálculo posterior de comisiones.</footer>
      </div>
    </main>
  );

  function updateLine(id: string, patch: Partial<SaleLine>) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }
  function removeLine(id: string) {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }
}

function SummaryCard({ totalBs, items }: { totalBs: number; items: number }) {
  return (
    <div className="bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-gray-700/40 rounded-xl p-4">
      <div className="text-xs text-gray-400 mb-1">Resumen</div>
      <div className="text-2xl font-semibold text-white">{items} ítem(s)</div>
      <div className="text-sm text-gray-300">TOTAL Bs {formatMoney(totalBs)}</div>
    </div>
  );
}