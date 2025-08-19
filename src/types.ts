// --- Archivo Final y Definitivo: src/lib/types.ts ---
// Contiene la estructura correcta y completa de los datos, alineada con la base de datos.

/**
 * Define los posibles estados de una orden.
 */
export type OrderStatus = 
  | 'pending'
  | 'assigned'
  | 'out_for_delivery'
  | 'delivered'
  | 'confirmed'
  | 'cancelled'
  | 'returned'
  | 'failed';

/**
 * Representa la estructura de una fila en la tabla 'orders'.
 * VERSIÓN FINAL Y COMPLETA.
 */
export interface OrderRow {
  id: string;
  created_at: string;
  updated_at?: string | null; 
  order_no?: string | null; 
  customer_name?: string | null; 
  customer_phone?: string | null; 
  
  // --- Columnas de ubicación que SÍ existen en la DB ---
  delivery_address?: string | null;
  delivery_geo_lat?: number | null;
  delivery_geo_lng?: number | null;
  
  notes?: string | null; 
  amount?: number | null; 
  local?: string | null; 
  payment_method?: string | null; 
  delivery_date?: string | null; 
  delivery_from?: string | null; 
  delivery_to?: string | null; 
  confirmed_at?: string | null; 
  status: OrderStatus;
  delivery_assigned_to?: string | null;

  // ▼▼▼ LA PROPIEDAD QUE FALTABA Y CAUSABA EL ERROR ▼▼▼
  seller?: string | null; // Esta es la columna para el nombre del repartidor/vendedor.
}

/**
 * Representa a un usuario repartidor de la tabla 'users_profile'.
 */
export interface DeliveryUser {
  id: string;
  full_name: string;
  phone?: string | null;
  is_active: boolean;
  vehicle_type?: string | null;
  current_load?: number | null; 
  max_load?: number | null; 
  role?: string; 
  branch_id?: string | null;
}

/**
 * Representa una ruta de entrega específica.
 */
export interface DeliveryRoute {
  id: string;
  delivery_user_id: string;
  order_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  completed_at?: string | null; 
  route_date?: string | null; 
  sequence_number?: number | null; 
  estimated_arrival?: string | null; 
  estimated_travel_time_seconds?: number | null; 
  distance_meters?: number | null; 
  route_geometry?: any; 
}

/**
 * Representa las métricas de rendimiento de un repartidor.
 */
export interface DeliveryMetrics {
  id: string;
  delivery_user_id: string;
  metric_date: string;
  total_distance_km: number;
  total_delivery_time_minutes: number;
  completed_routes: number;
  efficiency: number;
}

/**
 * Coordenadas de Latitud y Longitud.
 */
export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Sugerencia de dirección para componentes de búsqueda.
 */
export interface AddressSuggestion {
  label: string;
  formatted_address?: string;
  pos?: LatLng;
}

// --- Props para Componentes de UI ---

export interface AddressSearchProps {
  value: string;
  onChange: (value: string) => void;
  onPick: (suggestion: AddressSuggestion) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export interface MapPickerProps {
  value?: LatLng;
  defaultCenter: LatLng;
  zoom?: number;
  onChange?: (latLng: LatLng) => void;
  height?: number;
  markers?: { position: LatLng; label?: string; color?: string }[];
  showRoute?: boolean;
  routePoints?: LatLng[];
}

export interface OrderCardProps {
  order: OrderRow;
  deliveries: DeliveryUser[];
  onAssign: (orderId: string, deliveryId: string) => Promise<void>;
  onSaveLocation: (orderId: string, patch: Partial<Pick<OrderRow, 'delivery_address' | 'notes' | 'delivery_geo_lat' | 'delivery_geo_lng'>>) => Promise<void>;
  onConfirm: (orderId: string) => Promise<void>;
  onStatusChange: (orderId: string, newStatus: OrderStatus) => Promise<void>;
  compact?: boolean;
  showMap?: boolean;
}

/**
 * Estadísticas pre-calculadas para un repartidor.
 */
export interface DeliveryStats {
  totalToday: number;
  completedToday: number;
  inProgressToday: number;
  pendingToday: number;
  efficiency: number;
}

/**
 * Props para el componente DeliveryCard.
 */
export interface DeliveryCardProps {
  delivery: DeliveryUser;
  stats: DeliveryStats;
  onViewDetails: (deliveryId: string) => void;
  onReassignOrder?: (orderId: string, newDeliveryId: string) => void;
}

export interface EnrichedDeliveryRoute extends DeliveryRoute {
  order_no: string | null;
}
