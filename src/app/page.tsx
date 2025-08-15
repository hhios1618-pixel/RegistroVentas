'use client';

import { useEffect, useMemo, useState } from 'react';
import { 
  Flame, 
  Store, 
  User, 
  Package, 
  MapPin, 
  Phone, 
  DollarSign, 
  Hash, 
  Save, 
  Trash2, 
  Eye, 
  TrendingUp,
  Zap,
  CheckCircle,
  Calendar,
  BarChart3
} from 'lucide-react';

/** ===== Tipado ===== */
type SaleType = 'unidad' | 'mayor';
type LocalOption = 'La Paz' | 'Sucre' | 'CBBA' | 'Santa Cruz';

const LOCAL_OPTIONS: LocalOption[] = ['La Paz', 'Sucre', 'CBBA', 'Santa Cruz'];

type FormState = {
  type: SaleType;
  local: LocalOption | '';
  seller: string;
  product: string;
  destino: string;
  quantity: number;
  amount: string;
  commission: string;
  numero: string;
  sistema: boolean;
};

type SavedSale = {
  id: string;
  createdAt: string;
  payload: {
    type: SaleType;
    local: LocalOption;
    seller: string;
    product: string;
    destino: string;
    quantity: number;
    amount: number;
    commission: number;
    commission_amount: number;
    numero: string;
    sistema: boolean;
  };
};

/** ===== Utilidades ===== */
const money = (n: number) => (Math.round(n * 100) / 100).toFixed(2);
const clamp = (val: number, min: number, max: number) =>
  Math.max(min, Math.min(max, val));

