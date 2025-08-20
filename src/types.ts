// --- Archivo Final y Definitivo: src/lib/types.ts ---

export type OrderStatus =
  | 'pending'
  | 'assigned'
  | 'out_for_delivery'
  | 'delivered'
  | 'confirmed'
  | 'cancelled'
  | 'returned'
  | 'failed';

// --------------------- ORDERS ---------------------

export interface OrderRow {
  id: string;
  created_at: string;
  updated_at?: string | null;

  // En la DB es BIGINT → usar number en TS
  order_no?: number | null;

  customer_name?: string | null;
  customer_phone?: string | null;

  delivery_address?: string | null;
  delivery_geo_lat?: number | null;
  delivery_geo_lng?: number | null;

  notes?: string | null;
  amount?: number | null;
  local?: string | null;
  payment_method?: string | null;

  // Programación de entrega
  delivery_date?: string | null;  // 'YYYY-MM-DD'
  delivery_from?: string | null;  // 'HH:mm'
  delivery_to?: string | null;    // 'HH:mm'

  confirmed_at?: string | null;
  status: OrderStatus;
  delivery_assigned_to?: string | null;

  // Vendedor / repartidor mostrado en la tabla
  seller?: string | null;

  // URLs resueltas (Storage)
  seller_photo_url?: string | null;   // imagen del producto (vendedor)
  payment_proof_url?: string | null;  // comprobante de pago (delivery)
}

// --------------------- USERS ---------------------

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

// --------------------- ROUTES ---------------------

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

  // Comprobante de entrega (guardado por el delivery)
  proof_image_url?: string | null;
}

export interface EnrichedDeliveryRoute extends DeliveryRoute {
  // mantener consistente con OrderRow
  order_no: number | null;
}

// --------------------- METRICS ---------------------

export interface DeliveryMetrics {
  id: string;
  delivery_user_id: string;
  metric_date: string;

  // columnas reales que mostraste en la DB
  total_routes?: number | null;
  completed_routes?: number | null;
  failed_routes?: number | null;

  total_distance_km?: number | null;
  total_delivery_time_minutes?: number | null;
  average_delivery_time_minutes?: number | null;

  efficiency_score?: number | null; // si usas esta columna
  // derivado opcional que puedes calcular en front si lo prefieres
  efficiency?: number | null;
}

// --------------------- MAP & UI ---------------------

export interface LatLng { lat: number; lng: number; }

export interface AddressSuggestion {
  label: string;
  formatted_address?: string;
  pos?: LatLng;
}

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
  onSaveLocation: (
    orderId: string,
    patch: Partial<
      Pick<OrderRow, 'delivery_address' | 'notes' | 'delivery_geo_lat' | 'delivery_geo_lng'>
    >
  ) => Promise<void>;
  onConfirm: (orderId: string) => Promise<void>;
  onStatusChange: (orderId: string, newStatus: OrderStatus) => Promise<void>;
  compact?: boolean;
  showMap?: boolean;
}

export interface DeliveryStats {
  totalToday: number;
  completedToday: number;
  inProgressToday: number;
  pendingToday: number;
  efficiency: number;
}

export interface DeliveryCardProps {
  delivery: DeliveryUser;
  stats: DeliveryStats;
  onViewDetails: (deliveryId: string) => void;
  onReassignOrder?: (orderId: string, newDeliveryId: string) => void;
}

// Si igual quieres mantener UIOrder, que sea alias:
export type UIOrder = OrderRow;