// src/components/OrderCard.tsx (VERSIÓN FINAL Y CORREGIDA)
'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { 
  MapPin, Phone, User, Calendar, Clock, CreditCard, Save, 
  MoreVertical, Package, CheckCircle2, 
  Truck, Eye, EyeOff 
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/Card';
import { Button } from '@/components/Button';
import { StatusBadge } from '@/components/StatusBadge';
import { cn } from '@/lib/utils/cn';
import type { OrderCardProps, LatLng, DeliveryUser, AddressSuggestion, OrderStatus, OrderRow } from '@/lib/types';

const MapPicker = dynamic(() => import('./MapPicker'), { 
  ssr: false,
  loading: () => <div className="h-60 bg-black/20 rounded-lg animate-pulse flex items-center justify-center"><div className="text-white/40">Cargando mapa...</div></div>
});

const AddressSearch = dynamic(() => import('./AddressSearch'), {
  ssr: false,
  loading: () => <div className="w-full h-[42px] bg-black/50 border border-white/15 rounded-lg animate-pulse" />
});

const OrderCard: React.FC<OrderCardProps> = ({
  order,
  deliveries,
  onAssign,
  onSaveLocation,
  onConfirm,
  onStatusChange,
  compact = false,
  showMap = true
}) => {
  const [selectedDelivery, setSelectedDelivery] = React.useState(order.delivery_assigned_to ?? '');
  
  // ▼▼▼ CORRECCIÓN 1: Usar las columnas correctas de la DB ('delivery_address', etc.) ▼▼▼
  const [address, setAddress] = React.useState(order.delivery_address ?? '');
  const [notes, setNotes] = React.useState(order.notes ?? '');
  const [position, setPosition] = React.useState<LatLng | undefined>(() =>
    order.delivery_geo_lat != null && order.delivery_geo_lng != null
      ? { lat: Number(order.delivery_geo_lat), lng: Number(order.delivery_geo_lng) }
      : undefined
  );
  
  const [mapVisible, setMapVisible] = React.useState(showMap);
  const [isAssigning, setIsAssigning] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  const assignedDelivery = deliveries.find((d: DeliveryUser) => d.id === order.delivery_assigned_to);

  const handleAssign = async () => {
    if (!selectedDelivery) return;
    setIsAssigning(true);
    try {
      await onAssign(order.id, selectedDelivery);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleSaveLocation = async () => {
    setIsSaving(true);
    try {
      // ▼▼▼ CORRECCIÓN 2: El patch debe usar las columnas correctas de la DB ▼▼▼
      const patch: Partial<OrderRow> = {
        delivery_address: address.trim() ? address.trim() : null,
        notes: notes.trim() ? notes.trim() : null,
        delivery_geo_lat: position?.lat ?? null,
        delivery_geo_lng: position?.lng ?? null,
      };
      await onSaveLocation(order.id, patch);
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch { return dateStr; }
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return null;
    try {
      return timeStr.slice(0, 5);
    } catch { return timeStr; }
  };

  if (compact) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <span className="font-semibold text-white">#{order.order_no ?? order.id.slice(0, 8)}</span>
              <StatusBadge status={order.status} />
            </div>
            <div className="text-sm text-white/70 truncate">
              {order.customer_name} • Bs {(order.amount ?? 0).toFixed(2)}
            </div>
          </div>
          {/* ▼▼▼ CORRECCIÓN 3: Usar 'order.seller' para el nombre del repartidor ▼▼▼ */}
          {order.seller && (
            <div className="text-sm text-white/60 flex items-center gap-1">
              <Truck className="w-4 h-4" />
              <span className="truncate">{order.seller}</span>
            </div>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-white">Pedido #{order.order_no ?? order.id.slice(0, 8)}</h3>
              <StatusBadge status={order.status} />
            </div>
            <div className="text-sm text-white/60 mb-3">
              <span className="text-white font-medium">Bs {(order.amount ?? 0).toFixed(2)}</span>
              {order.local && <> • Sucursal: <span className="text-white">{order.local}</span></>}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/70">
              {order.customer_name && <span className="flex items-center gap-1.5"><User className="w-4 h-4" />{order.customer_name}</span>}
              {order.customer_phone && <span className="flex items-center gap-1.5"><Phone className="w-4 h-4" />{order.customer_phone}</span>}
              {order.payment_method && <span className="flex items-center gap-1.5"><CreditCard className="w-4 h-4" />{order.payment_method}</span>}
            </div>
            {(order.delivery_date || order.delivery_from || order.delivery_to) && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/70 mt-2">
                {order.delivery_date && <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />{formatDate(order.delivery_date)}</span>}
                {(order.delivery_from || order.delivery_to) && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    {formatTime(order.delivery_from ?? null)}
                    {order.delivery_to ? `–${formatTime(order.delivery_to ?? null)}` : ''}
                  </span>
                )}
              </div>
            )}
          </div>
          <button className="p-2 hover:bg-white/10 rounded-lg transition-colors"><MoreVertical className="w-4 h-4 text-white/60" /></button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-white">Delivery asignado</label>
            {assignedDelivery && <div className="flex items-center gap-2 text-sm text-white/70"><Package className="w-4 h-4" />Carga: {assignedDelivery.current_load ?? 0}/{assignedDelivery.max_load ?? 10}</div>}
          </div>
          <div className="flex gap-2">
            <select value={selectedDelivery} onChange={(e) => setSelectedDelivery(e.target.value)} className="flex-1 bg-black/60 border border-white/15 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50" disabled={isAssigning}>
              <option value="">Seleccionar delivery...</option>
              {deliveries.map((delivery: DeliveryUser) => (
                <option key={delivery.id} value={delivery.id}>
                  {delivery.full_name ?? delivery.id} 
                  {delivery.current_load !== undefined && ` (${delivery.current_load}/${delivery.max_load ?? 10})`}
                </option>
              ))}
            </select>
            <Button onClick={handleAssign} disabled={!selectedDelivery || isAssigning} loading={isAssigning} size="medium">Asignar</Button>
          </div>
          {assignedDelivery && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-center gap-2 text-green-400"><CheckCircle2 className="w-4 h-4" /><span className="text-sm font-medium">Asignado a {assignedDelivery.full_name}</span></div>
              {assignedDelivery.phone && <div className="text-xs text-green-300/80 mt-1">Tel: {assignedDelivery.phone}</div>}
            </div>
          )}
        </div>
        <div className="space-y-3">
          <label className="text-sm font-medium text-white">Dirección de entrega</label>
          <AddressSearch value={address} onChange={setAddress} onPick={(suggestion: AddressSuggestion) => { setAddress(suggestion.label); setPosition(suggestion.pos); }} placeholder="Buscar dirección o referencia..." />
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-white">Ubicación en mapa</label>
            <Button variant="ghost" size="small" onClick={() => setMapVisible(!mapVisible)} className="flex items-center gap-1.5">{mapVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}{mapVisible ? 'Ocultar' : 'Mostrar'}</Button>
          </div>
          {mapVisible && (
            <div className="space-y-3">
              <MapPicker value={position} defaultCenter={{ lat: -17.3895, lng: -66.1568 }} zoom={14} onChange={setPosition} height={300} />
              <div className="flex items-center justify-between text-xs">
                {position ? <div className="flex items-center gap-2 text-white/60"><MapPin className="w-4 h-4" /><span>Lat: {position.lat.toFixed(6)} • Lng: {position.lng.toFixed(6)}</span></div> : <span className="text-white/60">Sin coordenadas</span>}
                <Button onClick={handleSaveLocation} loading={isSaving} size="small" className="bg-green-600/80 hover:bg-green-600 flex items-center gap-1.5"><Save className="w-4 h-4" />Guardar ubicación</Button>
              </div>
            </div>
          )}
        </div>
        <div className="space-y-3">
          <label className="text-sm font-medium text-white">Instrucciones de entrega</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Instrucciones especiales: llamar cuando estén cerca, edificio, piso, referencia, etc." className="w-full bg-black/50 border border-white/15 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none" rows={3} />
        </div>
        {onConfirm && order.status === 'delivered' && (
          <div className="pt-4 mt-4 border-t border-white/10"><Button onClick={() => onConfirm(order.id)} className="w-full bg-emerald-600/80 hover:bg-emerald-600 flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4" />Confirmar entrega</Button></div>
        )}
        {onStatusChange && (
          <div className="pt-4 mt-4 border-t border-white/10">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-white/60">Cambiar estado manual:</span>
              <select onChange={(e) => onStatusChange(order.id, e.target.value as OrderStatus)} className="bg-black/60 border border-white/15 rounded px-2 py-1 text-white text-xs" defaultValue={order.status}>
                <option value="pending">Pendiente</option>
                <option value="assigned">Asignado</option>
                <option value="out_for_delivery">En ruta</option>
                <option value="delivered">Entregado</option>
                <option value="confirmed">Confirmado</option>
                <option value="canceled">Cancelado</option>
                <option value="failed">Falló</option>
              </select>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OrderCard;
