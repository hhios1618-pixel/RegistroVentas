// RUTA: src/components/MapOverviewModalClient.tsx
// VERSIÓN FINAL CORREGIDA

'use client';

import React, { useMemo, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import type { MapOverviewProps } from './MapOverviewModal';
import { Target, Eye, MapPin, Calendar, Clock, X } from 'lucide-react';
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

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  assigned: 'Asignado',
  out_for_delivery: 'En Entrega',
  delivered: 'Entregado',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
  returned: 'Devuelto',
  failed: 'Fallido',
};

function RecenterControl({ center }: { center: [number, number] }) {
  const map = useMap();
  const [isAnimating, setIsAnimating] = useState(false);

  const handleRecenter = () => {
    setIsAnimating(true);
    map.setView(center, map.getZoom(), { animate: true, duration: 0.8 });
    setTimeout(() => setIsAnimating(false), 800);
  };

  return (
    // ▼▼▼ CORRECCIÓN 1: Usar comillas invertidas `` ` `` ▼▼▼
    <button
      onClick={handleRecenter}
      className={`
        group bg-gradient-to-br from-slate-900/90 to-slate-800/90 
        backdrop-blur-md border border-white/10 
        text-white rounded-xl p-3 
        hover:from-blue-600/90 hover:to-blue-500/90 
        hover:border-blue-400/30 hover:shadow-lg hover:shadow-blue-500/20
        transition-all duration-300 ease-out hover:scale-105
        ${isAnimating ? 'scale-95' : ''}
      `}
      aria-label="Centrar mapa"
    >
      <Target className={`w-5 h-5 transition-transform duration-300 ${isAnimating ? 'rotate-180' : 'group-hover:rotate-12'}`} />
    </button>
  );
}