export default function FenixStoreSalesForm() {
  const [form, setForm] = useState<FormState>({
    type: 'unidad',
    local: '',
    seller: '',
    product: '',
    destino: '',
    quantity: 1,
    amount: '',
    commission: '0.50',
    numero: '',
    sistema: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<SavedSale[]>([]);
  const [showPreview, setShowPreview] = useState(true);

  // Comisión calculada
  const commissionAmount = useMemo(() => {
    const amountNum = parseFloat(form.amount || '0');
    const commNum = parseFloat(form.commission || '0');
    if (isNaN(amountNum) || isNaN(commNum)) return '0.00';
    return money(amountNum * commNum);
  }, [form.amount, form.commission]);

  // Estadísticas del historial
  const stats = useMemo(() => {
    const totalSales = history.length;
    const totalAmount = history.reduce((sum, sale) => sum + sale.payload.amount, 0);
    const totalCommission = history.reduce((sum, sale) => sum + sale.payload.commission_amount, 0);
    return { totalSales, totalAmount, totalCommission };
  }, [history]);

  // Cargar historial desde localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('fenix_sales_history_v2');
      if (raw) setHistory(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  const persistHistory = (items: SavedSale[]) => {
    setHistory(items);
    try {
      localStorage.setItem('fenix_sales_history_v2', JSON.stringify(items));
    } catch {
      /* ignore */
    }
  };

  /** ===== Validación ===== */
  const validate = (): boolean => {
    const e: Record<string, string> = {};

    if (!form.local) e.local = 'Selecciona un local';
    if (!form.seller.trim()) e.seller = 'Requerido';
    if (!form.product.trim()) e.product = 'Requerido';
    if (!form.destino.trim()) e.destino = 'Requerido';

    if (!Number.isFinite(form.quantity) || form.quantity < 1) {
      e.quantity = 'Mínimo 1';
    } else if (form.type === 'unidad' && form.quantity > 5) {
      e.quantity = 'Para "unidades" máx. 5';
    }

    const amountNum = Number(form.amount);
    if (isNaN(amountNum) || amountNum < 0) e.amount = 'Monto inválido';

    const comNum = Number(form.commission);
    if (isNaN(comNum) || comNum < 0 || comNum > 1) e.commission = 'Debe estar entre 0 y 1';

    if (form.numero && form.numero.replace(/\D/g, '').length < 6) {
      e.numero = 'Muy corto';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /** ===== Submit ===== */
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!validate()) return;

    setSaving(true);
    window.setTimeout(() => {
      const payload: SavedSale['payload'] = {
        type: form.type,
        local: form.local as LocalOption,
        seller: form.seller.trim(),
        product: form.product.trim(),
        destino: form.destino.trim(),
        quantity: form.quantity,
        amount: Number(form.amount),
        commission: Number(form.commission),
        commission_amount: Number(commissionAmount),
        numero: form.numero.trim(),
        sistema: form.sistema,
      };

      const item: SavedSale = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        payload,
      };

      const next = [item, ...history].slice(0, 50);
      persistHistory(next);

      setMessage('¡Venta registrada exitosamente!');
      setSaving(false);
      setForm((s) => ({
        ...s,
        product: '',
        destino: '',
        amount: '',
        numero: '',
        sistema: false,
      }));

      setTimeout(() => setMessage(null), 3000);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-orange-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-cyan-500/10 rounded-full blur-2xl animate-ping"></div>
      </div>

      {/* Header con marca */}
      <header className="relative z-10 border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl blur opacity-75"></div>
                <div className="relative bg-gradient-to-r from-orange-500 to-red-500 p-3 rounded-xl">
                  <Flame className="w-8 h-8 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-400 via-red-400 to-yellow-400 bg-clip-text text-transparent">
                  FENIX STORE
                </h1>
                <p className="text-white/70 text-lg">Sistema de Registro de Ventas</p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-4">
              <div className="text-right">
                <div className="text-2xl font-bold text-white">{stats.totalSales}</div>
                <div className="text-sm text-white/60">Ventas Today</div>
              </div>
              <div className="w-px h-12 bg-white/20"></div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-400">Bs {money(stats.totalAmount)}</div>
                <div className="text-sm text-white/60">Total Revenue</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* Formulario Principal */}
          <div className="xl:col-span-2">
            <div className="bg-black/40 backdrop-blur-xl rounded-3xl border border-white/10 p-8 shadow-2xl">
              
              {/* Tipo de venta */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-orange-400" />
                  Tipo de Venta
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  {(['unidad', 'mayor'] as SaleType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() =>
                        setForm((s) => ({
                          ...s,
                          type: t,
                          quantity: t === 'unidad' ? clamp(s.quantity, 1, 5) : Math.max(1, s.quantity),
                        }))
                      }
                      className={`relative overflow-hidden p-4 rounded-2xl border transition-all duration-300 transform hover:scale-105 ${
                        form.type === t
                          ? 'bg-gradient-to-r from-orange-500/20 to-red-500/20 border-orange-500/50 shadow-lg shadow-orange-500/20'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-lg font-semibold text-white">
                          {t === 'unidad' ? 'Por Unidades' : 'Por Mayor'}
                        </div>
                        <div className="text-sm text-white/60 mt-1">
                          {t === 'unidad' ? '1–5 unidades' : 'Cantidad libre'}
                        </div>
                      </div>
                      {form.type === t && (
                        <div className="absolute top-2 right-2">
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={onSubmit} className="space-y-6">
                
                {/* Local y Vendedor */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-white">
                      <Store className="w-4 h-4 text-orange-400" />
                      Local / Sucursal
                    </label>
                    <div className="relative">
                      <select
                        value={form.local}
                        onChange={(e) => setForm((s) => ({ ...s, local: e.target.value as LocalOption | '' }))}
                        className={`w-full bg-black/60 border rounded-xl px-4 py-3 text-white placeholder-white/50 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 ${
                          errors.local ? 'border-red-500/50' : 'border-white/20'
                        }`}
                      >
                        <option value="" disabled className="text-gray-400">Selecciona un local…</option>
                        {LOCAL_OPTIONS.map((opt) => (
                          <option key={opt} value={opt} className="text-white bg-gray-800">{opt}</option>
                        ))}
                      </select>
                    </div>
                    {errors.local && <p className="text-red-400 text-xs flex items-center gap-1"><Zap className="w-3 h-3" />{errors.local}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-white">
                      <User className="w-4 h-4 text-orange-400" />
                      Vendedor
                    </label>
                    <input
                      value={form.seller}
                      onChange={(e) => setForm((s) => ({ ...s, seller: e.target.value }))}
                      placeholder="Nombre del vendedor"
                      className={`w-full bg-black/60 border rounded-xl px-4 py-3 text-white placeholder-white/50 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 ${
                        errors.seller ? 'border-red-500/50' : 'border-white/20'
                      }`}
                    />
                    {errors.seller && <p className="text-red-400 text-xs flex items-center gap-1"><Zap className="w-3 h-3" />{errors.seller}</p>}
                  </div>
                </div>

                {/* Producto */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-white">
                    <Package className="w-4 h-4 text-orange-400" />
                    Producto
                  </label>
                  <input
                    value={form.product}
                    onChange={(e) => setForm((s) => ({ ...s, product: e.target.value }))}
                    placeholder="Ej: Cinta 3M, Herramienta XYZ..."
                    className={`w-full bg-black/60 border rounded-xl px-4 py-3 text-white placeholder-white/50 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 ${
                      errors.product ? 'border-red-500/50' : 'border-white/20'
                    }`}
                  />
                  {errors.product && <p className="text-red-400 text-xs flex items-center gap-1"><Zap className="w-3 h-3" />{errors.product}</p>}
                </div>

                {/* Destino y Número */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-white">
                      <MapPin className="w-4 h-4 text-orange-400" />
                      Destino
                    </label>
                    <input
                      value={form.destino}
                      onChange={(e) => setForm((s) => ({ ...s, destino: e.target.value }))}
                      placeholder="Cbba, Alto, Yapacaní..."
                      className={`w-full bg-black/60 border rounded-xl px-4 py-3 text-white placeholder-white/50 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 ${
                        errors.destino ? 'border-red-500/50' : 'border-white/20'
                      }`}
                    />
                    {errors.destino && <p className="text-red-400 text-xs flex items-center gap-1"><Zap className="w-3 h-3" />{errors.destino}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-white">
                      <Phone className="w-4 h-4 text-orange-400" />
                      Número (cel/ID)
                    </label>
                    <input
                      value={form.numero}
                      onChange={(e) => setForm((s) => ({ ...s, numero: e.target.value }))}
                      placeholder="6780xxxx"
                      className={`w-full bg-black/60 border rounded-xl px-4 py-3 text-white placeholder-white/50 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 ${
                        errors.numero ? 'border-red-500/50' : 'border-white/20'
                      }`}
                    />
                    {errors.numero && <p className="text-red-400 text-xs flex items-center gap-1"><Zap className="w-3 h-3" />{errors.numero}</p>}
                  </div>
                </div>

                {/* Cantidad, Monto, Comisión */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-white">
                      <Hash className="w-4 h-4 text-orange-400" />
                      Cantidad
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={form.type === 'unidad' ? 5 : undefined}
                      value={form.quantity}
                      onChange={(e) =>
                        setForm((s) => ({
                          ...s,
                          quantity: clamp(Number(e.target.value || 1), 1, s.type === 'unidad' ? 5 : 999999),
                        }))
                      }
                      className={`w-full bg-black/60 border rounded-xl px-4 py-3 text-white placeholder-white/50 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 ${
                        errors.quantity ? 'border-red-500/50' : 'border-white/20'
                      }`}
                    />
                    {errors.quantity && <p className="text-red-400 text-xs flex items-center gap-1"><Zap className="w-3 h-3" />{errors.quantity}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-white">
                      <DollarSign className="w-4 h-4 text-orange-400" />
                      Total (Bs)
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      value={form.amount}
                      onChange={(e) => setForm((s) => ({ ...s, amount: e.target.value }))}
                      placeholder="50.00"
                      className={`w-full bg-black/60 border rounded-xl px-4 py-3 text-white placeholder-white/50 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 ${
                        errors.amount ? 'border-red-500/50' : 'border-white/20'
                      }`}
                    />
                    {errors.amount && <p className="text-red-400 text-xs flex items-center gap-1"><Zap className="w-3 h-3" />{errors.amount}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-white">
                      <BarChart3 className="w-4 h-4 text-orange-400" />
                      Comisión (0–1)
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      max="1"
                      value={form.commission}
                      onChange={(e) => setForm((s) => ({ ...s, commission: e.target.value }))}
                      placeholder="0.50"
                      className={`w-full bg-black/60 border rounded-xl px-4 py-3 text-white placeholder-white/50 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 ${
                        errors.commission ? 'border-red-500/50' : 'border-white/20'
                      }`}
                    />
                    {errors.commission && <p className="text-red-400 text-xs flex items-center gap-1"><Zap className="w-3 h-3" />{errors.commission}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-white">
                      <DollarSign className="w-4 h-4 text-green-400" />
                      Comisión calculada
                    </label>
                    <div className="relative">
                      <input
                        value={`Bs ${commissionAmount}`}
                        readOnly
                        className="w-full bg-green-500/20 border border-green-500/30 rounded-xl px-4 py-3 text-green-400 font-semibold"
                      />
                    </div>
                  </div>
                </div>

                {/* Sistema checkbox */}
                <div className="flex items-center gap-3 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                  <input
                    id="sistema"
                    type="checkbox"
                    checked={form.sistema}
                    onChange={(e) => setForm((s) => ({ ...s, sistema: e.target.checked }))}
                    className="w-5 h-5 accent-blue-500"
                  />
                  <label htmlFor="sistema" className="text-white font-medium select-none">
                    Marcado en sistema
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full relative overflow-hidden bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg shadow-orange-500/25"
                >
                  <div className="flex items-center justify-center gap-3">
                    {saving ? (
                      <>
                        <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                        Guardando venta...
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        Registrar Venta
                      </>
                    )}
                  </div>
                </button>

                {/* Success Message */}
                {message && (
                  <div className="flex items-center gap-3 p-4 bg-green-500/20 border border-green-500/30 rounded-xl animate-pulse">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span className="text-green-400 font-medium">{message}</span>
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* Panel Lateral */}
          <div className="space-y-6">
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/20 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold text-green-400">{stats.totalSales}</div>
                    <div className="text-green-300/80 text-sm">Total Ventas</div>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-400" />
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/20 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-blue-400">Bs {money(stats.totalAmount)}</div>
                    <div className="text-blue-300/80 text-sm">Revenue Total</div>
                  </div>
                  <DollarSign className="w-8 h-8 text-blue-400" />
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/20 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-purple-400">Bs {money(stats.totalCommission)}</div>
                    <div className="text-purple-300/80 text-sm">Comisiones</div>
                  </div>
                  <BarChart3 className="w-8 h-8 text-purple-400" />
                </div>
              </div>
            </div>

            {/* Preview Panel */}
            <div className="bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Eye className="w-5 h-5 text-orange-400" />
                  Vista Previa
                </h3>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-orange-400 hover:text-orange-300 transition-colors"
                >
                  {showPreview ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>

              {showPreview && (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/60">Tipo:</span>
                    <span className="text-white font-medium">
                      {form.type === 'unidad' ? 'Por unidades' : 'Por mayor'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Local:</span>
                    <span className="text-white font-medium">{form.local || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Vendedor:</span>
                    <span className="text-white font-medium">{form.seller || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Producto:</span>
                    <span className="text-white font-medium">{form.product || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Destino:</span>
                    <span className="text-white font-medium">{form.destino || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Cantidad:</span>
                    <span className="text-white font-medium">{form.quantity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Total:</span>
                    <span className="text-green-400 font-bold">Bs {form.amount || '0.00'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Comisión:</span>
                    <span className="text-orange-400 font-bold">Bs {commissionAmount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Sistema:</span>
                    <span className={`font-medium ${form.sistema ? 'text-green-400' : 'text-gray-400'}`}>
                      {form.sistema ? '✓ Sí' : '✗ No'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Historial */}
            <div className="bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-orange-400" />
                  Historial Reciente
                </h3>
                <button
                  onClick={() => persistHistory([])}
                  className="flex items-center gap-1 text-red-400 hover:text-red-300 transition-colors text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  Limpiar
                </button>
              </div>

              <div className="max-h-80 overflow-auto space-y-3">
                {history.length === 0 ? (
                  <div className="text-center py-8 text-white/50">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No hay ventas registradas aún</p>
                  </div>
                ) : (
                  history.slice(0, 10).map((sale) => (
                    <div key={sale.id} className="bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${sale.payload.type === 'unidad' ? 'bg-blue-400' : 'bg-purple-400'}`}></div>
                          <span className="text-white font-medium text-sm">{sale.payload.product}</span>
                        </div>
                        <span className="text-green-400 font-bold text-sm">Bs {money(sale.payload.amount)}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs text-white/70">
                        <div>
                          <span className="text-white/50">Local:</span> {sale.payload.local}
                        </div>
                        <div>
                          <span className="text-white/50">Cant:</span> {sale.payload.quantity}
                        </div>
                        <div>
                          <span className="text-white/50">Vendedor:</span> {sale.payload.seller}
                        </div>
                        <div>
                          <span className="text-white/50">Destino:</span> {sale.payload.destino}
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center mt-3 pt-2 border-t border-white/10">
                        <span className="text-xs text-white/50">
                          {new Date(sale.createdAt).toLocaleString('es-BO', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-orange-400">
                            Com: Bs {money(sale.payload.commission_amount)}
                          </span>
                          {sale.payload.sistema && (
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {history.length > 10 && (
                <div className="mt-4 text-center">
                  <button className="text-orange-400 hover:text-orange-300 text-sm transition-colors">
                    Ver más ({history.length - 10} adicionales)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer informativo */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-black/40 backdrop-blur-xl rounded-full border border-white/10">
            <Zap className="w-4 h-4 text-orange-400" />
            <span className="text-white/70 text-sm">
              Sistema local. Próximamente: integración con Supabase y dashboard avanzado
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}