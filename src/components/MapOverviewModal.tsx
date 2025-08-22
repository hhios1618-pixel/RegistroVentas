// RUTA: src/components/MapOverviewModal.tsx

'use client';
import dynamic from 'next/dynamic';

// Re-exporta el tipo de props para que la página pueda tipar sin importar react-leaflet en SSR
export type MapOverviewProps = {
  orders: {
    id: string;
    status: string;
    order_no?: number | null;
    customer_name?: string | null;
    delivery_address?: string | null;
    delivery_geo_lat?: number | null;
    delivery_geo_lng?: number | null;
    delivery_date?: string | null;
    delivery_from?: string | null;
    delivery_to?: string | null;
  }[];
  onClose: () => void;
  defaultCenter?: { lat: number; lng: number };
  defaultZoom?: number;
};

// Carga diferida, SIN SSR. Esto evita el error “window is not defined”.
const MapOverviewModalClient = dynamic(() => import('./MapOverviewModalClient'), { 
  ssr: false,
  loading: () => <div className="fixed inset-0 bg-black/80 flex items-center justify-center"><p className="text-white">Cargando mapa...</p></div>
});

export default function MapOverviewModal(props: MapOverviewProps) {
  return <MapOverviewModalClient {...props} />;
}
