'use client';
import dynamic from 'next/dynamic';

// Re-exporta el tipo de props para que el page pueda tipar sin importar react-leaflet en SSR
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

// Carga diferida, SIN SSR. Esto evita “window is not defined”.
const Inner = dynamic(() => import('./MapOverviewModalClient'), { ssr: false });

export default function MapOverviewModal(props: MapOverviewProps) {
  return <Inner {...props} />;
}