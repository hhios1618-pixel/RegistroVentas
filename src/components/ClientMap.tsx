'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from 'react-leaflet';
import type { Map as LeafletMap } from 'leaflet';
import type { OrderRow, OrderStatus } from '@/lib/types';
import { Target, ZoomIn, ZoomOut, MapPin, Navigation, Layers } from 'lucide-react';

const SC_CENTER: [number, number] = [-17.7833, -63.1821];

export type StatusColor = Record<OrderStatus, string>;

type Props = {
  center?: [number, number];
  zoom?: number;
  orders: OrderRow[];
  statusColor: StatusColor;
};

function RecenterControl({ center, zoom = 12 }: { center: [number, number]; zoom?: number }) {
  const map = useMap() as LeafletMap; // tip explícito
  const [isAnimating, setIsAnimating] = useState(false);

  const handleRecenter = () => {
    setIsAnimating(true);
    map.setView(center, zoom, { animate: true, duration: 0.8 });
    setTimeout(() => setIsAnimating(false), 800);
  };

  return (
    <button
      onClick={handleRecenter}
      className={`
        group relative overflow-hidden
        bg-gradient-to-br from-slate-900/90 to-slate-800/90 
        backdrop-blur-md border border-white/10 
        text-white rounded-xl p-3 
        hover:from-blue-600/90 hover:to-blue-500/90 
        hover:border-blue-400/30 hover:shadow-lg hover:shadow-blue-500/20
        transition-all duration-300 ease-out
        ${isAnimating ? 'scale-95' : 'hover:scale-105'}
      `}
      title="Centrar en Santa Cruz"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent 
                      translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
      <Target className={`w-5 h-5 transition-transform duration-300 ${isAnimating ? 'rotate-180' : 'group-hover:rotate-12'}`} />
    </button>
  );
}

function ZoomControls() {
  const map = useMap() as LeafletMap;                         // tip explícito
  const [zoomLevel, setZoomLevel] = useState<number>(map.getZoom());

  useEffect(() => {
    const handleZoom = () => setZoomLevel(map.getZoom());
    map.on('zoomend', handleZoom);                            // usar zoomend
    return () => { map.off('zoomend', handleZoom); };
  }, [map]);

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={() => map.zoomIn()}
        disabled={zoomLevel >= map.getMaxZoom()}
        className="
          group bg-gradient-to-br from-slate-900/90 to-slate-800/90 
          backdrop-blur-md border border-white/10 
          text-white rounded-xl p-3 
          hover:from-emerald-600/90 hover:to-emerald-500/90 
          hover:border-emerald-400/30 hover:shadow-lg hover:shadow-emerald-500/20
          disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-slate-900/90
          transition-all duration-300 ease-out hover:scale-105
        "
        title="Acercar"
      >
        <ZoomIn className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
      </button>
      <button
        onClick={() => map.zoomOut()}
        disabled={zoomLevel <= map.getMinZoom()}
        className="
          group bg-gradient-to-br from-slate-900/90 to-slate-800/90 
          backdrop-blur-md border border-white/10 
          text-white rounded-xl p-3 
          hover:from-orange-600/90 hover:to-orange-500/90 
          hover:border-orange-400/30 hover:shadow-lg hover:shadow-orange-500/20
          disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-slate-900/90
          transition-all duration-300 ease-out hover:scale-105
        "
        title="Alejar"
      >
        <ZoomOut className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
      </button>
    </div>
  );
}

