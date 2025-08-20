'use client';

import React, { useMemo, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import type { MapOverviewProps } from './MapOverviewModal';
import 'leaflet/dist/leaflet.css';

const STATUS_COLOR: Record<string, string> = {
  pending: '#f59e0b',
  assigned: '#3b82f6',
  out_for_delivery: '#a855f7',
  delivered: '#10b981',
  confirmed: '#22c55e',
  cancelled: '#ef4444',
  returned: '#fb7185',
  failed: '#f97316',
};

function RecenterControl({ center }: { center: [number, number] }) {
  const map = useMap();
  return (
    <button
      onClick={() => map.setView(center, map.getZoom(), { animate: true })}
      className="absolute right-3 top-16 z-[1000] rounded-md border border-white/10 bg-black/40 px-2 py-1 text-xs text-white hover:bg-black/60"
      aria-label="Centrar"
    >
      ⌖
    </button>
  );
}

export default function MapOverviewModalClient({
  orders,
  onClose,
  defaultCenter = { lat: -17.7833, lng: -63.1821 },
  defaultZoom = 12,
}: MapOverviewProps) {
  const [visible, setVisible] = useState<Record<string, boolean>>({
    pending: true,
    assigned: true,
    out_for_delivery: true,
    delivered: true,
    confirmed: true,
    cancelled: false,
    returned: false,
    failed: false,
  });

  const markers = useMemo(
    () =>
      orders.filter(o => {
        if (o.delivery_geo_lat == null || o.delivery_geo_lng == null) return false;
        const key = String(o.status ?? 'pending');
        return visible[key] ?? true;
      }),
    [orders, visible],
  );

  const centerTuple: [number, number] = [defaultCenter.lat, defaultCenter.lng];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="relative h-[85vh] w-[calc(100vw-2rem)] max-w-6xl rounded-lg border border-white/10 bg-[#0b1220] shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-white/80">
            <span className="text-white">Mapa Operativo – Santa Cruz</span>
            <span className="text-white/50">({markers.length} pedidos visibles)</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-md bg-white/10 px-2 py-1 text-sm text-white hover:bg-white/20"
          >
            Cerrar
          </button>
        </header>

        {/* Leyenda / filtros */}
        <aside className="absolute left-4 top-16 z-[1000] rounded-md border border-white/10 bg-black/40 p-3 text-xs text-white/80">
          <div className="mb-2 font-medium text-white">Estados</div>
          {Object.keys(STATUS_COLOR).map((k) => (
            <label key={k} className="flex cursor-pointer items-center gap-2 py-0.5">
              <input
                type="checkbox"
                checked={!!visible[k]}
                onChange={(e) => setVisible(v => ({ ...v, [k]: e.target.checked }))}
              />
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: STATUS_COLOR[k] }} />
              <span className="capitalize">{k.replaceAll('_', ' ')}</span>
            </label>
          ))}
        </aside>

        <div className="relative h-[calc(85vh-48px)] w-full">
          <MapContainer
            center={centerTuple}
            zoom={defaultZoom}
            scrollWheelZoom
            whenReady={() => {
              // nada especial; evita el warning de tipos
            }}
            style={{ width: '100%', height: '100%' }}
          >
            {/* Fondo: Carto (sin key) */}
            <TileLayer
              attribution='&copy; OpenStreetMap &amp; CARTO'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />

            {/* Botón de recentrar */}
            <RecenterControl center={centerTuple} />

            {/* Marcadores */}
            {markers.map((o) => {
              const lat = Number(o.delivery_geo_lat);
              const lng = Number(o.delivery_geo_lng);
              const color = STATUS_COLOR[String(o.status ?? 'pending')] ?? '#3b82f6';
              return (
                <CircleMarker
                  key={o.id}
                  center={[lat, lng]}
                  radius={7}
                  pathOptions={{ color, weight: 2, fillColor: color, fillOpacity: 0.25 }}
                >
                  <Popup>
                    <div className="text-xs text-slate-900">
                      <div className="font-semibold">
                        Pedido #{o.order_no ?? 'S/N'} — <span className="capitalize">{String(o.status).replaceAll('_', ' ')}</span>
                      </div>
                      {o.customer_name && <div>Cliente: {o.customer_name}</div>}
                      {o.delivery_address && <div>Dirección: {o.delivery_address}</div>}
                      {(o.delivery_date || o.delivery_from || o.delivery_to) && (
                        <div className="mt-1">
                          <div>Fecha: {o.delivery_date ?? '—'}</div>
                          <div>
                            Hora: {o.delivery_from?.slice(0,5) ?? '—'} {o.delivery_to ? `– ${o.delivery_to.slice(0,5)}` : ''}
                          </div>
                        </div>
                      )}
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}