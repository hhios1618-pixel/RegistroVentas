'use client';

import React, { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import type { OrderRow, DeliveryUser, OrderStatus, LatLng, AddressSuggestion } from '@/types';

import Button from './Button';
import { StatusBadge } from './StatusBadge';
import LoadingSpinner from './LoadingSpinner';
import { Card, CardContent } from './Card';

const AddressSearch = dynamic(() => import('./AddressSearch'), { ssr: false, loading: () => <div className="w-full h-[42px] bg-black/50 border border-white/15 rounded-lg animate-pulse" /> });
const MapPicker = dynamic(() => import('./MapPicker'), { ssr: false, loading: () => <div className="h-60 bg-black/20 rounded-lg animate-pulse flex items-center justify-center"><div className="text-white/40">Cargando mapa...</div></div> });

import {
  X, User, Phone, MapPin, Calendar, Clock, CreditCard,
  Package, Save, CheckCircle2, AlertCircle, Eye, EyeOff, Navigation, RefreshCw, Image as ImageIcon
} from 'lucide-react';

type Props = {
  order: OrderRow;
  deliveries: DeliveryUser[];
  onClose: () => void;
  onAssignDelivery: (orderId: string, deliveryId: string) => Promise<void>;
  onSaveLocation: (orderId: string, patch: Partial<Pick<OrderRow,'delivery_address'|'notes'|'delivery_geo_lat'|'delivery_geo_lng'>>) => Promise<void>;
  onConfirmDelivered: (orderId: string) => Promise<void>;
  onStatusChange: (orderId: string, newStatus: OrderStatus) => Promise<void>;
};

const MEDIA_BUCKET = 'orders-media';
const MEDIA_PRIVATE = true;

async function signIfNeeded(pathOrUrl?: string | null): Promise<string | null> {
  if (!pathOrUrl) return null;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  if (!MEDIA_PRIVATE) return pathOrUrl;

  const res = await fetch('/api/media/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bucket: MEDIA_BUCKET, path: pathOrUrl, expiresIn: 3600 }),
  });
  if (!res.ok) return null;
  const { url } = await res.json();
  return url ?? null;
}

