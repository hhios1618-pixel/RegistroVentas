'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Textarea } from '@/components/Textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Label } from '@/components/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/select';
import { Separator } from '@/components/separator';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Search, CheckCircle, XCircle, AlertTriangle, ArrowRight, Upload, User, CreditCard, Truck, ClipboardPaste } from 'lucide-react';

type ProductSearchResult = { name: string; code: string };
type PaymentMethod = { method: 'EFECTIVO' | 'QR' | 'TRANSFERENCIA'; amount: number };

type DisplayOrderItem = {
  product_name: string;
  quantity: number;
  unit_price: number;

  product_code?: string;
  sale_type?: 'WHOLESALE' | 'RETAIL';
  image_url?: string | null;
  is_uploading_image?: boolean;

  // reconocimiento
  is_recognized?: boolean;
  original_name?: string;
  similar_options: ProductSearchResult[]; // normalizado a []
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
  customer_id: string;     // CI/NIT
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

export default function CapturaPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [order, setOrder] = useState<PartialOrder>(getInitialOrderState());
  const [productInput, setProductInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeMsg, setGeocodeMsg] = useState<{ ok: boolean; msg: string } | null>(null);

  // ---- CARGA DE VENDEDOR ----
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/endpoints/me');
        const d = await r.json();
        if (!r.ok || !d?.ok) throw new Error(d?.error || 'Sesión inválida');
        setOrder(p => ({ ...p, seller_name: d.full_name || 'Vendedor' }));
      } catch {
        setOrder(p => ({ ...p, seller_name: 'Vendedor' }));
      }
    })();
  }, []);

  // ---- VALIDACIONES POR PASO ----
  const isStep2Valid = useMemo(() =>
    order.items.length > 0 &&
    order.items.every(it =>
      it.product_name.trim() !== '' &&
      Number(it.quantity) > 0 &&
      Number(it.unit_price) > 0 &&
      !!it.image_url &&
      it.is_recognized !== false
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
        const sim: ProductSearchResult[] = Array.isArray(it.similar_options) ? it.similar_options : [];
        return {
          product_name: it.product_name || it.name || '',
          quantity: Number(it.quantity || it.qty || 0),
          unit_price: Number(it.unit_price || 0),
          product_code: it.product_code || undefined,
          sale_type: it.sale_type === 'WHOLESALE' || it.sale_type === 'RETAIL' ? it.sale_type : undefined,
          image_url: it.image_url ?? null,
          is_recognized: !!it.is_recognized,
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

  // ---- GEOCODING (paso 3, usa tu endpoint) ----
  const handleGeocodeAddress = async () => {
    const text = order.address?.trim() || '';
    if (!text) { toast.error('Ingresa la dirección o URL'); return; }
    setIsGeocoding(true);
    setGeocodeMsg(null);
    try {
      const r = await fetch('/endpoints/geocode', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: text }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || 'Error geocodificando');
      const best = d?.results?.[0];
      if (!best) { setGeocodeMsg({ ok: false, msg: 'Sin resultados' }); return; }
      setOrder(p => ({
        ...p,
        normalized_address: best.formatted || p.normalized_address,
        lat: best.geometry?.lat,
        lng: best.geometry?.lng,
      }));
      setGeocodeMsg({ ok: true, msg: `✓ ${best.formatted}` });
      toast.success('Dirección verificada');
    } catch (e: any) {
      setGeocodeMsg({ ok: false, msg: e?.message || 'Error' });
      toast.error('No se pudo verificar');
    } finally {
      setIsGeocoding(false);
    }
  };

  // ---- CARGA DE IMAGEN (mock) ----
  const handleImageUpload = async (idx: number, file: File) => {
    updateItem(idx, { is_uploading_image: true });
    try {
      await new Promise(r => setTimeout(r, 900));
      const url = URL.createObjectURL(file);
      updateItem(idx, { image_url: url });
      toast.success('Foto cargada');
    } finally {
      updateItem(idx, { is_uploading_image: false });
    }
  };

  // ---- SUBMIT (paso 5) -> /endpoints/orders ----
  const submitOrder = async () => {
    const payTotal = order.payments.reduce((s, p) => s + Number(p.amount || 0), 0);
    if (Math.abs(total - payTotal) > 0.01) {
      toast.error('El total de pagos no cuadra con el total');
      return;
    }
    setIsProcessing(true);
    try {
      // método de pago “principal”: si hay uno y cubre todo, lo mandamos, si no null
      const mainMethod =
        order.payments.length === 1 && Math.abs(payTotal - total) < 0.01
          ? order.payments[0].method
          : null;

      const payload = {
        // datos compat con tu endpoint
        seller: order.seller_name,
        seller_role: null as string | null,
        sale_type: null as 'unidad' | 'mayor' | null,
        local: null as any, // tu tabla es nullable
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
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'No se pudo guardar');

      toast.success(`✅ Pedido #${data.order_no} creado con éxito`);
      setOrder(getInitialOrderState(order.seller_name));
      setProductInput('');
      setCurrentStep(1);
    } catch (e: any) {
      toast.error(e?.message || 'Error al guardar');
    } finally {
      setIsProcessing(false);
    }
  };

  // ---- Estado local para inputs del PASO 4 (sin lag) ----
  const [localName, setLocalName] = useState('');
  const [localCI, setLocalCI] = useState('');
  const [localPhone, setLocalPhone] = useState('');

  useEffect(() => {
    if (currentStep === 4) {
      setLocalName(order.customer_name || '');
      setLocalCI(order.customer_id || '');
      setLocalPhone(order.customer_phone || '');
    }
  }, [currentStep]); // rehidrata al entrar al paso

  const inputStyles = "bg-slate-900/70 border-slate-700 placeholder:text-slate-500 text-base p-3 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
  const selectContentStyles = "bg-slate-800 text-white border-slate-700";

  // ---- UI ----
  return (
    <div className="bg-slate-900 text-slate-200 min-h-screen p-4 sm:p-6 md:p-8"
      style={{ background: `radial-gradient(circle at 15% 5%, rgba(0,255,163,.1), transparent 40%), radial-gradient(circle at 85% 20%, rgba(0,185,255,.12), transparent 40%), #0f172a` }}>
      <div className="container mx-auto max-w-4xl space-y-8">
        <div className="space-y-4 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">Captura de Pedidos</h1>
          <p className="text-slate-400">Vendedor: <span className="font-semibold text-white">{order.seller_name}</span></p>
          <div className="flex items-center justify-center gap-2 sm:gap-4 max-w-lg mx-auto">
            {[1,2,3,4,5].map((step, i) => (
              <div key={step} className="flex items-center flex-grow">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold transition-all border-2 ${step<=currentStep?'bg-blue-600 border-blue-500 text-white':'bg-slate-700 border-slate-600 text-slate-400'}`}>{step}</div>
                {i<4 && <div className={`flex-1 h-0.5 mx-2 ${step<currentStep?'bg-blue-600':'bg-slate-700'}`} />}
              </div>
            ))}
          </div>
        </div>

        {/* PASO 1 */}
        {currentStep===1 && (
          <Card className="bg-slate-800/50 border border-slate-700/50 rounded-2xl">
            <CardHeader><CardTitle className="text-xl text-white flex items-center gap-3 p-6"><ClipboardPaste/> Paso 1: Pegar Pedido Completo</CardTitle></CardHeader>
            <CardContent className="space-y-4 p-6 pt-0">
              <Textarea rows={8} className={inputStyles} placeholder="Pega aquí el pedido…" value={productInput} onChange={e=>setProductInput(e.target.value)} />
              <Button onClick={interpretFullOrder} disabled={isProcessing || !productInput.trim()} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-base py-3">
                {isProcessing ? (<><Loader2 className="w-5 h-5 mr-2 animate-spin"/> Interpretando…</>) : 'Interpretar y Continuar'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* PASO 2 */}
        {currentStep===2 && (
          <Card className="bg-slate-800/50 border border-slate-700/50 rounded-2xl">
            <CardHeader><CardTitle className="text-xl text-white flex items-center gap-3 p-6">🛒 Paso 2: Revisar Productos</CardTitle></CardHeader>
            <CardContent className="p-6 pt-0 space-y-6">
              {order.items.map((it, idx)=>(
                <div key={idx} className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div><Label>Producto</Label>
                      <Input defaultValue={it.product_name} onChange={(e)=>updateItem(idx, { product_name: e.target.value })} className={inputStyles}/>
                    </div>
                    <div><Label>Cantidad</Label>
                      <Input type="text" defaultValue={String(it.quantity ?? '')}
                        onBlur={(e)=>updateItem(idx, { quantity: Number(e.target.value.replace(',','.')) || 0 })}
                        className={inputStyles}/>
                    </div>
                    <div><Label>Precio Unitario</Label>
                      <Input type="text" defaultValue={String(it.unit_price ?? '')}
                        onBlur={(e)=>updateItem(idx, { unit_price: Number(e.target.value.replace(',','.')) || 0 })}
                        className={inputStyles}/>
                    </div>
                    <div><Label>Tipo de Venta</Label>
                      <Select value={it.sale_type} onValueChange={(v)=>updateItem(idx, { sale_type: v as any })}>
                        <SelectTrigger className={inputStyles}><SelectValue placeholder="Seleccionar"/></SelectTrigger>
                        <SelectContent className={selectContentStyles}>
                          <SelectItem value="RETAIL">Minorista</SelectItem>
                          <SelectItem value="WHOLESALE">Mayorista</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {(it.is_recognized===false && (it.similar_options?.length ?? 0)>0) && (
                    <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-700 rounded-md">
                      <p className="text-yellow-300 text-sm mb-2 flex items-center"><AlertTriangle className="w-4 h-4 mr-2"/>Producto no reconocido. Selecciona una opción:</p>
                      <div className="flex flex-wrap gap-2">
                        {it.similar_options!.map((opt, j)=>(
                          <Button key={j} variant="outline" size="sm" className="bg-yellow-700/50 border-yellow-600 text-yellow-100 hover:bg-yellow-600"
                            onClick={()=>updateItem(idx, { product_name: opt.name, product_code: opt.code, is_recognized: true, similar_options: [] })}>
                            {opt.name} ({opt.code})
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-4">
                    <Label className="flex items-center gap-2">
                      <Input type="file" accept="image/*" id={`up-${idx}`} className="hidden"
                        onChange={(e)=> e.target.files && handleImageUpload(idx, e.target.files[0])}/>
                      <Button asChild variant="outline" className="bg-slate-700/50 border-slate-600 hover:bg-slate-700 hover:border-slate-500 text-slate-300">
                        <label htmlFor={`up-${idx}`} className="cursor-pointer flex items-center gap-2">
                          {it.is_uploading_image ? <Loader2 className="w-4 h-4 animate-spin"/> : <Upload className="w-4 h-4"/>}
                          {it.is_uploading_image ? 'Subiendo...' : 'Subir Foto'}
                        </label>
                      </Button>
                    </Label>
                    {it.image_url && <span className="text-green-400 flex items-center gap-1"><CheckCircle className="w-4 h-4"/> Foto Cargada</span>}
                    <Button variant="destructive" size="sm" onClick={()=>removeItem(idx)}><Trash2 className="w-4 h-4"/></Button>
                  </div>
                </div>
              ))}

              <Button onClick={()=>setOrder(p=>({...p, items:[...p.items, { product_name:'', quantity:0, unit_price:0, similar_options:[] } as DisplayOrderItem]}))}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold text-base py-3 flex items-center justify-center gap-2">
                <Plus className="w-5 h-5"/> Añadir Producto
              </Button>

              <div className="flex justify-between items-center text-lg font-bold text-white mt-6">
                <span>Total Estimado:</span><span>Bs. {total.toFixed(2)}</span>
              </div>

              <div className="flex gap-4 mt-6">
                <Button variant="outline" onClick={()=>setCurrentStep(1)} className="w-full sm:w-1/3">Volver</Button>
                <Button onClick={()=>setCurrentStep(3)} disabled={!isStep2Valid}
                  className="w-full sm:w-2/3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-base py-3 flex items-center justify-center gap-2">
                  Continuar a Entrega <ArrowRight size={16}/>
                </Button>
              </div>

              {!isStep2Valid && (
                <div className="mt-4 p-3 bg-red-900/30 border border-red-700 rounded-md text-red-300 flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2"/> Completa cantidad, precio, foto y normalización de cada producto.
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* PASO 3 */}
        {currentStep===3 && (
          <Card className="bg-slate-800/50 border border-slate-700/50 rounded-2xl">
            <CardHeader><CardTitle className="text-xl text-white flex items-center gap-3 p-6"><Truck/> Paso 3: Detalles de Entrega</CardTitle></CardHeader>
            <CardContent className="p-6 pt-0 space-y-4">
              <div><Label>Dirección / URL de Google Maps</Label>
                <Input value={order.address} onChange={e=>setOrder(p=>({...p, address:e.target.value}))} className={inputStyles} placeholder="Av. … o URL de Google Maps"/>
              </div>
              <Button onClick={handleGeocodeAddress} disabled={isGeocoding}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-base py-3 flex items-center justify-center gap-2">
                {isGeocoding ? (<><Loader2 className="w-5 h-5 mr-2 animate-spin"/> Verificando…</>) : (<><Search className="w-5 h-5"/> Verificar Dirección</>)}
              </Button>
              {geocodeMsg && (
                <div className={`p-3 rounded-md flex items-center gap-2 ${geocodeMsg.ok ? 'bg-green-900/30 border border-green-700 text-green-300':'bg-red-900/30 border border-red-700 text-red-300'}`}>
                  {geocodeMsg.ok ? <CheckCircle className="w-5 h-5"/> : <XCircle className="w-5 h-5"/>}
                  <span className="flex-1">{geocodeMsg.msg}</span>
                </div>
              )}

              <div><Label>Destino (Ciudad/Zona)</Label>
                <Input value={order.destino} onChange={e=>setOrder(p=>({...p, destino:e.target.value}))} className={inputStyles}/>
              </div>

              <div><Label>Fecha de Entrega</Label>
                <Input type="date" value={order.delivery_date} onChange={e=>setOrder(p=>({...p, delivery_date:e.target.value}))} className={inputStyles}/>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div><Label>Hora Desde</Label>
                  <Input type="time" value={order.delivery_from} onChange={e=>setOrder(p=>({...p, delivery_from:e.target.value}))} className={inputStyles}/>
                </div>
                <div><Label>Hora Hasta</Label>
                  <Input type="time" value={order.delivery_to} onChange={e=>setOrder(p=>({...p, delivery_to:e.target.value}))} className={inputStyles}/>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="isEncomienda" checked={order.is_encomienda} onChange={e=>setOrder(p=>({...p, is_encomienda:e.target.checked}))} className="form-checkbox h-5 w-5 text-blue-600 rounded"/>
                <Label htmlFor="isEncomienda">Es Encomienda</Label>
              </div>

              <div><Label>Notas</Label>
                <Textarea rows={3} className={inputStyles} value={order.notes} onChange={e=>setOrder(p=>({...p, notes:e.target.value}))}/>
              </div>

              <div className="flex gap-4 mt-6">
                <Button variant="outline" onClick={()=>setCurrentStep(2)} className="w-full sm:w-1/3">Volver</Button>
                <Button onClick={()=>setCurrentStep(4)} disabled={!isStep3Valid}
                  className="w-full sm:w-2/3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-base py-3">Continuar a Cliente</Button>
              </div>

              {!isStep3Valid && (
                <div className="mt-4 p-3 bg-red-900/30 border border-red-700 rounded-md text-red-300 flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2"/> Completa dirección/destino y verifica coordenadas.
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* PASO 4 */}
        {currentStep===4 && (
          <Card className="bg-slate-800/50 border border-slate-700/50 rounded-2xl">
            <CardHeader><CardTitle className="text-xl text-white flex items-center gap-3 p-6"><User/> Paso 4: Datos del Cliente</CardTitle></CardHeader>
            <CardContent className="p-6 pt-0 space-y-4">
              <div><Label>Nombre del Cliente</Label>
                <input className={inputStyles} defaultValue={localName}
                  onChange={e=>setLocalName(e.target.value)}
                  onBlur={()=>setOrder(p=>({...p, customer_name: localName}))}/>
              </div>
              <div><Label>CI/NIT del Cliente</Label>
                <input className={inputStyles} defaultValue={localCI}
                  onChange={e=>setLocalCI(e.target.value)}
                  onBlur={()=>setOrder(p=>({...p, customer_id: localCI}))}/>
              </div>
              <div><Label>Teléfono del Cliente</Label>
                <input className={inputStyles} defaultValue={localPhone}
                  onChange={e=>setLocalPhone(e.target.value)}
                  onBlur={()=>setOrder(p=>({...p, customer_phone: normalizePhone(localPhone)}))}/>
              </div>

              <div className="flex gap-4 mt-6">
                <Button variant="outline" onClick={()=>setCurrentStep(3)} className="w-full sm:w-1/3">Volver</Button>
                <Button onClick={()=>setCurrentStep(5)} disabled={!isStep4Valid}
                  className="w-full sm:w-2/3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-base py-3">Continuar a Pagos</Button>
              </div>

              {!isStep4Valid && (
                <div className="mt-4 p-3 bg-red-900/30 border border-red-700 rounded-md text-red-300 flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2"/> Nombre, CI/NIT y Teléfono son obligatorios.
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* PASO 5 */}
        {currentStep===5 && (
          <Card className="bg-slate-800/50 border border-slate-700/50 rounded-2xl">
            <CardHeader><CardTitle className="text-xl text-white flex items-center gap-3 p-6"><CreditCard/> Paso 5: Pagos y Resumen</CardTitle></CardHeader>
            <CardContent className="p-6 pt-0 space-y-6">
              <h3 className="text-lg font-semibold text-white">Métodos de Pago</h3>

              {order.payments.map((p, i)=>(
                <div key={i} className="flex items-center gap-4 bg-slate-900/50 border border-slate-700 rounded-lg p-3">
                  <Select value={p.method} onValueChange={(v)=>setOrder(prev=>({...prev, payments: prev.payments.map((x,ix)=>ix===i?{...x, method: v as any}:x)}))}>
                    <SelectTrigger className={inputStyles}><SelectValue placeholder="Método"/></SelectTrigger>
                    <SelectContent className={selectContentStyles}>
                      <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                      <SelectItem value="QR">QR</SelectItem>
                      <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input type="text" defaultValue={String(p.amount ?? '')}
                    onBlur={(e)=>setOrder(prev=>({...prev, payments: prev.payments.map((x,ix)=>ix===i?{...x, amount: Number(e.target.value.replace(',','.'))||0}:x)}))}
                    className={inputStyles} placeholder="Monto"/>
                  <Button variant="destructive" size="sm" onClick={()=>setOrder(prev=>({...prev, payments: prev.payments.filter((_,ix)=>ix!==i)}))}><Trash2 className="w-4 h-4"/></Button>
                </div>
              ))}

              <Button onClick={()=>setOrder(p=>({...p, payments:[...p.payments, { method:'EFECTIVO', amount:0 }]}))}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-base py-3 flex items-center justify-center gap-2">
                <Plus className="w-5 h-5"/> Añadir Pago
              </Button>

              <div className="flex justify-between items-center text-lg font-bold text-white mt-4">
                <span>Total a Pagar:</span>
                <span>Bs. {order.payments.reduce((s,p)=>s+Number(p.amount||0),0).toFixed(2)}</span>
              </div>

              <Separator className="my-6 bg-slate-700" />

              <h3 className="text-lg font-semibold text-white">Resumen</h3>
              <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 space-y-3 font-mono text-sm">
                <p><strong>Vendedor:</strong> {order.seller_name}</p>
                <p><strong>Cliente:</strong> {order.customer_name} — {order.customer_id} — {order.customer_phone}</p>
                <p><strong>Productos:</strong></p>
                <ul className="list-disc list-inside ml-4">
                  {order.items.map((i,ix)=>(
                    <li key={ix}>{i.quantity}× {i.product_name} — Bs. {Number(i.unit_price).toFixed(2)} {i.product_code && `[${i.product_code}]`} {i.image_url && '(Foto)'}</li>
                  ))}
                </ul>
                <p><strong>Total Productos:</strong> Bs. {total.toFixed(2)}</p>
                <p><strong>Dirección:</strong> {order.normalized_address || order.address}</p>
                <p><strong>Destino:</strong> {order.destino}</p>
                <p><strong>Entrega:</strong> {order.delivery_date} {order.delivery_from}–{order.delivery_to}</p>
                <p><strong>Notas:</strong> {order.notes || '—'}</p>
              </div>

              <div className="flex gap-4 mt-6">
                <Button variant="outline" onClick={()=>setCurrentStep(4)} className="w-full sm:w-1/3">Volver</Button>
                <Button onClick={submitOrder} disabled={isProcessing || Math.abs(total - order.payments.reduce((s,p)=>s+Number(p.amount||0),0))>0.01}
                  className="w-full sm:w-2/3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-base py-3 flex items-center justify-center gap-2">
                  {isProcessing ? (<><Loader2 className="w-5 h-5 mr-2 animate-spin"/> Guardando…</>) : 'Confirmar Pedido'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}