function MapLegend({ statusColor, orders }: { statusColor: StatusColor; orders: OrderRow[] }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const statusCounts = orders.reduce<Record<OrderStatus, number>>((acc, order) => {
    acc[order.status] = (acc[order.status] ?? 0) + 1;
    return acc;
  }, {} as Record<OrderStatus, number>);

  const statusLabels: Record<OrderStatus, string> = {
    pending: 'Pendiente',
    assigned: 'Asignado',
    out_for_delivery: 'En Entrega',
    delivered: 'Entregado',
    confirmed: 'Confirmado',
    cancelled: 'Cancelado',
    returned: 'Devuelto',
    failed: 'Fallido',
  };

  return (
    <div className="
      bg-gradient-to-br from-slate-900/95 to-slate-800/95 
      backdrop-blur-md border border-white/10 
      rounded-xl p-4 shadow-xl shadow-black/20
      transition-all duration-300 ease-out
    ">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-white font-medium mb-3 hover:text-blue-300 transition-colors"
      >
        <Layers className="w-4 h-4" />
        <span>Estados de Pedidos</span>
        <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
          ▼
        </div>
      </button>
      
      <div className={`
        grid gap-2 transition-all duration-300 overflow-hidden
        ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}
      `}>
        {Object.entries(statusColor).map(([status, color]) => {
          const count = statusCounts[status as OrderStatus] || 0;
          return (
            <div key={status} className="flex items-center gap-3 text-sm">
              <div 
                className="w-3 h-3 rounded-full shadow-sm"
                style={{ backgroundColor: color }}
              />
              <span className="text-white/90 flex-1">{statusLabels[status as OrderStatus]}</span>
              <span className="text-white/60 font-mono text-xs bg-white/10 px-2 py-1 rounded-full">
                {count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AnimatedMarker({ 
  position, 
  color, 
  order 
}: { 
  position: [number, number]; 
  color: string; 
  order: OrderRow;
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), Math.random() * 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <CircleMarker
      center={position}
      radius={isVisible ? 10 : 0}
      pathOptions={{ 
        color, 
        fillColor: color, 
        fillOpacity: 0.8, 
        weight: 2,
        className: 'animate-pulse'
      }}
      className={`transition-all duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
    >
      <Popup className="custom-popup">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4 rounded-lg border border-white/10 min-w-[280px]">
          <div className="flex items-start gap-3 mb-3">
            <div 
              className="w-4 h-4 rounded-full mt-1 shadow-lg"
              style={{ backgroundColor: color }}
            />
            <div className="flex-1">
              <div className="font-bold text-lg text-white mb-1">
                Pedido #{order.order_no ?? order.id.slice(0, 6)}
              </div>
              <div className="text-blue-300 text-sm capitalize bg-blue-500/20 px-2 py-1 rounded-full inline-block">
                {order.status.replaceAll('_', ' ')}
              </div>
            </div>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400" />
              <span className="text-white/90">Cliente: {order.customer_name ?? 'N/A'}</span>
            </div>
            
            {order.customer_phone && (
              <div className="text-white/80">📞 {order.customer_phone}</div>
            )}
            
            {order.delivery_address && (
              <div className="text-white/80 bg-white/5 p-2 rounded border-l-2 border-blue-400">
                📍 {order.delivery_address}
              </div>
            )}
            
            {order.amount != null && (
              <div className="text-emerald-300 font-semibold text-base">
                💰 Total: Bs {order.amount.toFixed(2)}
              </div>
            )}
          </div>
          
          <div className="mt-4 pt-3 border-t border-white/10">
            <a
              className="
                inline-flex items-center gap-2 
                bg-gradient-to-r from-blue-600 to-blue-500 
                hover:from-blue-500 hover:to-blue-400
                text-white px-4 py-2 rounded-lg 
                transition-all duration-300 hover:scale-105 hover:shadow-lg
                text-sm font-medium
              "
              href={`https://www.google.com/maps?q=${position[0]},${position[1]}`}
              target="_blank"
              rel="noreferrer"
            >
              <Navigation className="w-4 h-4" />
              Abrir en Google Maps
            </a>
          </div>
        </div>
      </Popup>
    </CircleMarker>
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
    const m = mapRef.current;
    if (!m) return;

    const el = m.getContainer();
    const ResizeObs = (window as any).ResizeObserver ?? null;
    if (ResizeObs) {
      const ro = new ResizeObs(() => m.invalidateSize(false));
      ro.observe(el);

      const t1 = window.setTimeout(() => m.invalidateSize(false), 50);
      const t2 = window.setTimeout(() => m.invalidateSize(false), 250);

      return () => {
        ro.disconnect();
        window.clearTimeout(t1);
        window.clearTimeout(t2);
      };
    }

    // Fallback simple si no hay ResizeObserver
    const t1 = window.setTimeout(() => m.invalidateSize(false), 50);
    const t2 = window.setTimeout(() => m.invalidateSize(false), 250);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []); // <- vacío: no uses mapRef.current como dependencia

  return (
    <div className="w-full h-full relative overflow-hidden rounded-xl">
      {/* Overlay gradient for better contrast */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/10 pointer-events-none z-[999]" />
      
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom
        style={{ width: '100%', height: '100%' }}
        className="rounded-xl"
        ref={(m) => { if (m) mapRef.current = m; }}
        whenReady={() => {
          const m = mapRef.current;
          if (m) requestAnimationFrame(() => m.invalidateSize(false));
        }}
      >
        {/* Basemap Carto con mejor contraste */}
        <TileLayer
          url="https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://www.carto.com/">CARTO</a>'
          subdomains="abcd"
          maxZoom={20}
        />

        {/* Marcadores animados */}
        {orders.map((o) => {
          const lat = Number(o.delivery_geo_lat);
          const lng = Number(o.delivery_geo_lng);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

          const color = statusColor[o.status] ?? '#6366f1';

          return (
            <AnimatedMarker
              key={o.id}
              position={[lat, lng]}
              color={color}
              order={o}
            />
          );
        })}

        {/* Controles mejorados */}
        <div className="absolute right-4 top-4 z-[1000] flex flex-col gap-3">
          <RecenterControl center={center} zoom={zoom} />
          <ZoomControls />
        </div>

        {/* Leyenda */}
        <div className="absolute left-4 top-4 z-[1000]">
          <MapLegend statusColor={statusColor} orders={orders} />
        </div>
      </MapContainer>

      <style jsx global>{`
        .leaflet-popup-content-wrapper {
          background: transparent !important;
          box-shadow: none !important;
          border-radius: 12px !important;
          padding: 0 !important;
        }
        
        .leaflet-popup-content {
          margin: 0 !important;
          border-radius: 12px !important;
        }
        
        .leaflet-popup-tip {
          background: #1e293b !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
        }
        
        .leaflet-container {
          background: #0f172a !important;
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.1); opacity: 1; }
        }
        
        .animate-pulse {
          animation: pulse 2s infinite;
        }
      `}</style>
    </div>
  );
}