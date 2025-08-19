// src/components/OrderDetailsModal.tsx (VERSIÓN FINAL Y BLINDADA)
'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import type { OrderRow, DeliveryUser, OrderStatus, LatLng, AddressSuggestion } from '@/types';

// --- Componentes ---
import Button from './Button';
import { StatusBadge } from './StatusBadge';
import LoadingSpinner from './LoadingSpinner';
import { Card, CardContent, CardHeader } from './Card';

// --- Componentes Dinámicos ---
const AddressSearch = dynamic(() => import('./AddressSearch'), { ssr: false, loading: () => <div className="w-full h-[42px] bg-black/50 border border-white/15 rounded-lg animate-pulse" /> });
const MapPicker = dynamic(() => import('./MapPicker'), { ssr: false, loading: () => <div className="h-60 bg-black/20 rounded-lg animate-pulse flex items-center justify-center"><div className="text-white/40">Cargando mapa...</div></div> });

// --- Iconos ---
import { X, User, Phone, MapPin, Calendar, Clock, CreditCard, Package, Truck, Save, CheckCircle2, AlertCircle, Eye, EyeOff, Navigation } from 'lucide-react';

interface Props {
  order: OrderRow;
  deliveries: DeliveryUser[];
  onClose: () => void;
  onAssignDelivery: (orderId: string, deliveryId: string) => Promise<void>;
  onSaveLocation: (orderId: string, patch: Partial<Pick<OrderRow, 'delivery_address' | 'notes' | 'delivery_geo_lat' | 'delivery_geo_lng'>>) => Promise<void>;
  onConfirmDelivered: (orderId: string) => Promise<void>;
  onStatusChange: (orderId: string, newStatus: OrderStatus) => Promise<void>;
}

