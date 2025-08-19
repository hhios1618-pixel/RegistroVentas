'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import supabase from '@/lib/supabaseClient'; // ✅ default import del cliente del navegador
import {
  CheckCircle, DollarSign, Hash, Lock, MapPin, Package, Phone, Save, Store, Unlock, User, Zap, Plus, X
} from 'lucide-react';

type SaleType = 'unidad' | 'mayor';
type LocalOption = 'La Paz' | 'El Alto' | 'Cochabamba' | 'Santa Cruz' | 'Sucre';
type Role = 'ASESOR' | 'PROMOTOR';

type Person = { full_name: string; role: Role; local: LocalOption | null };
type Product = { code: string; name: string; retail_price: number | null; wholesale_price: number | null; stock: number };

type Item = {
  key: string;
  productQuery: string;
  code?: string | null;
  name?: string | null;
  quantity: number;
  unit_price: string; // string para input controlado
  hints?: Product[];
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const money = (n: number) => (Math.round(n * 100) / 100).toFixed(2);

export default function SalesPage() {
  // encabezado
  const [type, setType] = useState<SaleType>('unidad');
  const [local, setLocal] = useState<LocalOption | ''>('');
  const [lockLocal, setLockLocal] = useState(true);

  // vendedor
  const [seller, setSeller] = useState('');
  const [sellerQuery, setSellerQuery] = useState('');
  const [sellerRole, setSellerRole] = useState<Role | ''>('');

  // datos cliente + envío
  const [destino, setDestino] = useState('');
  const [customerId, setCustomerId] = useState('');         // CI/NIT
  const [numero, setNumero] = useState('');                 // cel

  // NUEVOS (para logística / entrega)
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'' | 'EFECTIVO' | 'QR' | 'TRANSFERENCIA'>('');
  const [deliveryDate, setDeliveryDate] = useState('');     // YYYY-MM-DD
  const [deliveryFrom, setDeliveryFrom] = useState('');     // HH:mm
  const [deliveryTo, setDeliveryTo] = useState('');         // HH:mm
  const [address, setAddress] = useState('');               // dirección/referencia
  const [notes, setNotes] = useState('');                   // instrucciones

  // vendedores (people)
  const [sellerOptions, setSellerOptions] = useState<Person[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('people')
        .select('full_name, role, local')
        .eq('active', true)
        .order('full_name', { ascending: true });
      setSellerOptions((data ?? []) as Person[]);
    })();
  }, []);

  const onPickSeller = (name: string) => {
    const p = sellerOptions.find(s => s.full_name === name);
    setSeller(name);
    setSellerRole((p?.role as Role) || '');
    if (p?.local) {
      setLocal(p.local);
      setLockLocal(true);
    }
    setSellerQuery('');
  };

  // items
  const emptyItem = (): Item => ({ key: crypto.randomUUID(), productQuery: '', code: null, name: null, quantity: 1, unit_price: '' });
  const [items, setItems] = useState<Item[]>([emptyItem()]);
  const addItem = () => { if (items.length < 10) setItems(prev => [...prev, emptyItem()]); };
  const removeItem = (key: string) => setItems(prev => prev.filter(i => i.key !== key));

  // búsqueda de productos (debounced por fila)
  const timers = useRef<Record<string, any>>({});
  const searchProducts = (rowKey: string, q: string) => {
    if (timers.current[rowKey]) clearTimeout(timers.current[rowKey]);
    timers.current[rowKey] = setTimeout(async () => {
      if (!q || q.trim().length < 2) {
        setItems(prev => prev.map(i => i.key === rowKey ? { ...i, hints: [] } : i));
        return;
      }
      const { data } = await supabase
        .from('products')
        .select('code,name,retail_price,wholesale_price,stock')
        .or(`code.ilike.%${q}%,name.ilike.%${q}%`)
        .limit(12);
      setItems(prev => prev.map(i => i.key === rowKey ? { ...i, hints: (data || []) as Product[] } : i));
    }, 200);
  };

  const pickProduct = (rowKey: string, p: Product) => {
    const base = (type === 'unidad' ? (p.retail_price ?? 0) : (p.wholesale_price ?? p.retail_price ?? 0)) || 0;
    setItems(prev => prev.map(i => i.key === rowKey
      ? { ...i, productQuery: `${p.code} — ${p.name}`, code: p.code, name: p.name, unit_price: base ? money(base) : i.unit_price, hints: [] }
      : i
    ));
  };

  // totales
  const subTotals = items.map(it => {
    const q = Number(it.quantity || 0);
    const up = Number(String(it.unit_price || '0').replace(',', '.'));
    return !isNaN(q) && !isNaN(up) ? q * up : 0;
  });
  const grandTotal = subTotals.reduce((a, b) => a + b, 0);

  // validación + guardar
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!seller.trim()) e.seller = 'Selecciona un vendedor';
    if (!local) e.local = 'Selecciona un local';
    if (!destino.trim()) e.destino = 'Requerido';
    if (!customerId.trim()) e.customerId = 'ID cliente requerido';
    if (!customerName.trim()) e.customerName = 'Nombre del cliente requerido';
    if (numero && numero.replace(/\D/g, '').length < 6) e.numero = 'Número muy corto';
    if (items.length === 0) e.items = 'Agrega al menos un producto';
    items.forEach((it, idx) => {
      if (!(it.code || it.name || it.productQuery.trim())) e[`item_${idx}_product`] = 'Producto requerido';
      if (!Number.isFinite(it.quantity) || it.quantity < 1) e[`item_${idx}_qty`] = 'Cantidad inválida';
      const up = Number(String(it.unit_price).replace(',', '.'));
      if (isNaN(up) || up < 0) e[`item_${idx}_price`] = 'Precio inválido';
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setMessage(null);
    if (!validate()) return;
    setSaving(true);

    const payload = {
      sale_type: type,
      local,
      seller,
      seller_role: sellerRole || null,
      destino,
      customer_id: customerId,
      customer_phone: numero || null,
      numero,

      customer_name: customerName,
      payment_method: paymentMethod || null,
      address: address || null,
      notes: notes || null,
      delivery_date: deliveryDate || null,
      delivery_from: deliveryFrom || null,
      delivery_to: deliveryTo || null,

      items: items.map(it => ({
        product_code: it.code || null,
        product_name: it.name || it.productQuery.trim(),
        quantity: it.quantity,
        unit_price: Number(String(it.unit_price).replace(',', '.')),
      })),
    };

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const txt = await res.text();
      setSaving(false);
      setMessage(`Error: ${txt || 'no se pudo guardar'}`);
      return;
    }

    setSaving(false);
    setMessage('¡Venta registrada!');
    setItems([emptyItem()]);
    setDestino(''); setCustomerId(''); setNumero('');
    setCustomerName(''); setPaymentMethod(''); setDeliveryDate('');
    setDeliveryFrom(''); setDeliveryTo(''); setAddress(''); setNotes('');
    setTimeout(() => setMessage(null), 3000);
  };

  // UI
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <header className="relative z-10 border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 via-red-400 to-yellow-400 bg-clip-text text-transparent">
            Registro de Ventas (Multi-producto)
          </h1>
          <p className="text-white/60 text-sm">Hasta 10 ítems por venta. Total automático.</p>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-6 py-8">
        <form onSubmit={onSubmit} className="bg-black/40 backdrop-blur-xl rounded-3xl border border-white/10 p-8 shadow-2xl space-y-8">

          {/* Tipo */}
          <div className="grid grid-cols-2 gap-3">
            {(['unidad', 'mayor'] as SaleType[]).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`p-4 rounded-2xl border transition-all ${
                  type === t ? 'bg-gradient-to-r from-orange-500/20 to-red-500/20 border-orange-500/50'
                              : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="text-center">
                  <div className="text-white font-semibold">{t === 'unidad' ? 'Por Unidades' : 'Por Mayor'}</div>
                  <div className="text-white/60 text-xs">{t === 'unidad' ? '1–5 unidades por ítem' : 'Cantidad libre'}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Vendedor + Local */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-white">
                <User className="w-4 h-4 text-orange-400" /> Vendedor
              </label>
              <input
                value={sellerQuery}
                onChange={(e) => { setSellerQuery(e.target.value); setSeller(''); }}
                placeholder="Escribe 2+ caracteres para buscar…"
                className={`w-full bg-black/60 border rounded-xl px-4 py-3 text-white placeholder-white/50 ${errors.seller ? 'border-red-500/50' : 'border-white/20'}`}
              />
              {sellerQuery.trim().length >= 2 && (
                <div className="mt-2 bg-black/70 border border-white/10 rounded-xl max-h-52 overflow-auto">
                  {sellerOptions
                    .filter(p => p.full_name.toLowerCase().includes(sellerQuery.toLowerCase()))
                    .slice(0, 10)
                    .map(p => (
                      <button
                        key={p.full_name}
                        type="button"
                        onClick={() => onPickSeller(p.full_name)}
                        className="w-full text-left px-3 py-2 hover:bg-white/10 text-white/90"
                      >
                        {p.full_name} <span className="text-xs text-white/50">({p.role}{p.local ? ` · ${p.local}` : ''})</span>
                      </button>
                    ))}
                  <button
                    type="button"
                    onClick={() => {
                      setSeller(sellerQuery.trim());
                      setSellerRole('');
                      alert('ATENCIÓN: “Otros (manual)”. Revisa en dashboard antes de pagar comisión.');
                      setSellerQuery('');
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-white/10 text-amber-300"
                  >
                    Usar “{sellerQuery.trim()}” (Otros)
                  </button>
                </div>
              )}
              {seller && <div className="text-xs text-white/70">Seleccionado: <span className="text-white">{seller}</span> {sellerRole ? <span className="text-white/50">· {sellerRole}</span> : null}</div>}
              {errors.seller && <p className="text-red-400 text-xs flex items-center gap-1"><Zap className="w-3 h-3" /> {errors.seller}</p>}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-medium text-white">
                  <Store className="w-4 h-4 text-orange-400" /> Local / Sucursal
                </label>
                <button type="button" onClick={() => setLockLocal(v => !v)} className="text-xs text-white/70 hover:text-white flex items-center gap-1">
                  {lockLocal ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                  {lockLocal ? 'Bloqueado' : 'Editable'}
                </button>
              </div>
              <select
                value={local}
                disabled={lockLocal}
                onChange={(e) => setLocal(e.target.value as LocalOption)}
                className={`w-full bg-black/60 border rounded-xl px-4 py-3 text-white ${errors.local ? 'border-red-500/50' : 'border-white/20'} ${lockLocal ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                <option value="" disabled>Selecciona…</option>
                {(['La Paz','El Alto','Cochabamba','Santa Cruz','Sucre'] as LocalOption[]).map(l => (
                  <option key={l} value={l} className="text-white bg-gray-800">{l}</option>
                ))}
              </select>
              {errors.local && <p className="text-red-400 text-xs flex items-center gap-1"><Zap className="w-3 h-3" /> {errors.local}</p>}
            </div>
          </div>

          {/* Destino + Cliente + Número */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-white"><MapPin className="w-4 h-4 text-orange-400" /> Destino</label>
              <input value={destino} onChange={(e) => setDestino(e.target.value)} placeholder="Cbba, Alto, Yapacaní…" className={`w-full bg-black/60 border rounded-xl px-4 py-3 text-white placeholder-white/50 ${errors.destino ? 'border-red-500/50' : 'border-white/20'}`} />
              {errors.destino && <p className="text-red-400 text-xs flex items-center gap-1"><Zap className="w-3 h-3" /> {errors.destino}</p>}
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-white"><User className="w-4 h-4 text-orange-400" /> ID del Cliente (CI/NIT)</label>
              <input value={customerId} onChange={(e) => setCustomerId(e.target.value)} placeholder="Ej: 7894561 o NIT" className={`w-full bg-black/60 border rounded-xl px-4 py-3 text-white placeholder-white/50 ${errors.customerId ? 'border-red-500/50' : 'border-white/20'}`} />
              {errors.customerId && <p className="text-red-400 text-xs flex items-center gap-1"><Zap className="w-3 h-3" /> {errors.customerId}</p>}
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-white"><Phone className="w-4 h-4 text-orange-400" /> Número (cel/ID)</label>
              <input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="6780xxxx" className={`w-full bg-black/60 border rounded-xl px-4 py-3 text-white placeholder-white/50 ${errors.numero ? 'border-red-500/50' : 'border-white/20'}`} />
              {errors.numero && <p className="text-red-400 text-xs flex items-center gap-1"><Zap className="w-3 h-3" /> {errors.numero}</p>}
            </div>
          </div>

          {/* Entrega & pago */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Nombre del cliente</label>
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Luis Guardia"
                className={`w-full bg-black/60 border rounded-xl px-4 py-3 text-white placeholder-white/50 ${errors.customerName ? 'border-red-500/50' : 'border-white/20'}`}
              />
              {errors.customerName && <p className="text-red-400 text-xs flex items-center gap-1"><Zap className="w-3 h-3" /> {errors.customerName}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Forma de pago</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full bg-black/60 border border-white/20 rounded-xl px-4 py-3 text-white"
              >
                <option value="">Selecciona…</option>
                <option value="EFECTIVO">EFECTIVO</option>
                <option value="QR">QR</option>
                <option value="TRANSFERENCIA">TRANSFERENCIA</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Fecha de entrega</label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full bg-black/60 border border-white/20 rounded-xl px-4 py-3 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Ventana (desde)</label>
              <input
                type="time"
                value={deliveryFrom}
                onChange={(e) => setDeliveryFrom(e.target.value)}
                className="w-full bg-black/60 border border-white/20 rounded-xl px-4 py-3 text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Ventana (hasta)</label>
              <input
                type="time"
                value={deliveryTo}
                onChange={(e) => setDeliveryTo(e.target.value)}
                className="w-full bg-black/60 border border-white/20 rounded-xl px-4 py-3 text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Dirección / referencia</label>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="4to anillo y Av. Banzer, atrás del Mall Las Brisas"
                className="w-full bg-black/60 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white">Instrucciones</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Llamar al cliente cuando estén cerca"
              className="w-full bg-black/60 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50"
              rows={3}
            />
          </div>

          {/* Ítems */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-white/90 font-semibold">Productos</h3>
              <button type="button" onClick={addItem} disabled={items.length >= 10} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white disabled:opacity-40">
                <Plus className="w-4 h-4" /> Agregar producto ({items.length}/10)
              </button>
            </div>

            <div className="rounded-xl border border-white/10 overflow-hidden">
              <div className="grid grid-cols-12 bg-white/5 px-3 py-2 text-xs text-white/60">
                <div className="col-span-1">#</div>
                <div className="col-span-5">Producto (código o nombre)</div>
                <div className="col-span-2 flex items-center gap-1"><Hash className="w-3 h-3" /> Cantidad</div>
                <div className="col-span-2 flex items-center gap-1"><DollarSign className="w-3 h-3" /> Precio</div>
                <div className="col-span-1">Subt.</div>
                <div className="col-span-1"></div>
              </div>

              {items.map((it, idx) => {
                const subtotal = subTotals[idx] || 0;
                const itErrors = { product: errors[`item_${idx}_product`], qty: errors[`item_${idx}_qty`], price: errors[`item_${idx}_price`] };
                return (
                  <div key={it.key} className="border-t border-white/10 px-3 py-3 grid grid-cols-12 gap-2 items-start bg-black/30">
                    <div className="col-span-1 text-white/60">{idx + 1}</div>

                    <div className="col-span-5">
                      <input
                        value={it.productQuery}
                        onChange={(e) => {
                          const v = e.target.value;
                          setItems(prev => prev.map(r => r.key === it.key ? { ...r, productQuery: v, code: null, name: null } : r));
                          searchProducts(it.key, v);
                        }}
                        placeholder="Escribe 2+ letras para buscar…"
                        className={`w-full bg-black/60 border rounded-xl px-3 py-2 text-white placeholder-white/50 ${itErrors.product ? 'border-red-500/50' : 'border-white/20'}`}
                      />
                      {!!it.hints && it.hints.length > 0 && (
                        <div className="mt-2 bg-black/70 border border-white/10 rounded-xl max-h-52 overflow-auto">
                          {it.hints.map(p => {
                            const base = (type === 'unidad' ? (p.retail_price ?? 0) : (p.wholesale_price ?? p.retail_price ?? 0)) || 0;
                            return (
                              <button key={p.code} type="button" onClick={() => pickProduct(it.key, p)} className="w-full text-left px-3 py-2 hover:bg-white/10 text-white/90">
                                <div className="flex justify-between">
                                  <span>{p.code} — {p.name}</span>
                                  <span className="text-white/60">Bs {money(base)} · stk {p.stock}</span>
                                </div>
                              </button>
                            );
                          })}
                          <button
                            type="button"
                            onClick={() => {
                              alert('ATENCIÓN: “Producto manual (otros)”. Verifica luego en catálogo/stock.');
                              setItems(prev => prev.map(r => r.key === it.key ? { ...r, code: null, name: it.productQuery.trim(), hints: [] } : r));
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-white/10 text-amber-300"
                          >
                            Usar texto ingresado (Otros)
                          </button>
                        </div>
                      )}
                      {itErrors.product && <p className="text-red-400 text-xs flex items-center gap-1 mt-1"><Zap className="w-3 h-3" /> {itErrors.product}</p>}
                    </div>

                    <div className="col-span-2">
                      <input
                        type="number"
                        min={1}
                        max={type === 'unidad' ? 5 : undefined}
                        value={it.quantity}
                        onChange={(e) => {
                          const v = clamp(Number(e.target.value || 1), 1, type === 'unidad' ? 5 : 999999);
                          setItems(prev => prev.map(r => r.key === it.key ? { ...r, quantity: v } : r));
                        }}
                        className={`w-full bg-black/60 border rounded-xl px-3 py-2 text-white ${itErrors.qty ? 'border-red-500/50' : 'border-white/20'}`}
                      />
                      {itErrors.qty && <p className="text-red-400 text-xs flex items-center gap-1 mt-1"><Zap className="w-3 h-3" /> {itErrors.qty}</p>}
                    </div>

                    <div className="col-span-2">
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        value={it.unit_price}
                        onChange={(e) => setItems(prev => prev.map(r => r.key === it.key ? { ...r, unit_price: e.target.value } : r))}
                        placeholder="0.00"
                        className={`w-full bg-black/60 border rounded-xl px-3 py-2 text-white placeholder-white/50 ${itErrors.price ? 'border-red-500/50' : 'border-white/20'}`}
                      />
                      {itErrors.price && <p className="text-red-400 text-xs flex items-center gap-1 mt-1"><Zap className="w-3 h-3" /> {itErrors.price}</p>}
                    </div>

                    <div className="col-span-1 text-green-400 font-semibold mt-2 md:mt-0">Bs {money(subtotal)}</div>

                    <div className="col-span-1">
                      <button type="button" onClick={() => removeItem(it.key)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white" title="Eliminar fila">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {errors.items && <p className="text-red-400 text-xs flex items-center gap-1"><Zap className="w-3 h-3" /> {errors.items}</p>}
          </div>

          {/* Total + Submit */}
          <div className="flex items-center justify-between">
            <div className="text-xl md:text-2xl font-bold text-green-400">Total: Bs {money(grandTotal)}</div>
            <button
              type="submit"
              disabled={saving}
              className="relative overflow-hidden bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-3 px-6 rounded-2xl transition-all disabled:opacity-50"
            >
              <div className="flex items-center justify-center gap-3">
                {saving ? (
                  <>
                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                    Guardando…
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Registrar Venta
                  </>
                )}
              </div>
            </button>
          </div>

          {message && (
            <div className="flex items-center gap-3 p-4 bg-green-500/20 border border-green-500/30 rounded-xl">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-green-400 font-medium">{message}</span>
            </div>
          )}
        </form>
      </main>
    </div>
  );
}