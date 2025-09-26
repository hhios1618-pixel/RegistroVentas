'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Textarea } from '@/components/Textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Label } from '@/components/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/select';
import { Separator } from '@/components/separator';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2, Plus, Trash2, Search, CheckCircle, XCircle,
  AlertTriangle, ArrowRight, Upload, User, CreditCard, Truck, ClipboardPaste, PackageSearch, Check
} from 'lucide-react';

type ProductSearchResult = { name: string; code: string; image_url?: string | null };
type PaymentMethod = { method: 'EFECTIVO' | 'QR' | 'TRANSFERENCIA'; amount: number };

type DisplayOrderItem = {
  product_name: string;
  quantity: number;
  unit_price: number;
  product_code?: string | null;
  sale_type?: 'WHOLESALE' | 'RETAIL';
  image_url?: string | null;
  is_uploading_image?: boolean;
  is_recognized?: boolean | null;
  original_name?: string;
  similar_options: ProductSearchResult[];
};

type PartialOrder = {
  items: DisplayOrderItem[];
  is_encomienda: boolean;
  address: string;
  normalized_address: string | null;
  address_url: string;
  lat?: number;
  lng?: number;
  destino: string;
  delivery_date: string;
  delivery_from: string;
  delivery_to: string;
  notes: string;
  customer_name: string;
  customer_id: string;
  customer_phone: string;
  payments: PaymentMethod[];
  seller_name: string;
};

const formatDate = (date: Date): string => date.toISOString().split('T')[0];
const formatTime = (date: Date): string => date.toTimeString().slice(0, 5);

const getInitialOrderState = (sellerName = 'Vendedor'): PartialOrder => {
  const now = new Date();
  const oneHour = new Date(now.getTime() + 60 * 60 * 1000);
  return {
    items: [],
    is_encomienda: false,
    address: '',
    normalized_address: null,
    address_url: '',
    destino: '',
    delivery_date: formatDate(now),
    delivery_from: formatTime(now),
    delivery_to: formatTime(oneHour),
    notes: '',
    customer_name: '',
    customer_id: '',
    customer_phone: '',
    payments: [],
    seller_name: sellerName,
  };
};

const normalizePhone = (phone: string) => {
  const cleaned = (phone || '').replace(/\D/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('591')) return cleaned;
  if (cleaned.length === 8 && (cleaned.startsWith('6') || cleaned.startsWith('7'))) return `591${cleaned}`;
  return cleaned;
};

