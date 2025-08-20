'use client';

import React, { useEffect, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from 'react-leaflet';
import type { Map as LeafletMap } from 'leaflet';
import type { OrderRow, OrderStatus } from '@/types';
import { Target, ZoomIn, ZoomOut } from 'lucide-react';

const SC_CENTER: [number, number] = [-17.7833, -63.1821];

export type StatusColor = Record<OrderStatus, string>;

type Props = {
  center?: [number, number];
  zoom?: number;
  orders: OrderRow[];
  statusColor: StatusColor;
};

function RecenterControl({ center, zoom = 12 }: { center: [number, number]; zoom?: number }) {
  const map = useMap();
  return (
    <button
      onClick={() => map.setView(center, zoom, { animate: true })}
      className="absolute right-4 top-4 z-[1000] bg-gray-900/80 border border-white/15 text-white rounded-md p-2 hover:bg-gray-800"
      title="Centrar en Santa Cruz"
    >
      <Target className="w-4 h-4" />
    </button>
  );
}

function ZoomControls() {
  const map = useMap();
  return (
    <div className="absolute right-4 top-14 z-[1000] flex flex-col gap-2">
      <button
        onClick={() => map.zoomIn()}
        className="bg-gray-900/80 border border-white/15 text-white rounded-md p-2 hover:bg-gray-800"
        title="Acercar"
      >
        <ZoomIn className="w-4 h-4" />
      </button>
      <button
        onClick={() => map.zoomOut()}
        className="bg-gray-900/80 border border-white/15 text-white rounded-md p-2 hover:bg-gray-800"
        title="Alejar"
      >
        <ZoomOut className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function ClientMap({
  center = SC_CENTER,
  zoom = 12,
  orders,
  statusColor,
}: Props) {
  const mapRef = useRef<LeafletMap | null>(null);

  // Invalidar tamaño cuando el contenedor cambie (modal)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const el = map.getContainer();
    const ro = new ResizeObserver(() => map.invalidateSize(false));
    ro.observe(el);

    const t1 = setTimeout(() => map.invalidateSize(false), 50);
    const t2 = setTimeout(() => map.invalidateSize(false), 250);

    return () => {
      ro.disconnect();
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [mapRef.current]);

  return (
    <div className="w-full h-full">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom
        style={{ width: '100%', height: '100%' }}
        ref={(m) => { if (m) mapRef.current = m; }}
        whenReady={() => {
          const m = mapRef.current;
          if (m) requestAnimationFrame(() => m.invalidateSize(false));
        }}
      >
        {/* Basemap Carto rápido, sin API key */}
        <TileLayer
          url="https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://www.carto.com/">CARTO</a>'
          subdomains="abcd"
          maxZoom={20}
        />

        {orders.map((o) => {
          const lat = Number(o.delivery_geo_lat);
          const lng = Number(o.delivery_geo_lng);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

          const color = statusColor[o.status] ?? '#999';

          return (
            <CircleMarker
              key={o.id}
              center={[lat, lng]}
              radius={8}
              pathOptions={{ color, fillColor: color, fillOpacity: 0.9, weight: 1 }}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold text-white">
                    Pedido #{o.order_no ?? o.id.slice(0, 6)}
                  </div>
                  <div className="text-white/80">Cliente: {o.customer_name ?? 'N/A'}</div>
                  {o.customer_phone && <div className="text-white/70">Tel: {o.customer_phone}</div>}
                  {o.delivery_address && <div className="text-white/70">Dir: {o.delivery_address}</div>}
                  <div className="text-white/60 capitalize">
                    Estado: {o.status.replaceAll('_', ' ')}
                  </div>
                  {o.amount != null && (
                    <div className="text-white/80 mt-1">Total: Bs {o.amount.toFixed(2)}</div>
                  )}
                  <div className="mt-2">
                    <a
                      className="text-blue-400 hover:underline"
                      href={`https://www.google.com/maps?q=${lat},${lng}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Abrir en Google Maps
                    </a>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        <RecenterControl center={center} />
        <ZoomControls />
      </MapContainer>
    </div>
  );
}