'use client';

import React, { useMemo, useState, useEffect } from 'react';
import type { OrderRow, DeliveryUser, OrderStatus, LatLng, OrderItem } from '@/lib/types';

import Button from './Button';
import { StatusBadge } from './StatusBadge';
import LoadingSpinner from './LoadingSpinner';
import { Card, CardContent } from './Card';
import MapPicker from './MapPicker';

import {
  X, User, Phone, Calendar, Clock, CreditCard,
  CheckCircle2, AlertCircle, RefreshCw, Image as ImageIcon,
  ChevronLeft, ChevronRight, MapPin
} from 'lucide-react';

type Props = {
  order: OrderRow;
  deliveries: DeliveryUser[];
  onClose: () => void;
  onAssignDelivery: (orderId: string, deliveryId: string) => Promise<void>;
  onSaveLocation: (
    orderId: string,
    patch: Partial<Pick<OrderRow,'delivery_address'|'notes'|'delivery_geo_lat'|'delivery_geo_lng'>>
  ) => Promise<void>;
  onConfirmDelivered: (orderId: string) => Promise<void>;
  onStatusChange: (orderId: string, newStatus: OrderStatus) => Promise<void>;
  error: string | null;
  onClearError: () => void;
};

// Mapeo centralizado de estados para homologar nombres
const STATUS_MAP: Record<OrderStatus, string> = {
  pending: 'Pendiente',
  assigned: 'Asignado',
  out_for_delivery: 'En Ruta',
  delivered: 'Entregado',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
  returned: 'Devuelto',
  failed: 'Fallido',
};

// ---------- Utiles para picker de ventana ----------
const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const HORAS = Array.from({length: 24}, (_,h)=>h);
const MINUTOS = [0, 15, 30, 45];

const daysInMonth = (year:number, monthIndex:number) =>
  new Date(year, monthIndex + 1, 0).getDate();

const composeLocalISO = (y:number, m1:number, d:number, hh:number, mm:number) => {
  const pad = (n:number)=>String(n).padStart(2,'0');
  return `${y}-${pad(m1)}-${pad(d)}T${pad(hh)}:${pad(mm)}`;
};