function debounce<F extends (...args: any[]) => void>(fn: F, delay = 300) {
  let t: any;
  return (...args: Parameters<F>) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

export default function CapturaPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [order, setOrder] = useState<PartialOrder>(getInitialOrderState());
  const [productInput, setProductInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeMsg, setGeocodeMsg] = useState<{ ok: boolean; msg: string } | null>(null);

  // ---- CARGA VENDEDOR ----
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/endpoints/me', { cache: 'no-store' });
        const d = await r.json();
        if (!r.ok || !d?.ok) throw new Error(d?.error || 'Sesión inválida');
        setOrder(p => ({ ...p, seller_name: d.full_name || 'Vendedor' }));
      } catch {
        setOrder(p => ({ ...p, seller_name: 'Vendedor' }));
      }
    })();
  }, []);

  // ---- MAP SEARCH RESPONSE ----
  const mapSearchResponse = (j: any): ProductSearchResult[] => {
    const arr = j?.results || j?.items || j || [];
    return (Array.isArray(arr) ? arr : []).map((x: any) => ({
      name: x.name || x.product_name || x.title || '',
      code: x.code || x.sku || x.id || '',
      image_url: x.image_url || x.thumbnail || null,
    })).filter((x: ProductSearchResult) => x.name);
  };

  // ---- INVENTORY SEARCH ----
  const fetchSimilar = useCallback(async (term: string): Promise<ProductSearchResult[]> => {
    const q = (term || '').trim();
    if (q.length < 2) return [];
    try {
      const r = await fetch(`/endpoints/products/search?q=${encodeURIComponent(q)}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'Error buscando en inventario');
      return mapSearchResponse(j);
    } catch {
      return [];
    }
  }, []);

  const debouncers = useRef<Record<number, (v: string) => void>>({});

  const makeDebouncedSimilarUpdater = useCallback((idx: number) => {
    if (!debouncers.current[idx]) {
      debouncers.current[idx] = debounce(async (value: string) => {
        const options = await fetchSimilar(value);
        setOrder(p => {
          const items = [...p.items];
          const it = items[idx];
          if (!it) return p;
          items[idx] = { ...it, similar_options: options, is_recognized: options.length ? false : null };
          return { ...p, items };
        });
      }, 350);
    }
    return debouncers.current[idx];
  }, [fetchSimilar]);

  // ---- VALIDACIONES POR PASO ----
  const isStep2Valid = useMemo(() =>
    order.items.length > 0 &&
    order.items.every(it =>
      it.product_name.trim() !== '' &&
      Number(it.quantity) > 0 &&
      Number(it.unit_price) > 0 &&
      !!it.image_url &&
      it.is_recognized === true
    ), [order.items]);

  const isStep3Valid = useMemo(() =>
    !!order.destino?.trim() &&
    (!!order.normalized_address || !!order.address.trim())
  , [order.destino, order.normalized_address, order.address]);

  const isStep4Valid = useMemo(() =>
    !!order.customer_name.trim() &&
    !!order.customer_id.trim() &&
    !!order.customer_phone.trim()
  , [order.customer_name, order.customer_id, order.customer_phone]);

  // ---- TOTAL ----
  const total = useMemo(
    () => order.items.reduce((s, it) => s + Number(it.quantity || 0) * Number(it.unit_price || 0), 0),
    [order.items]
  );

  // ---- ITEM HELPERS ----
  const updateItem = (index: number, patch: Partial<DisplayOrderItem>) => {
    setOrder(p => {
      const items = [...p.items];
      items[index] = { ...items[index], ...patch };
      return { ...p, items };
    });
  };
  const removeItem = (index: number) => {
    setOrder(p => ({ ...p, items: p.items.filter((_, i) => i !== index) }));
  };

  // ---- INTERPRETACIÓN (paso 1) ----
  const interpretFullOrder = async () => {
    if (!productInput.trim()) {
      toast.error('Pega el texto del pedido');
      return;
    }
    setIsProcessing(true);
    try {
      const resp = await fetch('/endpoints/products/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: productInput }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'Error al interpretar');

      const processed: DisplayOrderItem[] = (data?.items || []).map((it: any) => {
        const sim: ProductSearchResult[] = mapSearchResponse({ results: it.similar_options || [] });
        return {
          product_name: it.product_name || it.name || '',
          quantity: Number(it.quantity || it.qty || 0),
          unit_price: Number(it.unit_price || 0),
          product_code: it.product_code ?? null,
          sale_type: it.sale_type === 'WHOLESALE' || it.sale_type === 'RETAIL' ? it.sale_type : undefined,
          image_url: it.image_url ?? null,
          is_recognized: sim.length ? false : (typeof it.is_recognized === 'boolean' ? it.is_recognized : null),
          original_name: it.original_name || it.product_name || it.name || '',
          similar_options: sim,
        };
      });

      setOrder(p => ({
        ...p,
        items: processed,
        customer_name: data.customer_name || p.customer_name,
        customer_phone: data.customer_phone ? normalizePhone(data.customer_phone) : p.customer_phone,
        notes: [p.notes, data.notes, data.delivery_time_notes].filter(Boolean).join(' | '),
        payments: data.payment_amount ? [{ method: 'EFECTIVO', amount: Number(data.payment_amount) }] : p.payments,
      }));
      toast.success('Pedido interpretado');
      setCurrentStep(2);
    } catch (e: any) {
      toast.error(e?.message || 'Fallo interpretando');
    } finally {
      setIsProcessing(false);
    }
  };

  // ---- GEOCODING (paso 3) ----
  const handleGeocodeAddress = async () => {
    const text = order.address?.trim() || '';
    if (!text) { toast.error('Ingresa la dirección o URL'); return; }
    if (text.length < 5) { toast.error('Dirección demasiado corta'); return; }
    setIsGeocoding(true);
    setGeocodeMsg(null);
    try {
      const r = await fetch('/endpoints/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || 'Error geocodificando');

      let formatted: string | null = null;
      let lat: number | undefined;
      let lng: number | undefined;

      if (d?.formatted) {
        formatted = d.formatted;
        lat = d.lat;
        lng = d.lng;
      } else if (Array.isArray(d?.results) && d.results[0]) {
        formatted = d.results[0].formatted || null;
        lat = d.results[0].geometry?.lat;
        lng = d.results[0].geometry?.lng;
      }

      if (!formatted) throw new Error('Sin resultados');

      setOrder(p => ({ ...p, normalized_address: formatted, lat, lng }));
      setGeocodeMsg({ ok: true, msg: `✓ ${formatted}` });
      toast.success('Dirección verificada');
    } catch (e: any) {
      setGeocodeMsg({ ok: false, msg: e?.message || 'Error' });
      toast.error('No se pudo verificar');
    } finally {
      setIsGeocoding(false);
    }
  };

  // ---- CARGA DE IMAGEN ----
  const handleImageUpload = async (idx: number, file: File) => {
    updateItem(idx, { is_uploading_image: true });
    try {
      await new Promise(r => setTimeout(r, 700));
      const url = URL.createObjectURL(file);
      updateItem(idx, { image_url: url });
      toast.success('Foto cargada');
    } finally {
      updateItem(idx, { is_uploading_image: false });
    }
  };

  // ---- SUBMIT (paso 5) ----
  const submitOrder = async () => {
    if (order.items.length === 0) return toast.error('Agrega al menos 1 producto.');
    if (!order.destino?.trim()) return toast.error('Falta el destino (ciudad/zona).');
    if (!(order.normalized_address || order.address?.trim())) return toast.error('Falta dirección.');
    if (!order.customer_name?.trim() || !order.customer_id?.trim() || !order.customer_phone?.trim()) {
      return toast.error('Faltan datos del cliente.');
    }
    const invalidItem = order.items.find(it =>
      !it.product_name?.trim() ||
      Number(it.quantity) <= 0 ||
      Number(it.unit_price) <= 0 ||
      it.is_recognized !== true ||
      !it.image_url
    );
    if (invalidItem) return toast.error('Revisa productos: nombre/cantidad/precio/foto/normalización.');

    const payTotal = order.payments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const productsTotal = order.items.reduce((s, it) => s + Number(it.quantity) * Number(it.unit_price), 0);
    if (Math.abs(productsTotal - payTotal) > 0.01) return toast.error('El total de pagos no cuadra.');
    if (payTotal > 0 && order.payments.length !== 1) return toast.error('Por ahora usa un solo método de pago.');

    setIsProcessing(true);
    try {
      const allWholesale = order.items.length > 0 && order.items.every(i => i.sale_type === 'WHOLESALE');
      const saleTypeOrder: 'unidad' | 'mayor' = allWholesale ? 'mayor' : 'unidad';
      const mainMethod = payTotal > 0 ? order.payments[0].method : null;

      const payload = {
        seller: order.seller_name,
        seller_role: null as string | null,
        sale_type: saleTypeOrder,
        local: null as any,
        destino: order.destino || null,
        customer_id: order.customer_id.trim(),
        customer_phone: normalizePhone(order.customer_phone),
        customer_name: order.customer_name.trim(),
        numero: null as string | null,
        payment_method: mainMethod,
        address: order.normalized_address || order.address || null,
        notes: order.notes || null,
        delivery_date: order.delivery_date || null,
        delivery_from: order.delivery_from || null,
        delivery_to: order.delivery_to || null,
        sistema: false,
        items: order.items.map(it => ({
          product_code: it.product_code || null,
          product_name: it.product_name,
          quantity: Number(it.quantity || 0),
          unit_price: Number(it.unit_price || 0),
          sale_type: it.sale_type || null,
          image_url: it.image_url || null,
          original_name: it.original_name || null,
          is_recognized: typeof it.is_recognized === 'boolean' ? it.is_recognized : null,
          base_product_name: null,
        })),
      };

      const resp = await fetch('/endpoints/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let data: any = null;
      try { data = await resp.json(); } catch { /* noop */ }

      if (!resp.ok) {
        console.error('ORDERS 4xx/5xx →', resp.status, data);
        toast.error(data?.details || data?.error || `El servidor rechazó el pedido (${resp.status}).`);
        return;
      }

      toast.success(`✅ Pedido #${data.order_no ?? 'creado'} guardado con éxito`);
      setOrder(getInitialOrderState(order.seller_name));
      setProductInput('');
      setCurrentStep(1);
    } catch (e: any) {
      toast.error(e?.message || 'Error al guardar');
    } finally {
      setIsProcessing(false);
    }
  };

  // ---- Estado local para inputs del PASO 4 ----
  const [localName, setLocalName] = useState('');
  const [localCI, setLocalCI] = useState('');
  const [localPhone, setLocalPhone] = useState('');

  useEffect(() => {
    if (currentStep === 4) {
      setLocalName(order.customer_name || '');
      setLocalCI(order.customer_id || '');
      setLocalPhone(order.customer_phone || '');
    }
  }, [currentStep, order.customer_id, order.customer_name, order.customer_phone]);

  // ---- UI ----
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto max-w-5xl px-6 py-8 space-y-8">
        {/* Header */}
        <motion.div 
          className="space-y-6 text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-2">
              Captura de Pedidos
            </h1>
            <p className="text-white/60 text-lg">
              Vendedor: <span className="font-semibold text-blue-400">{order.seller_name}</span>
            </p>
          </div>
          
          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-2 sm:gap-4 max-w-3xl mx-auto">
            {[1,2,3,4,5].map((step, i) => (
              <motion.div 
                key={step} 
                className="flex items-center flex-grow"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <motion.div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 border-2 backdrop-blur-sm ${
                    step <= currentStep
                      ? 'bg-gradient-to-r from-blue-500/30 to-blue-600/30 border-blue-500/50 text-white shadow-lg shadow-blue-900/30'
                      : 'bg-white/10 border-white/20 text-white/60'
                  }`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {step}
                </motion.div>
                {i < 4 && (
                  <div className={`flex-1 h-0.5 mx-2 transition-all duration-300 ${
                    step < currentStep ? 'bg-blue-500' : 'bg-white/20'
                  }`} />
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {/* PASO 1 */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.5 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10 rounded-2xl"></div>
              <Card className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-2xl text-white flex items-center gap-3 p-6">
                    <div className="p-2 bg-blue-500/20 backdrop-blur-sm border border-blue-500/30 rounded-lg">
                      <ClipboardPaste className="w-6 h-6 text-blue-400" />
                    </div>
                    Paso 1: Pegar Pedido Completo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 p-6 pt-0">
                  <Textarea 
                    rows={8} 
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all text-base resize-none"
                    placeholder="Pega aquí el pedido completo con productos, cantidades, precios..."
                    value={productInput} 
                    onChange={e => setProductInput(e.target.value)} 
                  />
                  <div className="flex flex-col sm:flex-row gap-4">
                    <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button 
                        onClick={interpretFullOrder} 
                        disabled={isProcessing || !productInput.trim()}
                        className="w-full bg-gradient-to-r from-blue-500/30 to-blue-600/30 backdrop-blur-sm border border-blue-500/30 text-white font-bold text-base py-4 rounded-xl hover:from-blue-500/40 hover:to-blue-600/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Interpretando…
                          </>
                        ) : (
                          'Interpretar y Continuar'
                        )}
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button 
                        onClick={() => setOrder(p => ({
                          ...p, 
                          items: [...p.items, {
                            product_name: '', 
                            quantity: 0, 
                            unit_price: 0, 
                            sale_type: undefined,
                            product_code: null, 
                            is_recognized: null, 
                            similar_options: [], 
                            image_url: null
                          } as DisplayOrderItem]
                        }))} 
                        className="w-full sm:w-64 bg-gradient-to-r from-green-500/30 to-green-600/30 backdrop-blur-sm border border-green-500/30 text-white font-bold text-base py-4 rounded-xl hover:from-green-500/40 hover:to-green-600/40 transition-all duration-300"
                      >
                        <Plus className="w-5 h-5 mr-2" />
                        Añadir manualmente
                      </Button>
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* PASO 2 */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.5 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10 rounded-2xl"></div>
              <Card className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-2xl text-white flex items-center gap-3 p-6">
                    <div className="p-2 bg-green-500/20 backdrop-blur-sm border border-green-500/30 rounded-lg">
                      <PackageSearch className="w-6 h-6 text-green-400" />
                    </div>
                    Paso 2: Revisar y Normalizar Productos
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-6">
                  {order.items.length === 0 && (
                    <motion.div 
                      className="p-6 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 text-white/70 text-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      No hay productos. Añade uno o vuelve al paso 1.
                    </motion.div>
                  )}

                  <AnimatePresence>
                    {order.items.map((it, idx) => (
                      <motion.div 
                        key={idx} 
                        className="relative"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3, delay: idx * 0.1 }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10 rounded-xl"></div>
                        <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-2">
                              <Label className="text-white/70 font-medium mb-2 block">Producto</Label>
                              <Input
                                defaultValue={it.product_name}
                                placeholder="Ej: soporte de celular one…"
                                className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all"
                                onChange={(e) => {
                                  const v = e.target.value;
                                  updateItem(idx, { product_name: v, product_code: null, is_recognized: null, similar_options: [] });
                                  makeDebouncedSimilarUpdater(idx)(v);
                                }}
                              />
                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 transition-all"
                                    onClick={async () => {
                                      const opts = await fetchSimilar(it.product_name);
                                      updateItem(idx, { similar_options: opts, is_recognized: opts.length ? false : null });
                                    }}
                                  >
                                    <Search className="w-4 h-4 mr-1" /> Buscar en inventario
                                  </Button>
                                </motion.div>
                                {it.product_code && (
                                  <motion.span 
                                    className="text-xs rounded-full px-3 py-1 bg-green-500/20 backdrop-blur-sm border border-green-500/30 text-green-300"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                  >
                                    Normalizado: {it.product_code}
                                  </motion.span>
                                )}
                              </div>

                              {Array.isArray(it.similar_options) && it.similar_options.length > 0 && (
                                <motion.div 
                                  className="mt-4 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10"
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                >
                                  <p className="text-sm text-white/70 mb-3">Selecciona el producto correcto:</p>
                                  <div className="flex flex-wrap gap-2">
                                    {it.similar_options.map((opt, j) => (
                                      <motion.button
                                        key={j}
                                        onClick={() =>
                                          updateItem(idx, {
                                            product_name: opt.name,
                                            product_code: opt.code,
                                            is_recognized: true,
                                            similar_options: [],
                                          })
                                        }
                                        className="px-3 py-2 rounded-lg text-sm bg-white/10 backdrop-blur-sm hover:bg-white/20 border border-white/20 text-white flex items-center gap-2 transition-all"
                                        title={opt.code || ''}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                      >
                                        {opt.image_url && (
                                          <img src={opt.image_url} alt="" className="w-6 h-6 rounded object-cover" />
                                        )}
                                        <span>{opt.name}</span>
                                        {opt.code && <span className="opacity-70">({opt.code})</span>}
                                      </motion.button>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </div>

                            <div>
                              <Label className="text-white/70 font-medium mb-2 block">Cantidad</Label>
                              <Input
                                type="text"
                                defaultValue={String(it.quantity ?? '')}
                                onBlur={(e) => updateItem(idx, { quantity: Number(e.target.value.replace(',', '.')) || 0 })}
                                className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all"
                              />
                            </div>

                            <div>
                              <Label className="text-white/70 font-medium mb-2 block">Precio Unitario</Label>
                              <Input
                                type="text"
                                defaultValue={String(it.unit_price ?? '')}
                                onBlur={(e) => updateItem(idx, { unit_price: Number(e.target.value.replace(',', '.')) || 0 })}
                                className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label className="text-white/70 font-medium mb-2 block">Tipo de Venta</Label>
                              <div className="flex gap-2 mt-1">
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                  <Button
                                    type="button"
                                    variant={it.sale_type === 'RETAIL' ? 'default' : 'outline'}
                                    className={it.sale_type === 'RETAIL'
                                      ? 'bg-gradient-to-r from-green-500/30 to-green-600/30 backdrop-blur-sm border border-green-500/30 text-white hover:from-green-500/40 hover:to-green-600/40'
                                      : 'bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20'}
                                    onClick={() => updateItem(idx, { sale_type: 'RETAIL' })}
                                  >
                                    <User className="w-4 h-4 mr-1" /> Minorista
                                  </Button>
                                </motion.div>
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                  <Button
                                    type="button"
                                    variant={it.sale_type === 'WHOLESALE' ? 'default' : 'outline'}
                                    className={it.sale_type === 'WHOLESALE'
                                      ? 'bg-gradient-to-r from-blue-500/30 to-blue-600/30 backdrop-blur-sm border border-blue-500/30 text-white hover:from-blue-500/40 hover:to-blue-600/40'
                                      : 'bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20'}
                                    onClick={() => updateItem(idx, { sale_type: 'WHOLESALE' })}
                                  >
                                    <PackageSearch className="w-4 h-4 mr-1" /> Mayorista
                                  </Button>
                                </motion.div>
                              </div>
                            </div>

                            <div>
                              <Label className="text-white/70 font-medium mb-2 block">Foto del Producto (obligatoria)</Label>
                              <div className="flex items-center gap-3 mt-1">
                                <motion.label 
                                  className="cursor-pointer"
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => e.target.files && handleImageUpload(idx, e.target.files[0])}
                                  />
                                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 transition-all">
                                    {it.is_uploading_image ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                    {it.is_uploading_image ? 'Subiendo…' : 'Subir Foto'}
                                  </span>
                                </motion.label>
                                {it.image_url && (
                                  <motion.span 
                                    className="text-green-400 flex items-center gap-1"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                  >
                                    <CheckCircle className="w-4 h-4" /> Foto lista
                                  </motion.span>
                                )}
                              </div>
                              {it.image_url && (
                                <motion.img 
                                  src={it.image_url} 
                                  alt="" 
                                  className="mt-3 w-32 h-24 object-cover rounded-lg border border-white/20"
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                />
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between mt-4">
                            <div className="flex items-center gap-2 text-sm">
                              {it.is_recognized === true && (
                                <motion.span 
                                  className="text-green-400 inline-flex items-center gap-1"
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                >
                                  <Check className="w-4 h-4" /> Normalizado
                                </motion.span>
                              )}
                              {it.is_recognized !== true && it.similar_options.length === 0 && (
                                <span className="text-yellow-400 inline-flex items-center gap-1">
                                  <AlertTriangle className="w-4 h-4" /> Busca en inventario o escribe para sugerencias
                                </span>
                              )}
                            </div>
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                              <Button 
                                variant="destructive" 
                                size="sm" 
                                onClick={() => removeItem(idx)}
                                className="bg-red-500/20 backdrop-blur-sm border border-red-500/30 text-red-300 hover:bg-red-500/30"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </motion.div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      onClick={() => setOrder(p => ({
                        ...p, 
                        items: [...p.items, { 
                          product_name: '', 
                          quantity: 0, 
                          unit_price: 0, 
                          sale_type: undefined, 
                          product_code: null, 
                          is_recognized: null, 
                          similar_options: [], 
                          image_url: null 
                        } as DisplayOrderItem]
                      }))}
                      className="w-full bg-gradient-to-r from-green-500/30 to-green-600/30 backdrop-blur-sm border border-green-500/30 text-white font-bold text-base py-4 rounded-xl hover:from-green-500/40 hover:to-green-600/40 transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      <Plus className="w-5 h-5" /> Añadir Producto
                    </Button>
                  </motion.div>

                  <motion.div 
                    className="flex justify-between items-center text-xl font-bold text-white mt-6 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <span>Total Estimado:</span>
                    <span className="text-green-400">Bs. {total.toFixed(2)}</span>
                  </motion.div>

                  <div className="flex gap-4 mt-6">
                    <motion.div className="w-full sm:w-1/3" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button 
                        variant="outline" 
                        onClick={() => setCurrentStep(1)} 
                        className="w-full bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 py-3"
                      >
                        Volver
                      </Button>
                    </motion.div>
                    <motion.div className="w-full sm:w-2/3" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button 
                        onClick={() => setCurrentStep(3)} 
                        disabled={!isStep2Valid}
                        className="w-full bg-gradient-to-r from-blue-500/30 to-blue-600/30 backdrop-blur-sm border border-blue-500/30 text-white font-bold text-base py-3 rounded-xl hover:from-blue-500/40 hover:to-blue-600/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2"
                      >
                        Continuar a Entrega <ArrowRight size={16} />
                      </Button>
                    </motion.div>
                  </div>

                  {!isStep2Valid && (
                    <motion.div 
                      className="mt-4 p-4 bg-red-500/20 backdrop-blur-sm border border-red-500/30 rounded-xl text-red-300 flex items-center"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <AlertTriangle className="w-5 h-5 mr-2" /> 
                      Completa cantidad, precio, <u>foto</u> y <u>normalización</u> de cada producto.
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* PASO 3 */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.5 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10 rounded-2xl"></div>
              <Card className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-2xl text-white flex items-center gap-3 p-6">
                    <div className="p-2 bg-orange-500/20 backdrop-blur-sm border border-orange-500/30 rounded-lg">
                      <Truck className="w-6 h-6 text-orange-400" />
                    </div>
                    Paso 3: Detalles de Entrega
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-6">
                  <div>
                    <Label className="text-white/70 font-medium mb-2 block">Dirección / URL de Google Maps</Label>
                    <Input 
                      value={order.address} 
                      onChange={e => setOrder(p => ({ ...p, address: e.target.value }))} 
                      className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all" 
                      placeholder="Av. … o URL de Google Maps"
                    />
                  </div>
                  
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button 
                      onClick={handleGeocodeAddress} 
                      disabled={isGeocoding || order.address.trim().length < 5}
                      className="w-full bg-gradient-to-r from-purple-500/30 to-purple-600/30 backdrop-blur-sm border border-purple-500/30 text-white font-bold text-base py-4 rounded-xl hover:from-purple-500/40 hover:to-purple-600/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      {isGeocoding ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Verificando…
                        </>
                      ) : (
                        <>
                          <Search className="w-5 h-5" />
                          Verificar Dirección
                        </>
                      )}
                    </Button>
                  </motion.div>
                  
                  {geocodeMsg && (
                    <motion.div 
                      className={`p-4 rounded-xl flex items-center gap-3 backdrop-blur-sm border ${
                        geocodeMsg.ok 
                          ? 'bg-green-500/20 border-green-500/30 text-green-300' 
                          : 'bg-red-500/20 border-red-500/30 text-red-300'
                      }`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      {geocodeMsg.ok ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                      <span className="flex-1">{geocodeMsg.msg}</span>
                    </motion.div>
                  )}

                  <div>
                    <Label className="text-white/70 font-medium mb-2 block">Destino (Ciudad/Zona)</Label>
                    <Input 
                      value={order.destino} 
                      onChange={e => setOrder(p => ({ ...p, destino: e.target.value }))} 
                      className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all"
                    />
                  </div>

                  <div>
                    <Label className="text-white/70 font-medium mb-2 block">Fecha de Entrega</Label>
                    <Input 
                      type="date" 
                      value={order.delivery_date} 
                      onChange={e => setOrder(p => ({ ...p, delivery_date: e.target.value }))} 
                      className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-white/70 font-medium mb-2 block">Hora Desde</Label>
                      <Input 
                        type="time" 
                        value={order.delivery_from} 
                        onChange={e => setOrder(p => ({ ...p, delivery_from: e.target.value }))} 
                        className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all"
                      />
                    </div>
                    <div>
                      <Label className="text-white/70 font-medium mb-2 block">Hora Hasta</Label>
                      <Input 
                        type="time" 
                        value={order.delivery_to} 
                        onChange={e => setOrder(p => ({ ...p, delivery_to: e.target.value }))} 
                        className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      id="isEncomienda" 
                      checked={order.is_encomienda} 
                      onChange={e => setOrder(p => ({ ...p, is_encomienda: e.target.checked }))} 
                      className="w-5 h-5 rounded bg-white/10 border border-white/20 text-blue-500 focus:ring-blue-500/50"
                    />
                    <Label htmlFor="isEncomienda" className="text-white font-medium">Es Encomienda</Label>
                  </div>

                  <div>
                    <Label className="text-white/70 font-medium mb-2 block">Notas</Label>
                    <Textarea 
                      rows={3} 
                      className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all resize-none" 
                      value={order.notes} 
                      onChange={e => setOrder(p => ({ ...p, notes: e.target.value }))}
                    />
                  </div>

                  <div className="flex gap-4 mt-6">
                    <motion.div className="w-full sm:w-1/3" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button 
                        variant="outline" 
                        onClick={() => setCurrentStep(2)} 
                        className="w-full bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 py-3"
                      >
                        Volver
                      </Button>
                    </motion.div>
                    <motion.div className="w-full sm:w-2/3" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button 
                        onClick={() => setCurrentStep(4)} 
                        disabled={!isStep3Valid}
                        className="w-full bg-gradient-to-r from-blue-500/30 to-blue-600/30 backdrop-blur-sm border border-blue-500/30 text-white font-bold text-base py-3 rounded-xl hover:from-blue-500/40 hover:to-blue-600/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                      >
                        Continuar a Cliente
                      </Button>
                    </motion.div>
                  </div>

                  {!isStep3Valid && (
                    <motion.div 
                      className="mt-4 p-4 bg-red-500/20 backdrop-blur-sm border border-red-500/30 rounded-xl text-red-300 flex items-center"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <AlertTriangle className="w-5 h-5 mr-2" /> 
                      Completa destino y verifica la dirección.
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* PASO 4 */}
          {currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.5 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10 rounded-2xl"></div>
              <Card className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-2xl text-white flex items-center gap-3 p-6">
                    <div className="p-2 bg-purple-500/20 backdrop-blur-sm border border-purple-500/30 rounded-lg">
                      <User className="w-6 h-6 text-purple-400" />
                    </div>
                    Paso 4: Datos del Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-6">
                  <div>
                    <Label className="text-white/70 font-medium mb-2 block">Nombre del Cliente</Label>
                    <input 
                      className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all" 
                      defaultValue={localName}
                      onChange={e => setLocalName(e.target.value)}
                      onBlur={() => setOrder(p => ({ ...p, customer_name: localName }))}
                    />
                  </div>
                  <div>
                    <Label className="text-white/70 font-medium mb-2 block">CI/NIT del Cliente</Label>
                    <input 
                      className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all" 
                      defaultValue={localCI}
                      onChange={e => setLocalCI(e.target.value)}
                      onBlur={() => setOrder(p => ({ ...p, customer_id: localCI }))}
                    />
                  </div>
                  <div>
                    <Label className="text-white/70 font-medium mb-2 block">Teléfono del Cliente</Label>
                    <input 
                      className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all" 
                      defaultValue={localPhone}
                      onChange={e => setLocalPhone(e.target.value)}
                      onBlur={() => setOrder(p => ({ ...p, customer_phone: normalizePhone(localPhone) }))}
                    />
                  </div>

                  <div className="flex gap-4 mt-6">
                    <motion.div className="w-full sm:w-1/3" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button 
                        variant="outline" 
                        onClick={() => setCurrentStep(3)} 
                        className="w-full bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 py-3"
                      >
                        Volver
                      </Button>
                    </motion.div>
                    <motion.div className="w-full sm:w-2/3" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button 
                        onClick={() => setCurrentStep(5)} 
                        disabled={!isStep4Valid}
                        className="w-full bg-gradient-to-r from-blue-500/30 to-blue-600/30 backdrop-blur-sm border border-blue-500/30 text-white font-bold text-base py-3 rounded-xl hover:from-blue-500/40 hover:to-blue-600/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                      >
                        Continuar a Pagos
                      </Button>
                    </motion.div>
                  </div>

                  {!isStep4Valid && (
                    <motion.div 
                      className="mt-4 p-4 bg-red-500/20 backdrop-blur-sm border border-red-500/30 rounded-xl text-red-300 flex items-center"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <AlertTriangle className="w-5 h-5 mr-2" /> 
                      Nombre, CI/NIT y Teléfono son obligatorios.
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* PASO 5 */}
          {currentStep === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.5 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10 rounded-2xl"></div>
              <Card className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-2xl text-white flex items-center gap-3 p-6">
                    <div className="p-2 bg-green-500/20 backdrop-blur-sm border border-green-500/30 rounded-lg">
                      <CreditCard className="w-6 h-6 text-green-400" />
                    </div>
                    Paso 5: Pagos y Resumen
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-6">
                  <h3 className="text-xl font-semibold text-white">Métodos de Pago</h3>

                  <AnimatePresence>
                    {order.payments.map((p, i) => (
                      <motion.div 
                        key={i} 
                        className="flex items-center gap-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Select 
                          value={p.method} 
                          onValueChange={(v) => setOrder(prev => ({
                            ...prev, 
                            payments: prev.payments.map((x, ix) => ix === i ? { ...x, method: v as any } : x)
                          }))}
                        >
                          <SelectTrigger className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all">
                            <SelectValue placeholder="Método" />
                          </SelectTrigger>
                          <SelectContent className="bg-black border border-white/20 text-white">
                            <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                            <SelectItem value="QR">QR</SelectItem>
                            <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input 
                          type="text" 
                          defaultValue={String(p.amount ?? '')}
                          onBlur={(e) => setOrder(prev => ({
                            ...prev, 
                            payments: prev.payments.map((x, ix) => ix === i ? { ...x, amount: Number(e.target.value.replace(',', '.')) || 0 } : x)
                          }))}
                          className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all" 
                          placeholder="Monto"
                        />
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => setOrder(prev => ({ ...prev, payments: prev.payments.filter((_, ix) => ix !== i) }))}
                            className="bg-red-500/20 backdrop-blur-sm border border-red-500/30 text-red-300 hover:bg-red-500/30"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </motion.div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button 
                      onClick={() => {
                        const productsTotal = order.items.reduce((s, it) => s + Number(it.quantity) * Number(it.unit_price), 0);
                        if (order.payments.length >= 1) return toast.error('Por ahora solo 1 método de pago.');
                        setOrder(p => ({ ...p, payments: [...p.payments, { method: 'EFECTIVO', amount: productsTotal }] }));
                      }}
                      className="w-full bg-gradient-to-r from-blue-500/30 to-blue-600/30 backdrop-blur-sm border border-blue-500/30 text-white font-bold text-base py-4 rounded-xl hover:from-blue-500/40 hover:to-blue-600/40 transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      <Plus className="w-5 h-5" /> Añadir Pago (auto = total)
                    </Button>
                  </motion.div>

                  <motion.div 
                    className="flex justify-between items-center text-xl font-bold text-white mt-6 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <span>Total a Pagar:</span>
                    <span className="text-green-400">Bs. {order.payments.reduce((s, p) => s + Number(p.amount || 0), 0).toFixed(2)}</span>
                  </motion.div>

                  <Separator className="my-6 bg-white/20" />

                  <h3 className="text-xl font-semibold text-white">Resumen</h3>
                  <motion.div 
                    className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 space-y-3 font-mono text-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <p><strong>Vendedor:</strong> {order.seller_name}</p>
                    <p><strong>Cliente:</strong> {order.customer_name} — {order.customer_id} — {order.customer_phone}</p>
                    <p><strong>Productos:</strong></p>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                      {order.items.map((i, ix) => (
                        <li key={ix}>
                          {i.quantity}× {i.product_name} — Bs. {Number(i.unit_price).toFixed(2)}
                          {i.product_code && ` [${i.product_code}]`} {i.image_url && ' (Foto)'}
                          {i.sale_type && ` — ${i.sale_type === 'RETAIL' ? 'Minorista' : 'Mayorista'}`}
                        </li>
                      ))}
                    </ul>
                    <p><strong>Total Productos:</strong> Bs. {total.toFixed(2)}</p>
                    <p><strong>Dirección:</strong> {order.normalized_address || order.address}</p>
                    <p><strong>Destino:</strong> {order.destino}</p>
                    <p><strong>Entrega:</strong> {order.delivery_date} {order.delivery_from}–{order.delivery_to}</p>
                    <p><strong>Notas:</strong> {order.notes || '—'}</p>
                  </motion.div>

                  <div className="flex gap-4 mt-6">
                    <motion.div className="w-full sm:w-1/3" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button 
                        variant="outline" 
                        onClick={() => setCurrentStep(4)} 
                        className="w-full bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 py-3"
                      >
                        Volver
                      </Button>
                    </motion.div>
                    <motion.div className="w-full sm:w-2/3" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button 
                        onClick={submitOrder} 
                        disabled={isProcessing || Math.abs(total - order.payments.reduce((s, p) => s + Number(p.amount || 0), 0)) > 0.01}
                        className="w-full bg-gradient-to-r from-green-500/30 to-green-600/30 backdrop-blur-sm border border-green-500/30 text-white font-bold text-base py-4 rounded-xl hover:from-green-500/40 hover:to-green-600/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Guardando…
                          </>
                        ) : (
                          'Confirmar Pedido'
                        )}
                      </Button>
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}