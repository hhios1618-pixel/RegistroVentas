'use client';

import { useState, useMemo } from 'react';
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
  id: string;
  code: string;
  name: string;
  stock: number;
}

interface SaleLine {
  product_id: string | null;
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
  const [saleDate, setSaleDate] = useState<string>(
    new Date().toISOString().slice(0, 10),
  );
  const [origin, setOrigin] = useState<Origin>('santacruz');
  const [warehouse, setWarehouse] = useState<string>('');

  // Línea en edición
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProductRow[]>([]);
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
    [lines],
  );

  // Buscar productos
  const searchProducts = async (q: string) => {
    setQuery(q);
    if (q.length < 3) {
      setResults([]);
      return;
    }
    const { data } = await supabase
      .from('products')
      .select('id, code, name, stock')
      .ilike('name', `%${q}%`)
      .limit(5);
    setResults(data || []);
  };

  // Agregar línea
  const addLine = () => {
    if (!productName || quantity <= 0 || unitPrice <= 0) return;
    setLines((prev) => [
      ...prev,
      {
        product_id: null,
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

  // Guardar
  const saveAll = async () => {
    if (lines.length === 0) return;
    setSaving(true);

    const payload = lines.map((l) => ({
      promoter_name: promoterName,
      sale_date: saleDate,
      origin,
      product_id: l.product_id,
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

  if (meLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-700"></div>
            <span className="text-slate-600 font-medium">Cargando sistema...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-red-200">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Acceso Denegado</h3>
            <p className="text-slate-600">No tienes permisos para acceder a esta sección.</p>
          </div>
        </div>
      </div>
    );
  }

  // ==================
  // Render
  // ==================
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-8">
          <div className="px-6 py-8 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Sistema de Registro de Ventas</h1>
                <p className="text-slate-600">Gestiona y registra las ventas de manera eficiente</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm text-slate-500 mb-1">Usuario activo</p>
                  <p className="font-semibold text-slate-900">{promoterName}</p>
                </div>
                <div className="w-12 h-12 bg-slate-700 text-white font-bold rounded-xl flex items-center justify-center text-lg">
                  {initials}
                </div>
              </div>
            </div>
          </div>

          {/* Configuración de venta */}
          <div className="px-6 py-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Configuración de Venta</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Fecha de venta</label>
                <input
                  type="date"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all duration-200 text-slate-900"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Ciudad de origen</label>
                <select
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value as Origin)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all duration-200 text-slate-900"
                >
                  <option value="santacruz">Santa Cruz</option>
                  <option value="lapaz">La Paz</option>
                  <option value="elalto">El Alto</option>
                  <option value="cochabamba">Cochabamba</option>
                  <option value="sucre">Sucre</option>
                  <option value="tienda">Tienda</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Bodega de origen</label>
                <input
                  type="text"
                  value={warehouse}
                  onChange={(e) => setWarehouse(e.target.value)}
                  placeholder="Especifica la bodega (opcional)"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all duration-200 text-slate-900 placeholder-slate-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Formulario de línea */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-8">
          <div className="px-6 py-6 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Agregar Producto</h2>
            <p className="text-slate-600 mt-1">Completa los detalles del producto para añadirlo a la venta</p>
          </div>
          
          <div className="px-6 py-6">
            {/* Primera fila - Producto y cantidades */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="md:col-span-2 space-y-2 relative">
                <label className="block text-sm font-medium text-slate-700">Producto</label>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => searchProducts(e.target.value)}
                  placeholder="Buscar producto (mín. 3 caracteres)..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all duration-200 text-slate-900 placeholder-slate-400"
                />
                {results.length > 0 && (
                  <div className="absolute z-50 w-full bg-white border border-slate-300 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                    {results.map((r) => (
                      <div
                        key={r.id}
                        className="p-4 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0 transition-colors duration-200"
                        onClick={() => {
                          setProductName(r.name);
                          setQuery(r.name);
                          setResults([]);
                        }}
                      >
                        <div className="font-medium text-slate-900">{r.name}</div>
                        <div className="text-sm text-slate-500">Stock disponible: {r.stock} unidades</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Cantidad</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  min="1"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all duration-200 text-slate-900"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Precio unitario (Bs.)</label>
                <input
                  type="number"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all duration-200 text-slate-900"
                />
              </div>
            </div>

            {/* Segunda fila - Información del cliente */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Nombre del cliente</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nombre completo (opcional)"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all duration-200 text-slate-900 placeholder-slate-400"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Teléfono de contacto</label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Número de teléfono (opcional)"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all duration-200 text-slate-900 placeholder-slate-400"
                />
              </div>
            </div>

            {/* Tercera fila - Información adicional */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Notas adicionales</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observaciones o comentarios (opcional)"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all duration-200 text-slate-900 placeholder-slate-400"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Distrito / Zona</label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="Ubicación de entrega (opcional)"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all duration-200 text-slate-900 placeholder-slate-400"
                />
              </div>
            </div>

            {/* Botón para agregar */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-200">
              <div className="text-sm text-slate-500">
                {productName && quantity > 0 && unitPrice > 0 && (
                  <span>Subtotal: <span className="font-semibold text-slate-900">Bs. {(quantity * unitPrice).toFixed(2)}</span></span>
                )}
              </div>
              <button
                onClick={addLine}
                disabled={!productName || quantity <= 0 || unitPrice <= 0}
                className="px-6 py-3 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 disabled:bg-slate-400 disabled:cursor-not-allowed transition-all duration-200 focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
              >
                Agregar al Registro
              </button>
            </div>
          </div>
        </div>

        {/* Tabla de líneas */}
        {lines.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-8">
            <div className="px-6 py-6 border-b border-slate-200">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Resumen de Venta</h2>
                  <p className="text-slate-600 mt-1">{lines.length} productos registrados</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-500">Total de la venta</p>
                  <p className="text-2xl font-bold text-slate-900">Bs. {total.toFixed(2)}</p>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">Producto</th>
                    <th className="text-center px-6 py-4 text-sm font-semibold text-slate-900">Cantidad</th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-slate-900">Precio Unit.</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">Cliente</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">Teléfono</th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-slate-900">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {lines.map((l, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors duration-200">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{l.product_name}</div>
                        {l.notes && <div className="text-sm text-slate-500 mt-1">{l.notes}</div>}
                      </td>
                      <td className="px-6 py-4 text-center text-slate-900">{l.quantity}</td>
                      <td className="px-6 py-4 text-right text-slate-900">Bs. {l.unit_price.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <div className="text-slate-900">{l.customer_name || '-'}</div>
                        {l.district && <div className="text-sm text-slate-500 mt-1">{l.district}</div>}
                      </td>
                      <td className="px-6 py-4 text-slate-900">{l.customer_phone || '-'}</td>
                      <td className="px-6 py-4 text-right font-semibold text-slate-900">
                        Bs. {(l.quantity * l.unit_price).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Botón de guardar */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="px-6 py-6">
            <div className="flex justify-between items-center">
              <div className="text-slate-600">
                {lines.length === 0 ? 'No hay productos en el registro' : `${lines.length} productos listos para guardar`}
              </div>
              <button
                onClick={saveAll}
                disabled={saving || lines.length === 0}
                className="px-8 py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-all duration-200 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 flex items-center space-x-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Guardar Registro</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}