// util para datetime-local
function toLocalInputValue(dt: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

export function OrderDetailsModal({
  order,
  deliveries,
  onClose,
  onAssignDelivery,
  onSaveLocation,
  onConfirmDelivered,
  onStatusChange,
}: Props) {
  const [selectedDelivery, setSelectedDelivery] = useState<string>(order.delivery_assigned_to || '');
  const [address, setAddress] = useState(order.delivery_address || '');
  const [notes, setNotes] = useState(order.notes || '');
  const [position, setPosition] = useState<LatLng | undefined>(() =>
    order.delivery_geo_lat != null && order.delivery_geo_lng != null
      ? { lat: Number(order.delivery_geo_lat), lng: Number(order.delivery_geo_lng) }
      : undefined
  );

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mapVisible, setMapVisible] = useState(true);
  const [activeTab, setActiveTab] = useState<'assign' | 'location' | 'delivery' | 'status' | 'media'>('assign');

  // MEDIA
  const [sellerUrl, setSellerUrl] = useState<string | null>(order.seller_photo_url ?? null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(order.payment_proof_url ?? null);
  const [mediaLoading, setMediaLoading] = useState(false);

  // --- Ventana Delivery (coordinación) ---
  const [winDesde, setWinDesde] = useState<string>(''); // datetime-local
  const [winHasta, setWinHasta] = useState<string>(''); // datetime-local
  const [savingWindow, setSavingWindow] = useState(false);
  const [windowWarning, setWindowWarning] = useState<string | null>(null);
  const [currentWindow, setCurrentWindow] = useState<{start?: string; end?: string; delivery_id?: string} | null>(null);

  const assignedDelivery = useMemo(
    () => deliveries.find(d => d.id === (order.delivery_assigned_to || selectedDelivery)),
    [deliveries, order.delivery_assigned_to, selectedDelivery]
  );

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return 'No especificada';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr ?? '';
    }
  };

  const handleAction = async (action: () => Promise<void>, okMsg: string) => {
    setError(null); setSuccess(null); setIsProcessing(true);
    try {
      await action();
      setSuccess(okMsg);
      setTimeout(() => setSuccess(null), 2500);
    } catch (e: any) {
      setError(e?.message || 'Ocurrió un error.');
    } finally {
      setIsProcessing(false);
    }
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
    handleAction(() => onStatusChange(order.id, newStatus), `Estado cambiado a ${newStatus.replaceAll('_', ' ')}`);
  };

  const handleConfirmDelivery = () => handleAction(() => onConfirmDelivered(order.id), '¡Entrega confirmada!');

  const handleAddressPick = (s: AddressSuggestion) => {
    setAddress(s.label);
    if (s.pos) setPosition(s.pos);
  };

  const refreshMedia = async () => {
    setMediaLoading(true);
    try {
      const newSeller = await signIfNeeded(order.seller_photo_url ?? null);
      const newPayment = await signIfNeeded(order.payment_proof_url ?? null);
      setSellerUrl(newSeller);
      setPaymentUrl(newPayment);
    } finally {
      setMediaLoading(false);
    }
  };

  const canAutoloadMedia = activeTab === 'media' && (!sellerUrl || !/^https?:\/\//.test(sellerUrl) || !paymentUrl || !/^https?:\/\//.test(paymentUrl));
  React.useEffect(() => {
    if (canAutoloadMedia && !mediaLoading) { void refreshMedia(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Cargar ventana existente cuando entro a "delivery"
  React.useEffect(() => {
    if (activeTab !== 'delivery') return;
    (async () => {
      try {
        const res = await fetch(`/api/orders/${order.id}/assign`, { method: 'GET' });
        if (!res.ok) return;
        const json = await res.json();
        if (json?.assignment) {
          setCurrentWindow({
            start: json.assignment.window_start,
            end: json.assignment.window_end,
            delivery_id: json.assignment.delivery_id,
          });
          // prefill inputs
          const s = new Date(json.assignment.window_start);
          const e = new Date(json.assignment.window_end);
          setWinDesde(toLocalInputValue(s));
          setWinHasta(toLocalInputValue(e));
        }
      } catch { /* silent */ }
    })();
  }, [activeTab, order.id]);

  const canSaveWindow = React.useMemo(() => {
    if (!winDesde || !winHasta) return false;
    const d = new Date(winDesde); const h = new Date(winHasta);
    return h > d;
  }, [winDesde, winHasta]);

  async function saveWindow() {
    setWindowWarning(null);
    if (!canSaveWindow) return;
    setSavingWindow(true);
    try {
      const deliveryUserId = selectedDelivery || order.delivery_assigned_to || '';
      if (!deliveryUserId) {
        setSavingWindow(false);
        setError('Selecciona primero un repartidor en la pestaña “Asignación”.');
        return;
      }

      const res = await fetch(`/api/orders/${order.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliveryUserId,
          desde: winDesde, // datetime-local (La Paz)
          hasta: winHasta,
          createdBy: deliveryUserId, // si tienes coordinador, reemplaza aquí
        }),
      });

      const json = await res.json();

      if (res.status === 409 && json?.error === 'OVERLAP') {
        setError('El delivery ya tiene otra entrega en ese rango.');
        setSavingWindow(false);
        return;
      }
      if (!res.ok) {
        setError(json?.detail || json?.error || 'Error al guardar ventana');
        setSavingWindow(false);
        return;
      }

      if (json.warnings && json.warnings.length) {
        setWindowWarning(json.warnings[0]);
      } else {
        setWindowWarning(null);
      }

      setCurrentWindow({ start: new Date(winDesde).toISOString(), end: new Date(winHasta).toISOString(), delivery_id: deliveryUserId });
      setSuccess('Ventana de entrega guardada');
      setTimeout(() => setSuccess(null), 2500);
    } catch (e: any) {
      setError(e?.message || 'Error al guardar ventana');
    } finally {
      setSavingWindow(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-white/20 rounded-lg shadow-xl w-full max-w-5xl max-h-[95vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <header className="p-4 sm:p-6 border-b border-white/10 flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-bold text-white">Pedido <span className="font-mono text-blue-400">#{order.order_no ?? 'S/N'}</span></h2>
              <StatusBadge status={order.status} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm text-white/70">
              {order.customer_name && <div className="flex items-center gap-2"><User className="w-4 h-4" /><span>{order.customer_name}</span></div>}
              {order.customer_phone && <div className="flex items-center gap-2"><Phone className="w-4 h-4" /><span>{order.customer_phone}</span></div>}
              {order.amount != null && <div className="flex items-center gap-2"><CreditCard className="w-4 h-4" /><span className="text-white font-medium">Bs {order.amount.toFixed(2)}</span></div>}
              <div className="flex items-center gap-2"><Calendar className="w-4 h-4" /><span>{formatDateTime(order.created_at)}</span></div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><X className="w-5 h-5 text-white/60" /></button>
        </header>

        {(error || success) && (
          <div className="px-4 sm:px-6 pt-4">
            {error && <div className="bg-red-500/20 border border-red-500 text-red-300 p-3 rounded-md text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}
            {success && <div className="bg-green-500/20 border border-green-500 text-green-300 p-3 rounded-md text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />{success}</div>}
          </div>
        )}

        {/* Tabs */}
        <div className="px-4 sm:px-6 pt-4">
          <div className="flex flex-wrap gap-1 bg-black/20 p-1 rounded-lg">
            <button onClick={() => setActiveTab('assign')}   className={`flex-1 py-2 px-3 rounded-md text-sm ${activeTab==='assign'?'bg-blue-600 text-white':'text-white/60 hover:text-white hover:bg-white/10'}`}>Asignación</button>
            <button onClick={() => setActiveTab('location')} className={`flex-1 py-2 px-3 rounded-md text-sm ${activeTab==='location'?'bg-blue-600 text-white':'text-white/60 hover:text-white hover:bg-white/10'}`}>Ubicación</button>
            <button onClick={() => setActiveTab('delivery')} className={`flex-1 py-2 px-3 rounded-md text-sm ${activeTab==='delivery'?'bg-blue-600 text-white':'text-white/60 hover:text-white hover:bg-white/10'}`}>Entrega</button>
            <button onClick={() => setActiveTab('media')}    className={`flex-1 py-2 px-3 rounded-md text-sm ${activeTab==='media'?'bg-blue-600 text-white':'text-white/60 hover:text-white hover:bg-white/10'}`}><ImageIcon className="inline w-4 h-4 mr-1" />Media</button>
            <button onClick={() => setActiveTab('status')}   className={`flex-1 py-2 px-3 rounded-md text-sm ${activeTab==='status'?'bg-blue-600 text-white':'text-white/60 hover:text-white hover:bg-white/10'}`}>Estado</button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1">
          {/* Asignación */}
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

          {/* Ubicación */}
          {activeTab === 'location' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">Dirección de Entrega</label>
                <AddressSearch value={address} onChange={setAddress} onPick={handleAddressPick} placeholder="Buscar dirección o referencia..." />
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-white/90">Ubicación en Mapa</label>
                  <Button variant="ghost" size="small" onClick={() => setMapVisible(!mapVisible)} className="flex items-center gap-1.5">
                    {mapVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    {mapVisible ? 'Ocultar' : 'Mostrar'}
                  </Button>
                </div>
                {mapVisible && (
                  <div className="space-y-3">
                    <MapPicker
                      value={position}
                      defaultCenter={{ lat: -17.7833, lng: -63.1821 }}
                      zoom={13}
                      onChange={setPosition}
                      height={320}
                    />
                    <div className="flex items-center justify-between text-xs">
                      {position
                        ? <div className="flex items-center gap-2 text-white/60"><Navigation className="w-4 h-4" /><span>Lat: {position.lat.toFixed(6)} • Lng: {position.lng.toFixed(6)}</span></div>
                        : <span className="text-white/60">Haz clic en el mapa para establecer coordenadas</span>}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">Instrucciones de Entrega</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Instrucciones: llamar al llegar, edificio, piso, referencia, etc."
                  className="w-full bg-black/50 border border-white/15 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                  rows={4}
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveLocationClick} disabled={isProcessing} className="bg-green-600/80 hover:bg-green-600 flex items-center gap-2">
                  {isProcessing ? <LoadingSpinner /> : <Save className="w-4 h-4" />}
                  Guardar Ubicación
                </Button>
              </div>
            </div>
          )}

          {/* Programación de Entrega */}
          {activeTab === 'delivery' && (
            <div className="space-y-4">
              {/* Disponibilidad del cliente (venta) — solo lectura */}
              <Card>
                <CardContent className="p-4 text-sm text-white/80">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-white/60" /><span className="text-white/60">Fecha:</span><span className="text-white">{order.delivery_date ?? '—'}</span></div>
                    <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-white/60" /><span className="text-white/60">Desde:</span><span className="text-white">{order.delivery_from ?? '—'}</span></div>
                    <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-white/60" /><span className="text-white/60">Hasta:</span><span className="text-white">{order.delivery_to ?? '—'}</span></div>
                  </div>
                </CardContent>
              </Card>
              <p className="text-white/60 text-sm">* La coordinadora puede editar estos campos desde la creación/edición del pedido (si así lo definimos).</p>

              {/* Ventana Delivery (Coordinación) — editable */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-white font-semibold mb-3">Ventana Delivery (Coordinación)</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs text-white/60 mb-1">Desde</label>
                      <input
                        type="datetime-local"
                        value={winDesde}
                        onChange={(e) => setWinDesde(e.target.value)}
                        className="w-full bg-gray-800 border border-white/20 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-white/60 mb-1">Hasta</label>
                      <input
                        type="datetime-local"
                        value={winHasta}
                        onChange={(e) => setWinHasta(e.target.value)}
                        className="w-full bg-gray-800 border border-white/20 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-white/60">
                      {currentWindow?.start && (
                        <>Ventana actual: <b>{new Date(currentWindow.start).toLocaleString('es-BO')}</b> → <b>{new Date(currentWindow.end!).toLocaleString('es-BO')}</b></>
                      )}
                    </div>
                    <Button onClick={saveWindow} disabled={!canSaveWindow || savingWindow} className="flex items-center gap-2">
                      {savingWindow ? <LoadingSpinner /> : <Save className="w-4 h-4" />}
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

          {/* Media (fotos) */}
          {activeTab === 'media' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Fotografías</h3>
                <Button variant="outline" size="small" onClick={refreshMedia} disabled={mediaLoading} className="flex items-center gap-1.5">
                  <RefreshCw className={`w-4 h-4 ${mediaLoading ? 'animate-spin' : ''}`} />
                  Reintentar
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-black/20 rounded-md p-3 border border-white/10">
                  <div className="text-white/80 font-medium mb-2">Foto de producto (vendedor)</div>
                  {sellerUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={sellerUrl} alt="Foto de producto" className="w-full h-72 object-contain rounded-md bg-black/30" />
                  ) : (
                    <div className="w-full h-72 rounded-md bg-black/20 border border-dashed border-white/15 flex items-center justify-center text-white/50 text-sm">
                      Sin imagen disponible
                    </div>
                  )}
                </div>

                <div className="bg-black/20 rounded-md p-3 border border-white/10">
                  <div className="text-white/80 font-medium mb-2">Comprobante de pago (delivery)</div>
                  {paymentUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={paymentUrl} alt="Comprobante de pago" className="w-full h-72 object-contain rounded-md bg-black/30" />
                  ) : (
                    <div className="w-full h-72 rounded-md bg-black/20 border border-dashed border-white/15 flex items-center justify-center text-white/50 text-sm">
                      Sin imagen disponible
                    </div>
                  )}
                </div>
              </div>

              <p className="text-xs text-white/50">
                Las imágenes se leen desde <code>order_media</code> (tipos: <code>product</code> y <code>payment_proof</code>) y se sirven del bucket <code>{MEDIA_BUCKET}</code>.
              </p>
            </div>
          )}

          {/* Estado */}
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
                    <option value="pending">Pendiente</option>
                    <option value="assigned">Asignado</option>
                    <option value="out_for_delivery">En Ruta</option>
                    <option value="delivered">Entregado</option>
                    <option value="confirmed">Confirmado</option>
                    <option value="cancelled">Cancelado</option>
                    <option value="returned">Devuelto</option>
                    <option value="failed">Fallido</option>
                  </select>
                  {order.status === 'delivered' && (
                    <Button onClick={handleConfirmDelivery} disabled={isProcessing} className="bg-emerald-600/80 hover:bg-emerald-600 flex items-center justify-center gap-2">
                      {isProcessing ? <LoadingSpinner /> : <CheckCircle2 className="w-4 h-4" />}
                      Confirmar Entrega
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
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

export default OrderDetailsModal;