function StatusFilter({ 
  visible, 
  setVisible, 
  statusCounts 
}: { 
  visible: Record<string, boolean>; 
  setVisible: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  statusCounts: Record<string, number>;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    // ▼▼▼ CORRECCIÓN 2: Usar comillas invertidas `` ` `` ▼▼▼
    <div className={`
      bg-gradient-to-br from-slate-900/95 to-slate-800/95 
      backdrop-blur-md border border-white/10 
      rounded-xl shadow-xl shadow-black/20
      transition-all duration-300 ease-out
      max-w-xs
    `}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 text-white font-medium hover:text-blue-300 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4" />
          <span>Filtros de Estado</span>
        </div>
        <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
          ▼
        </div>
      </button>
      
      <div className={`
        px-4 pb-4 space-y-3 transition-all duration-300 overflow-hidden
        ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 pb-0'}
      `}>
        {Object.keys(STATUS_COLOR).map((status) => {
          const count = statusCounts[status] || 0;
          const isVisible = visible[status];
          
          return (
            <label 
              key={status} 
              className="flex items-center gap-3 cursor-pointer group hover:bg-white/5 p-2 rounded-lg transition-colors"
            >
              <div className="relative">
                <input
                  type="checkbox"
                  checked={isVisible}
                  onChange={(e) => setVisible(v => ({ ...v, [status]: e.target.checked }))}
                  className="sr-only"
                />
                <div className={`
                  w-5 h-5 rounded border-2 transition-all duration-200
                  ${isVisible 
                    ? 'bg-blue-500 border-blue-500' 
                    : 'border-white/30 hover:border-white/50'
                  }
                `}>
                  {isVisible && (
                    <svg className="w-3 h-3 text-white absolute top-0.5 left-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>
              
              <div 
                className="w-3 h-3 rounded-full shadow-sm"
                style={{ backgroundColor: STATUS_COLOR[status] }}
              />
              
              <span className="text-white/90 text-sm flex-1">
                {STATUS_LABELS[status]}
              </span>
              
              <span className="text-white/60 font-mono text-xs bg-white/10 px-2 py-1 rounded-full">
                {count}
              </span>
            </label>
          );
        })}
        
        <div className="pt-2 border-t border-white/10">
          <button
            onClick={() => {
              const allVisible = Object.values(visible).every(v => v);
              const newState = Object.keys(STATUS_COLOR).reduce((acc, status) => {
                acc[status] = !allVisible;
                return acc;
              }, {} as Record<string, boolean>);
              setVisible(newState);
            }}
            className="w-full text-xs text-blue-300 hover:text-blue-200 transition-colors"
          >
            {Object.values(visible).every(v => v) ? 'Ocultar todos' : 'Mostrar todos'}
          </button>
        </div>
      </div>
    </div>
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

  const { markers, statusCounts } = useMemo(() => {
    const filteredMarkers = orders.filter(o => {
      if (o.delivery_geo_lat == null || o.delivery_geo_lng == null) return false;
      const key = String(o.status ?? 'pending');
      return visible[key] ?? true;
    });

    const counts = orders.reduce((acc, order) => {
      const status = String(order.status ?? 'pending');
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { markers: filteredMarkers, statusCounts: counts };
  }, [orders, visible]);

  const centerTuple: [number, number] = [defaultCenter.lat, defaultCenter.lng];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        // ▼▼▼ CORRECCIÓN 3: Usar comillas invertidas `` ` `` ▼▼▼
        className={`
          relative h-[90vh] w-[95vw] max-w-7xl 
          bg-gradient-to-br from-slate-900 to-slate-800 
          rounded-2xl border border-white/10 
          shadow-2xl shadow-black/50
          overflow-hidden
        `}
        onClick={e => e.stopPropagation()}
      >
        <header 
          // ▼▼▼ CORRECCIÓN 4: Usar comillas invertidas `` ` `` ▼▼▼
          className={`
            flex items-center justify-between 
            bg-gradient-to-r from-slate-900/95 to-slate-800/95 
            backdrop-blur-md border-b border-white/10 
            px-6 py-4
          `}
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-6 h-6 text-blue-400" />
              <h1 className="text-xl font-bold text-white">Mapa Operativo</h1>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-white/80">Santa Cruz de la Sierra</span>
              <div className="w-px h-4 bg-white/20" />
              <span className="text-blue-300 font-medium">
                {markers.length} pedidos visibles
              </span>
              <div className="w-px h-4 bg-white/20" />
              <span className="text-white/60">
                {orders.length} total
              </span>
            </div>
          </div>
          
          <button
            onClick={onClose}
            // ▼▼▼ CORRECCIÓN 5 (LA DEL ERROR RECIENTE): Usar comillas invertidas `` ` `` ▼▼▼
            className={`
              group bg-gradient-to-br from-red-600/20 to-red-500/20 
              hover:from-red-600/40 hover:to-red-500/40
              border border-red-500/30 hover:border-red-400/50
              text-red-300 hover:text-red-200
              rounded-xl p-3 transition-all duration-300 hover:scale-105
            `}
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="relative h-[calc(90vh-80px)] w-full">
          <MapContainer
            center={centerTuple}
            zoom={defaultZoom}
            scrollWheelZoom
            style={{ width: '100%', height: '100%' }}
            className="bg-slate-900"
          >
            <TileLayer
              attribution='&copy; OpenStreetMap &amp; CARTO'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />

            <div className="absolute right-4 top-4 z-[1000]">
              <RecenterControl center={centerTuple} />
            </div>

            {markers.map((o ) => {
              const lat = Number(o.delivery_geo_lat);
              const lng = Number(o.delivery_geo_lng);
              const color = STATUS_COLOR[String(o.status ?? 'pending')] ?? '#3b82f6';
              
              return (
                <CircleMarker
                  key={o.id}
                  center={[lat, lng]}
                  radius={8}
                  pathOptions={{ 
                    color: color, 
                    weight: 2, 
                    fillColor: color, 
                    fillOpacity: 0.8,
                    className: 'animate-pulse'
                  }}
                >
                  <Popup>
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4 rounded-lg border border-white/10 min-w-[300px]">
                      <div className="flex items-start gap-3 mb-3">
                        <div 
                          className="w-4 h-4 rounded-full mt-1 shadow-lg"
                          style={{ backgroundColor: color }}
                        />
                        <div className="flex-1">
                          <div className="font-bold text-lg text-white mb-1">
                            Pedido #{o.order_no ?? 'S/N'}
                          </div>
                          <div className="text-blue-300 text-sm capitalize bg-blue-500/20 px-2 py-1 rounded-full inline-block">
                            {STATUS_LABELS[String(o.status)] || String(o.status).replaceAll('_', ' ')}
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        {o.customer_name && (
                          <div className="flex items-center gap-2">
                            <span className="text-white/90">Cliente: {o.customer_name}</span>
                          </div>
                        )}
                        
                        {o.delivery_address && (
                          <div className="text-white/80 bg-white/5 p-2 rounded border-l-2 border-blue-400">
                            📍 {o.delivery_address}
                          </div>
                        )}
                        
                        {(o.delivery_date || o.delivery_from || o.delivery_to) && (
                          <div className="bg-white/5 p-2 rounded space-y-1">
                            {o.delivery_date && (
                              <div className="flex items-center gap-2 text-white/80">
                                <Calendar className="w-4 h-4" />
                                <span>{o.delivery_date}</span>
                              </div>
                            )}
                            {(o.delivery_from || o.delivery_to) && (
                              <div className="flex items-center gap-2 text-white/80">
                                <Clock className="w-4 h-4" />
                                <span>
                                  {o.delivery_from?.slice(0,5) ?? '—'} 
                                  {o.delivery_to ? ` – ${o.delivery_to.slice(0,5)}` : ''}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>

          <div className="absolute left-4 top-4 z-[1000]">
            <StatusFilter 
              visible={visible} 
              setVisible={setVisible} 
              statusCounts={statusCounts}
            />
          </div>
        </div>
      </div>

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
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.05); opacity: 1; }
        }
        
        .animate-pulse {
          animation: pulse 2s infinite;
        }
      `}</style>
    </div>
  );
}