export default function OrderDetailsModal({
  order, deliveries, onClose,
  onAssignDelivery, onSaveLocation,
  onConfirmDelivered, onStatusChange,
  error: externalError,
  onClearError,
}: Props) {
  // --------- estado general ----------
  const [selectedDelivery, setSelectedDelivery] = useState<string>(order.delivery_assigned_to || '');
  const [address, setAddress] = useState(order.delivery_address || order.address || '');
  const [notes, setNotes] = useState(order.notes || '');
  
  const [position, setPosition] = useState<LatLng | undefined>(() =>
    order.delivery_geo_lat != null && order.delivery_geo_lng != null
      ? { lat: Number(order.delivery_geo_lat), lng: Number(order.delivery_geo_lng) }
      : undefined
  );

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'assign' | 'location' | 'delivery' | 'status' | 'media'>('location');
  
  // --------- Lógica para manejar errores externos ----------
  useEffect(() => {
    if (externalError) {
      setError(externalError);
      onClearError();
    }
  }, [externalError, onClearError]);
  
  // --------- Lógica de Media ----------
  const [mediaLoading, setMediaLoading] = useState(false);

  const productImages = useMemo(() => {
    const images = (order.order_items ?? [])
      .map(item => item.image_url)
      .filter((url): url is string => !!url);
    return [...new Set(images)];
  }, [order.order_items]);
  
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const paymentUrl = useMemo(() => order.payment_proof_url ?? null, [order.payment_proof_url]);

  const handleNextImage = () => setCurrentImageIndex(prev => (prev + 1) % productImages.length);
  const handlePrevImage = () => setCurrentImageIndex(prev => (prev - 1 + productImages.length) % productImages.length);
  
  useEffect(() => {
      setCurrentImageIndex(0);
  }, [productImages]);

  const refreshMedia = () => {
    setMediaLoading(true);
    alert("Aquí iría la lógica para refrescar los datos del pedido desde el servidor.");
    setTimeout(() => setMediaLoading(false), 500);
  };

  // --------- Lógica de Ventana Delivery ----------
  const now = new Date();
  const fixedYear = now.getFullYear();
  const baseDate = order.delivery_date ? new Date(`${order.delivery_date}T00:00`) : now;
  const [mes, setMes] = useState<number>(baseDate.getMonth());
  const [dia, setDia] = useState<number>(baseDate.getDate());
  const [desdeH, setDesdeH] = useState<number>(now.getHours());
  const [desdeM, setDesdeM] = useState<number>(0);
  const [hastaH, setHastaH] = useState<number>(Math.min(now.getHours() + 1, 23));
  const [hastaM, setHastaM] = useState<number>(0);
  const [savingWindow, setSavingWindow] = useState(false);
  const [windowWarning, setWindowWarning] = useState<string | null>(null);
  const [currentWindow, setCurrentWindow] = useState<{start?: string; end?: string} | null>(null);

  useEffect(() => {
    const max = daysInMonth(fixedYear, mes);
    if (dia > max) setDia(max);
  }, [dia, mes, fixedYear]);

  const assignedDelivery = useMemo(
    () => deliveries.find(d => d.id === (order.delivery_assigned_to || selectedDelivery)),
    [deliveries, order.delivery_assigned_to, selectedDelivery]
  );

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return 'No especificada';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return dateStr ?? ''; }
  };

  const handleAction = async (action: () => Promise<void>, okMsg: string) => {
    setError(null); setSuccess(null); setIsProcessing(true);
    try {
      await action();
      setSuccess(okMsg);
      setTimeout(() => setSuccess(null), 2500);
    } catch (e: any) {
      setError(e?.message || 'Ocurrió un error.');
    } finally { setIsProcessing(false); }
  };

  const handleAssign = () => {
    if (!selectedDelivery) { setError('Debes seleccionar un repartidor.'); return; }
    handleAction(() => onAssignDelivery(order.id, selectedDelivery), '¡Pedido asignado!');
  };

  const handleSaveLocationClick = () => {
    const patch: Partial<Pick<OrderRow,'delivery_address'|'notes'|'delivery_geo_lat'|'delivery_geo_lng'>> = {
      delivery_address: address.trim() || null,
      notes: notes.trim() || null,
      delivery_geo_lat: position?.lat ?? null,
      delivery_geo_lng: position?.lng ?? null,
    };
    handleAction(() => onSaveLocation(order.id, patch), '¡Ubicación guardada!');
  };

  const handleStatusSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as OrderStatus;
    const successMessage = `Estado cambiado a "${STATUS_MAP[newStatus]}"`;
    handleAction(() => onStatusChange(order.id, newStatus), successMessage);
  };

  useEffect(() => {
    if (activeTab !== 'delivery') return;
    (async () => {
      try {
        const res = await fetch(`/api/orders/${order.id}/assign`, { method: 'GET' });
        const json = await res.json();
        if (json?.assignment) {
          setCurrentWindow({ start: json.assignment.window_start, end: json.assignment.window_end });
          const s = new Date(json.assignment.window_start);
          const e = new Date(json.assignment.window_end);
          setMes(s.getMonth()); setDia(s.getDate());
          setDesdeH(s.getHours()); setDesdeM(s.getMinutes());
          setHastaH(e.getHours()); setHastaM(e.getMinutes());
        }
      } catch { /* noop */ }
    })();
  }, [activeTab, order.id]);

  const canSaveWindow = useMemo(() => {
    const dISO = composeLocalISO(fixedYear, mes+1, dia, desdeH, desdeM);
    const hISO = composeLocalISO(fixedYear, mes+1, dia, hastaH, hastaM);
    return new Date(hISO) > new Date(dISO);
  }, [fixedYear, mes, dia, desdeH, desdeM, hastaH, hastaM]);

  async function saveWindow() {
    // ... (lógica de saveWindow)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-white/20 rounded-lg shadow-xl w-full max-w-5xl max-h-[95vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <header className="p-4 sm:p-6 border-b border-white/10 flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-bold text-white">
                Pedido <span className="font-mono text-blue-400">#{order.order_no ?? 'S/N'}</span>
              </h2>
              <StatusBadge status={order.status} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm text-white/70">
              {order.customer_name && <div className="flex items-center gap-2"><User className="w-4 h-4" /><span>{order.customer_name}</span></div>}
              {order.customer_phone && <div className="flex items-center gap-2"><Phone className="w-4 h-4" /><span>{order.customer_phone}</span></div>}
              {order.amount != null && <div className="flex items-center gap-2"><CreditCard className="w-4 h-4" /><span className="text-white font-medium">Bs {order.amount.toFixed(2)}</span></div>}
              <div className="flex items-center gap-2"><Calendar className="w-4 h-4" /><span>{formatDateTime(order.created_at)}</span></div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-5 h-5 text-white/60" />
          </button>
        </header>

        {(error || success) && (
          <div className="px-4 sm:px-6 pt-4">
            {error && <div className="bg-red-500/20 border border-red-500 text-red-300 p-3 rounded-md text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}
            {success && <div className="bg-green-500/20 border border-green-500 text-green-300 p-3 rounded-md text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />{success}</div>}
          </div>
        )}

        <div className="px-4 sm:px-6 pt-4">
          <div className="flex flex-wrap gap-1 bg-black/20 p-1 rounded-lg">
            <button onClick={() => setActiveTab('assign')}   className={`flex-1 py-2 px-3 rounded-md text-sm ${activeTab==='assign'?'bg-blue-600 text-white':'text-white/60 hover:text-white hover:bg-white/10'}`}>Asignación</button>
            <button onClick={() => setActiveTab('location')} className={`flex-1 py-2 px-3 rounded-md text-sm ${activeTab==='location'?'bg-blue-600 text-white':'text-white/60 hover:text-white hover:bg-white/10'}`}>Ubicación</button>
            <button onClick={() => setActiveTab('delivery')} className={`flex-1 py-2 px-3 rounded-md text-sm ${activeTab==='delivery'?'bg-blue-600 text-white':'text-white/60 hover:text-white hover:bg-white/10'}`}>Entrega</button>
            <button onClick={() => setActiveTab('media')}    className={`flex-1 py-2 px-3 rounded-md text-sm ${activeTab==='media'?'bg-blue-600 text-white':'text-white/60 hover:text-white hover:bg-white/10'}`}><ImageIcon className="inline w-4 h-4 mr-1" />Media</button>
            <button onClick={() => setActiveTab('status')}   className={`flex-1 py-2 px-3 rounded-md text-sm ${activeTab==='status'?'bg-blue-600 text-white':'text-white/60 hover:text-white hover:bg-white/10'}`}>Estado</button>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1">
          {activeTab === 'assign' && (
            <div className="space-y-4">
              <div className="bg-black/20 p-4 rounded-md">
                <h3 className="font-semibold mb-3 text-white/90">{assignedDelivery ? 'Reasignar Repartidor' : 'Asignar Repartidor'}</h3>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={selectedDelivery}
                    onChange={(e) => setSelectedDelivery(e.target.value)}
                    className="w-full bg-gray-800 border border-white/20 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isProcessing}
                  >
                    <option value="">-- Seleccionar repartidor --</option>
                    {deliveries.map(d => (
                      <option key={d.id} value={d.id}>{d.full_name} {d.vehicle_type ? `(${d.vehicle_type})` : ''}</option>
                    ))}
                  </select>
                  <Button onClick={handleAssign} disabled={!selectedDelivery || isProcessing || selectedDelivery === order.delivery_assigned_to}>
                    {isProcessing ? <LoadingSpinner /> : 'Asignar'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'location' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">Dirección de Entrega</label>
                <input
                  value={address}
                  onChange={(e)=>setAddress(e.target.value)}
                  placeholder="Dirección o referencia…"
                  className="w-full bg-black/50 border border-white/15 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>

              <div className="space-y-2">
                {/* La línea con el conflicto estaba aquí. Ahora solo tiene 'flex' */}
                <label className="text-sm font-medium text-white/90 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Pin de Ubicación (arrastra para ajustar)
                </label>
                <MapPicker
                  value={position}
                  onChange={(newPos) => setPosition(newPos)}
                  defaultCenter={{ lat: -17.7833, lng: -63.1821 }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">Instrucciones de Entrega</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Instrucciones: llamar al llegar, edificio, piso, referencia, etc."
                  className="w-full bg-black/50 border border-white/15 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                  rows={3}
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveLocationClick} disabled={isProcessing} className="bg-green-600/80 hover:bg-green-600 flex items-center gap-2">
                  {isProcessing ? <LoadingSpinner /> : <CheckCircle2 className="w-4 h-4" />}
                  Guardar Ubicación
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'delivery' && (
            <div className="space-y-4">
              <Card>
                <CardContent className="p-4 text-sm text-white/80">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-white/60" /><span className="text-white/60">Fecha:</span><span className="text-white">{order.delivery_date ?? '—'}</span></div>
                    <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-white/60" /><span className="text-white/60">Desde:</span><span className="text-white">{order.delivery_from ?? '—'}</span></div>
                    <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-white/60" /><span className="text-white/60">Hasta:</span><span className="text-white">{order.delivery_to ?? '—'}</span></div>
                  </div>
                </CardContent>
              </Card>
              <p className="text-white/60 text-sm">* La coordinadora puede editar estos campos desde la creación/edición del pedido.</p>
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-white font-semibold mb-3">Ventana Delivery (Coordinación)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                    <div>
                      <label className="block text-xs text-white/60 mb-1">Desde</label>
                      <div className="grid grid-cols-4 gap-2">
                        <select className="bg-gray-800 border border-white/20 rounded-md px-2 py-2 text-white" value={mes} onChange={(e)=>setMes(Number(e.target.value))}>
                          {MESES.map((m,idx)=><option key={m} value={idx}>{m}</option>)}
                        </select>
                        <select className="bg-gray-800 border border-white/20 rounded-md px-2 py-2 text-white" value={dia} onChange={(e)=>setDia(Number(e.target.value))}>
                          {Array.from({length: daysInMonth(fixedYear, mes)},(_,i)=>i+1).map(d=><option key={d} value={d}>{d}</option>)}
                        </select>
                        <select className="bg-gray-800 border border-white/20 rounded-md px-2 py-2 text-white" value={desdeH} onChange={(e)=>setDesdeH(Number(e.target.value))}>
                          {HORAS.map(h=><option key={h} value={h}>{String(h).padStart(2,'0')}</option>)}
                        </select>
                        <select className="bg-gray-800 border border-white/20 rounded-md px-2 py-2 text-white" value={desdeM} onChange={(e)=>setDesdeM(Number(e.target.value))}>
                          {MINUTOS.map(m=><option key={m} value={m}>{String(m).padStart(2,'0')}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-white/60 mb-1">Hasta</label>
                      <div className="grid grid-cols-4 gap-2">
                        <select className="bg-gray-800 border border-white/20 rounded-md px-2 py-2 text-white" value={mes} onChange={(e)=>setMes(Number(e.target.value))}>
                          {MESES.map((m,idx)=><option key={m} value={idx}>{m}</option>)}
                        </select>
                        <select className="bg-gray-800 border border-white/20 rounded-md px-2 py-2 text-white" value={dia} onChange={(e)=>setDia(Number(e.target.value))}>
                          {Array.from({length: daysInMonth(fixedYear, mes)},(_,i)=>i+1).map(d=><option key={d} value={d}>{d}</option>)}
                        </select>
                        <select className="bg-gray-800 border border-white/20 rounded-md px-2 py-2 text-white" value={hastaH} onChange={(e)=>setHastaH(Number(e.target.value))}>
                          {HORAS.map(h=><option key={h} value={h}>{String(h).padStart(2,'0')}</option>)}
                        </select>
                        <select className="bg-gray-800 border border-white/20 rounded-md px-2 py-2 text-white" value={hastaM} onChange={(e)=>setHastaM(Number(e.target.value))}>
                          {MINUTOS.map(m=><option key={m} value={m}>{String(m).padStart(2,'0')}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-white/60">
                      Año: <b>{fixedYear}</b>{' '}
                      {currentWindow?.start && ( <>• Actual: <b>{new Date(currentWindow.start).toLocaleString('es-BO')}</b> → <b>{new Date(currentWindow.end!).toLocaleString('es-BO')}</b></> )}
                    </div>
                    <Button onClick={saveWindow} disabled={!canSaveWindow || savingWindow} className="flex items-center gap-2">
                      {savingWindow ? <LoadingSpinner /> : <Clock className="w-4 h-4" />}
                      Guardar Ventana
                    </Button>
                  </div>
                  {windowWarning && (
                    <div className="mt-3 text-xs text-amber-300 bg-amber-500/10 border border-amber-400/40 px-3 py-2 rounded-md flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      {windowWarning}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'media' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Fotografías</h3>
                <Button variant="outline" size="small" onClick={refreshMedia} disabled={mediaLoading} className="flex items-center gap-1.5">
                  <RefreshCw className={`w-4 h-4 ${mediaLoading ? 'animate-spin' : ''}`} />
                  Refrescar
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-black/20 rounded-md p-3 border border-white/10 space-y-3">
                  <div className="text-white/80 font-medium">Fotos de producto (vendedor)</div>
                  {productImages.length > 0 ? (
                    <div className="space-y-3">
                      <div className="relative group">
                        <a href={productImages[currentImageIndex]} target="_blank" rel="noopener noreferrer" title="Ver imagen completa">
                          <img 
                            src={productImages[currentImageIndex]} 
                            alt={`Foto de producto ${currentImageIndex + 1}`} 
                            className="w-full h-60 object-contain rounded-md bg-black/30 transition-transform duration-300 group-hover:scale-105" 
                          />
                        </a>
                        {productImages.length > 1 && (
                          <>
                            <div className="absolute top-2 right-2 bg-black/60 text-white text-xs rounded-full px-2 py-1 transition-opacity opacity-0 group-hover:opacity-100">
                              {currentImageIndex + 1} / {productImages.length}
                            </div>
                            <button onClick={handlePrevImage} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 p-2 rounded-full text-white hover:bg-black/80 transition-opacity opacity-0 group-hover:opacity-100"><ChevronLeft size={20}/></button>
                            <button onClick={handleNextImage} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 p-2 rounded-full text-white hover:bg-black/80 transition-opacity opacity-0 group-hover:opacity-100"><ChevronRight size={20}/></button>
                          </>
                        )}
                      </div>
                      {productImages.length > 1 && (
                        <div className="flex gap-2 justify-center flex-wrap">
                          {productImages.map((url, index) => (
                            <img
                              key={index}
                              src={url}
                              alt={`Thumbnail ${index + 1}`}
                              onClick={() => setCurrentImageIndex(index)}
                              className={`w-12 h-12 object-cover rounded-md cursor-pointer border-2 ${currentImageIndex === index ? 'border-blue-500' : 'border-transparent hover:border-white/50'}`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-72 rounded-md bg-black/20 border border-dashed border-white/15 flex items-center justify-center text-white/50 text-sm">
                      Sin imágenes de producto
                    </div>
                  )}
                </div>

                <div className="bg-black/20 rounded-md p-3 border border-white/10">
                  <div className="text-white/80 font-medium mb-2">Comprobante de pago</div>
                  {paymentUrl ? (
                    <a href={paymentUrl} target="_blank" rel="noopener noreferrer" title="Ver imagen completa">
                      <img src={paymentUrl} alt="Comprobante de pago" className="w-full h-72 object-contain rounded-md bg-black/30 transition-transform duration-300 hover:scale-105" />
                    </a>
                  ) : (
                    <div className="w-full h-72 rounded-md bg-black/20 border border-dashed border-white/15 flex items-center justify-center text-white/50 text-sm">
                      Sin imagen disponible
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'status' && (
             <div className="space-y-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-white mb-1">Estado Actual</h4>
                      <StatusBadge status={order.status} />
                    </div>
                    <div className="text-right text-sm text-white/60">
                      <div>Última actualización</div>
                      <div>{formatDateTime(order.updated_at || order.created_at)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="bg-black/20 p-4 rounded-md">
                <h3 className="font-semibold mb-3 text-white/90">Cambiar Estado</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <select
                    value={order.status}
                    onChange={handleStatusSelect}
                    className="w-full bg-gray-800 border border-white/20 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isProcessing}
                  >
                    {Object.entries(STATUS_MAP).map(([statusKey, statusLabel]) => (
                      <option
                        key={statusKey}
                        value={statusKey}
                        disabled={order.status === statusKey}
                      >
                        {statusLabel}
                      </option>
                    ))}
                  </select>

                  {order.status === 'delivered' && (
                    <Button
                      onClick={() => handleAction(
                        () => onConfirmDelivered(order.id),
                        '¡Entrega confirmada!'
                      )}
                      disabled={isProcessing}
                      className="bg-emerald-600/80 hover:bg-emerald-600 flex items-center justify-center gap-2"
                    >
                      {isProcessing ? <LoadingSpinner /> : <CheckCircle2 className="w-4 h-4" />}
                      Confirmar Entrega
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <footer className="p-4 bg-black/20 border-t border-white/10 flex justify-between items-center">
          <div className="text-sm text-white/60">
            ID: <span className="font-mono">{order.id}</span>
          </div>
          <Button variant="secondary" onClick={onClose} disabled={isProcessing}>Cerrar</Button>
        </footer>
      </div>
    </div>
  );
}