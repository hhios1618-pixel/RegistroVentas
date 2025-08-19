// src/components/DeliveryDetailsModal.tsx (VERSIÓN FINAL Y CORREGIDA)
'use client';

import React from 'react';
// ▼▼▼ CORRECCIÓN 1: Se importa 'OrderStatus' que faltaba ▼▼▼
import type { DeliveryUser, DeliveryMetrics, EnrichedDeliveryRoute, OrderStatus } from '@/types';
import { X, User, Phone, Truck, BarChart2, MapPin, Clock, PackageCheck } from 'lucide-react';
import { Card, CardContent, CardHeader } from './Card';
import Button from './Button';
import { StatusBadge } from './StatusBadge';

interface Props {
  delivery: DeliveryUser;
  routes: EnrichedDeliveryRoute[];
  metrics?: DeliveryMetrics | null;
  onClose: () => void;
}

// Función para obtener la fecha actual en la zona horaria de Bolivia
const getBoliviaDateString = () => {
  const now = new Date();
  const boliviaDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/La_Paz' }));
  const year = boliviaDate.getFullYear();
  const month = String(boliviaDate.getMonth() + 1).padStart(2, '0');
  const day = String(boliviaDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function DeliveryDetailsModal({ delivery, routes, metrics, onClose }: Props) {
  const today = getBoliviaDateString();
  const todayRoutes = routes.filter(r => r.route_date === today);
  const completedToday = todayRoutes.filter(r => r.status === 'completed').length;
  const efficiency = metrics?.efficiency ?? (todayRoutes.length > 0 ? Math.round((completedToday / todayRoutes.length) * 100) : 0);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-gray-900 border border-white/20 rounded-lg shadow-xl w-full max-w-2xl max-h-[95vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="p-4 sm:p-6 border-b border-white/10 flex justify-between items-start">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-900/50 flex items-center justify-center border border-blue-700">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{delivery.full_name}</h2>
              <div className="text-sm text-white/60 flex items-center gap-4 mt-1">
                {delivery.phone && <span className="flex items-center gap-1.5"><Phone className="w-3 h-3" />{delivery.phone}</span>}
                {delivery.vehicle_type && <span className="flex items-center gap-1.5"><Truck className="w-3 h-3" />{delivery.vehicle_type}</span>}
              </div>
            </div>
          </div>
          <Button variant="ghost" onClick={onClose} className="p-2"><X className="w-5 h-5" /></Button>
        </header>

        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1">
          <Card>
            <CardHeader><h3 className="font-semibold text-white flex items-center gap-2"><BarChart2 className="w-4 h-4" />Rendimiento de Hoy</h3></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-sm text-gray-400">Rutas Totales</p>
                <p className="text-2xl font-bold">{todayRoutes.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Completadas</p>
                <p className="text-2xl font-bold text-green-400">{completedToday}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Distancia</p>
                <p className="text-2xl font-bold">{metrics?.total_distance_km ?? 0} km</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Eficiencia</p>
                <p className="text-2xl font-bold text-blue-400">{efficiency}%</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><h3 className="font-semibold text-white flex items-center gap-2"><MapPin className="w-4 h-4" />Rutas Asignadas</h3></CardHeader>
            <CardContent className="space-y-3 max-h-60 overflow-y-auto">
              {todayRoutes.length > 0 ? (
                todayRoutes.map(route => (
                  <div key={route.id} className="p-3 bg-black/30 rounded-lg border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-yellow-400" />
                      <div>
                        <p className="font-medium text-white">Pedido #{route.order_no || route.order_id.slice(0, 8)}</p>
                        {/* ▼▼▼ CORRECCIÓN 2: Se quita la prop 'size' que no existe ▼▼▼ */}
                        <StatusBadge status={route.status as OrderStatus} />
                      </div>
                    </div>
                    <div className="text-sm text-gray-400">Seq: {route.sequence_number || '-'}</div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <PackageCheck className="w-8 h-8 mx-auto mb-2" />
                  <p>No hay rutas asignadas para hoy.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <footer className="p-4 bg-black/20 border-t border-white/10 flex justify-end">
          <Button variant="secondary" onClick={onClose}>Cerrar</Button>
        </footer>
      </div>
    </div>
  );
}
