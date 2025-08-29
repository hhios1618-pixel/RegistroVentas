// RUTA: src/lib/types.ts
// TIPOS COMPLETOS ACTUALIZADOS

export type OrderStatus =
  | 'pending'
  | 'assigned'
  | 'out_for_delivery'
  | 'delivered'
  | 'confirmed'
  | 'cancelled'
  | 'returned'
  | 'failed';

// Definimos un tipo base para el perfil.
type UserProfile = {
  full_name: string | null;
};

// NUEVO: Definimos el tipo para un item individual del pedido
export interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number | null;
  subtotal: number | null;
  image_url?: string | null;
}

// --------------------- ORDERS ---------------------
export interface OrderRow {
  id: string;
  created_at: string;
  updated_at?: string | null;
  order_no?: number | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  
  // --- PROPIEDAD AÑADIDA ---
  address?: string | null; // Esta es la línea que soluciona el nuevo error.

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
  delivered_at?: string | null;
  status: OrderStatus;
  seller?: string | null;
  sales_user_id?: string | null;
  delivery_assigned_to?: string | null;
  destino: string | null; 
  
  seller_profile?: UserProfile | UserProfile[] | null;
  delivery_profile?: UserProfile | UserProfile[] | null;

  image_url?: string | null;
  payment_proof_url?: string | null;

  order_items?: OrderItem[];
}

// --------------------- USERS (from 'people' table) ---------------------
export interface DeliveryUser {
  id: string;
  full_name: string;
  role: string;
  active: boolean;
  local?: string | null;
  created_at: string;
  telegram_username?: string | null;
  phone?: string | null;
  vehicle_type?: string | null;
  current_load?: number | null;
  max_load?: number | null;
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
}
export interface EnrichedDeliveryRoute extends DeliveryRoute {
  order_no: number | null;
}

// --------------------- METRICS ---------------------
export interface DeliveryMetrics {
  id: string;
  delivery_user_id: string;
  metric_date: string;
  total_routes?: number | null;
  completed_routes?: number | null;
  failed_routes?: number | null;
  total_distance_km?: number | null;
  total_delivery_time_minutes?: number | null;
  average_delivery_time_minutes?: number | null;
  efficiency_score?: number | null;
  efficiency?: number | null;
}

// --------------------- UI & HELPERS ---------------------
export interface LatLng { 
  lat: number; 
  lng: number; 
}

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
  onViewDetails: (delivery: DeliveryUser) => void;
}

// --------------------- CHART TYPES ---------------------
export interface EfficiencyDataPoint {
  hour: string;
  successful: number;
  attempted: number;
  efficiency: number;
}

export interface EfficiencyChartProps {
  orders: OrderRow[];
}

// --------------------- MODAL TYPES ---------------------
export interface OrderDetailsModalProps {
  order: OrderRow;
  deliveries: DeliveryUser[];
  onClose: () => void;
  onAssignDelivery: (orderId: string, deliveryUserId: string) => Promise<void>;
  onStatusChange: (orderId: string, newStatus: OrderStatus) => Promise<void>;
  onSaveLocation: (
    orderId: string,
    patch: Partial<Pick<OrderRow, 'delivery_address' | 'notes' | 'delivery_geo_lat' | 'delivery_geo_lng'>>
  ) => Promise<void>;
  onConfirmDelivered: (orderId: string) => Promise<void>;
}

export interface DeliveryDetailsModalProps {
  delivery: DeliveryUser;
  routes: EnrichedDeliveryRoute[];
  metrics?: DeliveryMetrics;
  onClose: () => void;
}

export interface MapOverviewProps {
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
}

// --------------------- TABLE TYPES ---------------------
export interface OrderTableProps {
  orders: OrderRow[];
  onRowClick: (order: OrderRow) => void;
}

// --------------------- CARD TYPES ---------------------
export interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

export interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

// --------------------- BUTTON TYPES ---------------------
export interface ButtonProps {
  children: React.ReactNode;
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}