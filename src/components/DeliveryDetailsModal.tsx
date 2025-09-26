// src/components/DeliveryDetailsModal.tsx
'use client';

import React from 'react';
import type {
  DeliveryUser,
  DeliveryRoute,
  DeliveryMetrics,
  EnrichedDeliveryRoute
} from '@/lib/types';
import { Button } from './Button';
import { Card, CardContent, CardHeader } from './Card';
import { X, MapPin, CheckCircle2, Clock } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

type Props = {
  delivery: DeliveryUser;
  routes: (DeliveryRoute | EnrichedDeliveryRoute)[];
  metrics?: DeliveryMetrics | null;
  onClose: () => void;

  // NUEVO: permite que la página padre guarde la ventana de entrega
  onSaveSchedule?: (args: {
    orderId: string;
    deliveryUserId: string;
    desde: string; // ISO local para <input type="datetime-local">
    hasta: string; // ISO local
  }) => Promise<void>;
};

const statusLabel = (s: string) =>
  s.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());

// util: datetime -> value para <input type="datetime-local">
const toLocalInputValue = (dt: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(
    dt.getHours()
  )}:${pad(dt.getMinutes())}`;
};

export default function DeliveryDetailsModal({
  delivery,
  routes,
  metrics,
  onClose,
  onSaveSchedule,
}: Props) {
  const todayCount = routes.length;
  const completed = routes.filter((r) => (r as any).status === 'completed').length;
  const inProgress = routes.filter((r) => (r as any).status === 'in_progress').length;
  const pending = routes.filter((r) => (r as any).status === 'pending').length;

  // --- Estado del programador de ventana (solo si onSaveSchedule existe) ---
  const [selectedOrderId, setSelectedOrderId] = React.useState<string>(() => {
    const first = routes[0] as any;
    return first?.order_id ?? first?.id ?? '';
  });
  const [desde, setDesde] = React.useState('');
  const [hasta, setHasta] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [saveMsg, setSaveMsg] = React.useState<string | null>(null);
  const [errMsg, setErrMsg] = React.useState<string | null>(null);

  const canSave =
    !!onSaveSchedule &&
    !!selectedOrderId &&
    !!desde &&
    !!hasta &&
    new Date(hasta) > new Date(desde);

  const handleSaveWindow = async () => {
    if (!canSave || !onSaveSchedule) return;
    setSaving(true);
    setErrMsg(null);
    setSaveMsg(null);
    try {
      await onSaveSchedule({
        orderId: selectedOrderId,
        deliveryUserId: (delivery as any).id || (delivery as any).user_id || '',
        desde,
        hasta,
      });
      setSaveMsg('✅ Ventana guardada.');
      setTimeout(() => setSaveMsg(null), 2000);
    } catch (e: any) {
      setErrMsg(e?.message || 'Error al guardar ventana.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[95vh] w-full max-w-3xl flex-col rounded-lg border border-white/20 bg-gray-900 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <h3 className="text-lg font-semibold text-white">{delivery.full_name}</h3>
            <div className="mt-1 text-sm text-white/60">
              {delivery.vehicle_type ? `Vehículo: ${delivery.vehicle_type}` : 'Sin vehículo declarado'}
              {delivery.phone ? ` • ${delivery.phone}` : ''}
            </div>
          </div>
          <button onClick={onClose} className="rounded-md p-2 hover:bg-white/10">
            <X className="h-5 w-5 text-white/60" />
          </button>
        </header>

        <div className="grid flex-1 grid-cols-1 gap-4 overflow-y-auto p-4 sm:grid-cols-3">
          {/* KPIs */}
          <Card>
            <CardHeader>
              <div className="text-sm text-white/60">Rutas de hoy</div>
              <div className="text-2xl font-bold text-white">{todayCount}</div>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <div className="text-sm text-white/60">Completadas</div>
              <div className="text-2xl font-bold text-green-400">{completed}</div>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <div className="text-sm text-white/60">Pendientes / En curso</div>
              <div className="text-2xl font-bold text-yellow-300">{pending + inProgress}</div>
            </CardHeader>
          </Card>

          {/* Métricas (si hay) */}
          {metrics && (
            <Card className="sm:col-span-3">
              <CardHeader>
                <div className="text-white">Métricas del día</div>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <div className="text-xs text-white/60">Distancia (km)</div>
                  <div className="text-lg font-semibold text-white">
                    {metrics.total_distance_km ?? 0}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-white/60">Tiempo total (min)</div>
                  <div className="text-lg font-semibold text-white">
                    {metrics.total_delivery_time_minutes ?? 0}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-white/60">Completadas</div>
                  <div className="text-lg font-semibold text-white">
                    {metrics.completed_routes ?? 0}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-white/60">Eficiencia</div>
                  <div className="text-lg font-semibold text-white">{metrics.efficiency ?? 0}%</div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Programar Ventana de Entrega (solo si hay callback) */}
          {onSaveSchedule && (
            <Card className="sm:col-span-3">
              <CardHeader>
                <div className="text-white font-semibold">Programar Ventana de Entrega</div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs text-white/60">Pedido</label>
                    <select
                      value={selectedOrderId}
                      onChange={(e) => setSelectedOrderId(e.target.value)}
                      className="w-full rounded-md border border-white/20 bg-gray-800 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {routes.map((r) => {
                        const id = (r as any).order_id ?? (r as any).id;
                        const label = `#${(r as any).order_no ?? 'S/N'}`;
                        return (
                          <option key={id} value={id}>
                            {label}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-white/60">Desde</label>
                    <input
                      type="datetime-local"
                      value={desde}
                      onChange={(e) => setDesde(e.target.value)}
                      className="w-full rounded-md border border-white/20 bg-gray-800 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-white/60">Hasta</label>
                    <input
                      type="datetime-local"
                      value={hasta}
                      onChange={(e) => setHasta(e.target.value)}
                      className="w-full rounded-md border border-white/20 bg-gray-800 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-xs text-white/60">
                    {saveMsg && <span className="text-emerald-300">{saveMsg}</span>}
                    {errMsg && <span className="text-red-300">{errMsg}</span>}
                  </div>
                  <Button
                    onClick={handleSaveWindow}
                    disabled={!canSave || saving}
                    className="flex items-center gap-2"
                  >
                    {saving ? (
                      <span className="animate-pulse">Guardando…</span>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Guardar Ventana
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-white/50">
                  * Esta acción enviará la ventana al backend (bloquea solapes y puede advertir
                  direcciones duplicadas).
                </p>
              </CardContent>
            </Card>
          )}

          {/* Listado de rutas del día */}
          <Card className="sm:col-span-3">
            <CardHeader>
              <div className="text-white">Rutas asignadas</div>
            </CardHeader>
            <CardContent className="space-y-3">
              {routes.length === 0 && (
                <div className="rounded-md border border-white/10 bg-black/20 p-4 text-center text-white/60">
                  No hay rutas para hoy.
                </div>
              )}

              {routes.map((r) => (
                <div
                  key={(r as any).id}
                  className="flex flex-col gap-3 rounded-md border border-white/10 bg-black/20 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={(r as any).status as any} />
                      <div className="text-sm text-white/80">Pedido #{(r as any).order_no ?? 'S/N'}</div>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-white/60">
                      {(r as any).estimated_travel_time_seconds != null && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {Math.round((r as any).estimated_travel_time_seconds / 60)} min
                        </span>
                      )}
                      {(r as any).distance_meters != null && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {((r as any).distance_meters / 1000).toFixed(1)} km
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Comprobante de entrega si existe */}
                  {(r as any).proof_image_url ? (
                    <a
                      href={(r as any).proof_image_url}
                      target="_blank"
                      rel="noreferrer"
                      className="block w-full max-w-[160px] rounded border border-white/10 bg-black/30 p-2 hover:bg-black/40"
                    >
                      <div className="mb-1 text-center text-[11px] text-white/60">Comprobante</div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={(r as any).proof_image_url}
                        alt="Comprobante de entrega"
                        className="h-24 w-full rounded object-cover"
                      />
                    </a>
                  ) : (
                    <div className="w-full max-w-[160px] rounded border border-dashed border-white/10 bg-black/20 p-3 text-center text-[11px] text-white/50">
                      Sin comprobante
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <footer className="flex items-center justify-end border-t border-white/10 p-3">
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        </footer>
      </div>
    </div>
  );
}