export function OrderDetailsModal({ order, deliveries, onClose, onAssignDelivery, onSaveLocation, onConfirmDelivered, onStatusChange }: Props) {
  const [selectedDelivery, setSelectedDelivery] = useState<string>(order.delivery_assigned_to || '');
  const [address, setAddress] = useState(order.delivery_address || '');
  const [notes, setNotes] = useState(order.notes || '');
  const [position, setPosition] = useState<LatLng | undefined>(() => order.delivery_geo_lat != null && order.delivery_geo_lng != null ? { lat: Number(order.delivery_geo_lat), lng: Number(order.delivery_geo_lng) } : undefined);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mapVisible, setMapVisible] = useState(true);
  const [activeTab, setActiveTab] = useState<'assign' | 'location' | 'status'>('assign');

  const assignedDelivery = deliveries.find(d => d.id === order.delivery_assigned_to);

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'No especificada';
    try { return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } 
    catch { return dateStr; }
  };

  const formatTime = (timeStr: string | null | undefined) => {
    if (!timeStr) return null;
    try { return timeStr.slice(0, 5); } 
    catch { return timeStr; }
  };

  const handleAction = async (action: () => Promise<void>, successMessage: string) => {
    setError(null);
    setSuccess(null);
    setIsProcessing(true);
    try {
      await action();
      setSuccess(successMessage);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error inesperado.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAssignClick = () => {
    if (!selectedDelivery) {
      setError('Debes seleccionar un repartidor.');
      return;
    }
    handleAction(() => onAssignDelivery(order.id, selectedDelivery), '¡Pedido asignado correctamente!');
  };

  const handleSaveLocation = () => {
    // ▼▼▼ CORRECCIÓN: El patch debe usar las columnas correctas de la DB ▼▼▼
    const patch: Partial<Pick<OrderRow, 'delivery_address' | 'notes' | 'delivery_geo_lat' | 'delivery_geo_lng'>> = {
      delivery_address: address.trim() || null,
      notes: notes.trim() || null,
      delivery_geo_lat: position?.lat ?? null,
      delivery_geo_lng: position?.lng ?? null,
    };
    handleAction(() => onSaveLocation(order.id, patch), '¡Ubicación guardada correctamente!');
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as OrderStatus;
    handleAction(() => onStatusChange(order.id, newStatus), `Estado cambiado a ${newStatus.replace('_', ' ')}`);
  };

  const handleConfirmDelivery = () => {
    handleAction(() => onConfirmDelivered(order.id), '¡Entrega confirmada correctamente!');
  };

  const handleAddressPick = (suggestion: AddressSuggestion) => {
    setAddress(suggestion.label);
    if (suggestion.pos) setPosition(suggestion.pos);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-white/20 rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] flex flex-col" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <header className="p-4 sm:p-6 border-b border-white/10 flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-bold text-white">Pedido <span className="font-mono text-blue-400">#{order.order_no || order.id.substring(0, 8)}</span></h2>
              <StatusBadge status={order.status} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-white/70">
              {order.customer_name && <div className="flex items-center gap-2"><User className="w-4 h-4" /><span>{order.customer_name}</span></div>}
              {order.customer_phone && <div className="flex items-center gap-2"><Phone className="w-4 h-4" /><span>{order.customer_phone}</span></div>}
              {order.amount && <div className="flex items-center gap-2"><CreditCard className="w-4 h-4" /><span className="text-white font-medium">Bs {order.amount.toFixed(2)}</span></div>}
              <div className="flex items-center gap-2"><Calendar className="w-4 h-4" /><span>{formatDate(order.created_at)}</span></div>
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

        <div className="px-4 sm:px-6 pt-4">
          <div className="flex space-x-1 bg-black/20 p-1 rounded-lg">
            <button onClick={() => setActiveTab('assign')} className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${activeTab === 'assign' ? 'bg-blue-600 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'}`}><Truck className="w-4 h-4 inline mr-2" />Asignación</button>
            <button onClick={() => setActiveTab('location')} className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${activeTab === 'location' ? 'bg-blue-600 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'}`}><MapPin className="w-4 h-4 inline mr-2" />Ubicación</button>
            <button onClick={() => setActiveTab('status')} className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${activeTab === 'status' ? 'bg-blue-600 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'}`}><Package className="w-4 h-4 inline mr-2" />Estado</button>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1">
          {activeTab === 'assign' && (
            <div className="space-y-6">
              {assignedDelivery && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-green-400" /></div>
                      <div className="flex-1">
                        <h4 className="font-medium text-white">Asignado a {assignedDelivery.full_name}</h4>
                        <div className="text-sm text-white/60 flex items-center gap-4">
                          {assignedDelivery.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{assignedDelivery.phone}</span>}
                          {assignedDelivery.vehicle_type && <span className="flex items-center gap-1"><Truck className="w-3 h-3" />{assignedDelivery.vehicle_type}</span>}
                          <span className="flex items-center gap-1"><Package className="w-3 h-3" />Carga: {assignedDelivery.current_load || 0}/{assignedDelivery.max_load || 10}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="bg-black/20 p-4 rounded-md">
                <h3 className="font-semibold mb-3 text-white/90">{assignedDelivery ? 'Reasignar Repartidor' : 'Asignar Repartidor'}</h3>
                <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2">
                  <select value={selectedDelivery} onChange={(e) => setSelectedDelivery(e.target.value)} className="w-full bg-gray-800 border border-white/20 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={isProcessing}>
                    <option value="">-- Seleccionar repartidor --</option>
                    {deliveries.map(d => <option key={d.id} value={d.id}>{d.full_name} ({d.current_load || 0}/{d.max_load || 10}){d.vehicle_type && ` - ${d.vehicle_type}`}</option>)}
                  </select>
                  {/* ▼▼▼ ESTA ES LA LÍNEA DE BLINDAJE ▼▼▼ */}
                  <Button onClick={handleAssignClick} disabled={!selectedDelivery || isProcessing || selectedDelivery === order.delivery_assigned_to} className="w-full sm:w-auto">
                    {isProcessing ? <LoadingSpinner /> : (assignedDelivery ? 'Reasignar' : 'Asignar')}
                  </Button>
                </div>
              </div>
              
              {/* El resto del código de la pestaña de asignación no necesita cambios */}
            </div>
          )}

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
                    <MapPicker value={position} defaultCenter={{ lat: -17.3895, lng: -66.1568 }} zoom={14} onChange={setPosition} height={300} />
                    <div className="flex items-center justify-between text-xs">
                      {position ? <div className="flex items-center gap-2 text-white/60"><Navigation className="w-4 h-4" /><span>Lat: {position.lat.toFixed(6)} • Lng: {position.lng.toFixed(6)}</span></div> : <span className="text-white/60">Haz clic en el mapa para establecer coordenadas</span>}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">Instrucciones de Entrega</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Instrucciones especiales: llamar cuando estén cerca, edificio, piso, referencia, etc." className="w-full bg-black/50 border border-white/15 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none" rows={4} />
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveLocation} disabled={isProcessing} className="bg-green-600/80 hover:bg-green-600 flex items-center gap-2">
                  {isProcessing ? <LoadingSpinner /> : <Save className="w-4 h-4" />}
                  Guardar Ubicación
                </Button>
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
                      <div>{formatDate(order.updated_at || order.created_at)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <div className="bg-black/20 p-4 rounded-md">
                <h3 className="font-semibold mb-3 text-white/90">Cambiar Estado</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <select value={order.status} onChange={handleStatusChange} className="w-full bg-gray-800 border border-white/20 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={isProcessing}>
                    <option value="pending">Pendiente</option>
                    <option value="assigned">Asignado</option>
                    <option value="out_for_delivery">En Ruta</option>
                    <option value="delivered">Entregado</option>
                    <option value="confirmed">Confirmado</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                  {order.status === 'delivered' && <Button onClick={handleConfirmDelivery} disabled={isProcessing} className="bg-emerald-600/80 hover:bg-emerald-600 flex items-center justify-center gap-2">{isProcessing ? <LoadingSpinner /> : <CheckCircle2 className="w-4 h-4" />}Confirmar Entrega</Button>}
                </div>
              </div>
              {(order.delivery_date || order.delivery_from || order.delivery_to) && (
                <Card>
                  <CardHeader><h4 className="font-medium text-white flex items-center gap-2"><Clock className="w-4 h-4" />Programación de Entrega</h4></CardHeader>
                  <CardContent className="space-y-2">
                    {order.delivery_date && <div className="flex items-center gap-2 text-sm"><Calendar className="w-4 h-4 text-white/60" /><span className="text-white/60">Fecha:</span><span className="text-white">{formatDate(order.delivery_date)}</span></div>}
                    {(order.delivery_from || order.delivery_to) && <div className="flex items-center gap-2 text-sm"><Clock className="w-4 h-4 text-white/60" /><span className="text-white/60">Horario:</span><span className="text-white">{formatTime(order.delivery_from)} {order.delivery_to && ` - ${formatTime(order.delivery_to)}`}</span></div>}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        <footer className="p-4 bg-black/20 border-t border-white/10 flex justify-between items-center">
          <div className="text-sm text-white/60">ID: <span className="font-mono">{order.id}</span></div>
          <Button variant="secondary" onClick={onClose} disabled={isProcessing}>Cerrar</Button>
        </footer>
      </div>
    </div>
  );
}
