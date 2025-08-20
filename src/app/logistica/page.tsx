// src/app/logistica/page.tsx
'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import type {
  OrderRow,
  DeliveryUser,
  OrderStatus,
  DeliveryRoute,
  DeliveryMetrics,
  DeliveryStats,
  EnrichedDeliveryRoute,
} from '@/types';

// --- Componentes ---
import { OrderTable } from '@/components/OrderTable';
import OrderDetailsModal from '@/components/OrderDetailsModal';
import DeliveryDetailsModal from '@/components/DeliveryDetailsModal';
import { DeliveryCard } from '@/components/DeliveryCard';
import { Card, CardContent, CardHeader } from '@/components/Card';
import Button from '@/components/Button';
import LoadingSpinner from '@/components/LoadingSpinner';
import MapOverviewModal from '@/components/MapOverviewModal';

// --- Iconos (renombramos Map -> MapIcon para no pisar el Map nativo) ---
import {
  PlusCircle,
  RefreshCw,
  Search,
  Truck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Users,
  Map as MapIcon,
} from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Storage config (si usas media privada, firma por /api/media/sign)
const MEDIA_BUCKET = 'orders-media';
const MEDIA_PRIVATE = true;

const getBoliviaDateString = () => {
  const now = new Date();
  const boliviaDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/La_Paz' }));
  const year = boliviaDate.getFullYear();
  const month = String(boliviaDate.getMonth() + 1).padStart(2, '0');
  const day = String(boliviaDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

async function resolveMediaUrl(path?: string | null): Promise<string | null> {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;

  if (MEDIA_PRIVATE) {
    const res = await fetch('/api/media/sign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bucket: MEDIA_BUCKET, path, expiresIn: 3600 }),
    });
    if (!res.ok) return null;
    const { url } = await res.json();
    return url ?? null;
  } else {
    const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
    return data.publicUrl ?? null;
  }
}

export default function LogisticaPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryUser[]>([]);
  const [deliveryRoutes, setDeliveryRoutes] = useState<EnrichedDeliveryRoute[]>([]);
  const [deliveryMetrics, setDeliveryMetrics] = useState<DeliveryMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryUser | null>(null);
  const [filters, setFilters] = useState({ status: 'all' as OrderStatus | 'all', search: '' });
  const [isMapOpen, setIsMapOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const ordersQuery = supabase
        .from('orders')
        .select(`
          id, order_no, created_at, updated_at, customer_name, customer_phone,
          amount, status, delivery_address, delivery_geo_lat, delivery_geo_lng,
          notes, delivery_assigned_to, seller, payment_method, delivery_date,
          delivery_from, delivery_to
        `)
        .order('created_at', { ascending: false });

      const [ordersRes, deliveriesRes, routesRes, metricsRes, mediaRes] = await Promise.all([
        ordersQuery,
        supabase.from('users_profile').select('*').eq('role', 'delivery').order('full_name', { ascending: true }),
        supabase.from('delivery_routes').select('*').order('created_at', { ascending: false }),
        supabase.from('delivery_metrics').select('*').order('metric_date', { ascending: false }),
        supabase.from('order_media').select('order_id, type, file_url').order('created_at', { ascending: false }),
      ]);

      if (ordersRes.error) throw ordersRes.error;
      if (deliveriesRes.error) throw deliveriesRes.error;
      if (routesRes.error) throw routesRes.error;
      if (metricsRes.error) throw metricsRes.error;
      if (mediaRes.error) throw mediaRes.error;

      const ordersData = (ordersRes.data ?? []) as OrderRow[];
      const routesData = (routesRes.data ?? []) as DeliveryRoute[];
      const media = (mediaRes.data ?? []) as { order_id: string; type: string; file_url: string | null }[];

      // Indexar media por order
      const mediaByOrder = new globalThis.Map<string, { product?: string | null; payment?: string | null }>();
      for (const m of media) {
        const entry = mediaByOrder.get(m.order_id) ?? {};
        if (m.type === 'product') entry.product = m.file_url;
        if (m.type === 'payment_proof') entry.payment = m.file_url;
        mediaByOrder.set(m.order_id, entry);
      }

      // Enriquecer órdenes con URLs firmadas/públicas
      const enrichedOrders: OrderRow[] = await Promise.all(
        ordersData.map(async (o) => {
          const m = mediaByOrder.get(o.id);
          const seller_photo_url = m?.product ? await resolveMediaUrl(m.product) : null;
          const payment_proof_url = m?.payment ? await resolveMediaUrl(m.payment) : null;
          return { ...o, seller_photo_url, payment_proof_url } as OrderRow & {
            seller_photo_url?: string | null;
            payment_proof_url?: string | null;
          };
        })
      );

      // Rutas con order_no
      const enrichedRoutes = routesData.map((route) => {
        const order = enrichedOrders.find((o) => o.id === route.order_id);
        return { ...route, order_no: order?.order_no || null };
      });

      setOrders(enrichedOrders);
      setDeliveries((deliveriesRes.data ?? []) as DeliveryUser[]);
      setDeliveryRoutes(enrichedRoutes);
      setDeliveryMetrics((metricsRes.data ?? []) as DeliveryMetrics[]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const assignDelivery = async (orderId: string, deliveryUserId: string) => {
    const response = await fetch(`/api/orders/${orderId}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deliveryUserId }),
    });
    if (!response.ok) {
      const { error } = await response.json();
      throw new Error(error || 'Falló la asignación del pedido.');
    }
    await loadData();
  };

  const saveLocation = async (
    orderId: string,
    patch: Partial<Pick<OrderRow, 'delivery_address' | 'notes' | 'delivery_geo_lat' | 'delivery_geo_lng'>>
  ) => {
    const { error } = await supabase.from('orders').update(patch).eq('id', orderId);
    if (error) throw error;
    await loadData();
  };

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', orderId);
    if (error) throw error;
    await loadData();
  };

  const confirmDelivered = async (orderId: string) => {
    await handleStatusChange(orderId, 'confirmed');
  };

  // ✔ Alineado con OrderDetailsModal: guarda delivery_date/from/to (campos de venta)
  const saveSchedule = async (
    orderId: string,
    patch: Partial<Pick<OrderRow, 'delivery_date' | 'delivery_from' | 'delivery_to'>>
  ) => {
    const { error } = await supabase
      .from('orders')
      .update({
        delivery_date: patch.delivery_date ?? null,
        delivery_from: patch.delivery_from ?? null,
        delivery_to: patch.delivery_to ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (error) throw error;
    await loadData();
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (filters.status !== 'all' && order.status !== filters.status) return false;
      if (filters.search) {
        const search = filters.search.toLowerCase();
        return [order.order_no, order.customer_name, order.customer_phone, order.delivery_address, order.seller]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(search);
      }
      return true;
    });
  }, [orders, filters]);

  const activeDeliveries = useMemo(() => deliveries.filter((d) => d.is_active), [deliveries]);

  const kpis = useMemo(
    () => ({
      pending: orders.filter((o) => o.status === 'pending').length,
      assigned: orders.filter((o) => o.status === 'assigned').length,
      inDelivery: orders.filter((o) => o.status === 'out_for_delivery').length,
      delivered: orders.filter((o) => ['delivered', 'confirmed'].includes(o.status)).length,
    }),
    [orders]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-red-400">
        <AlertTriangle className="mr-4" />
        Error: {error}
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-900 text-gray-200">
        <div className="p-4 sm:p-6 lg:p-8 max-w-screen-2xl mx-auto">
          <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white">Centro de Control Logístico</h1>
              <p className="text-gray-400 mt-1">Supervisa y asigna pedidos en tiempo real.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="small" onClick={loadData}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Actualizar
              </Button>
              <Button
                size="small"
                className="bg-indigo-600 hover:bg-indigo-700"
                onClick={() => setIsMapOpen(true)}
              >
                <MapIcon className="w-4 h-4 mr-2" />
                Ver Mapa de Operaciones
              </Button>
              <Button size="small" className="bg-blue-600 hover:bg-blue-700">
                <PlusCircle className="w-4 h-4 mr-2" />
                Nuevo Pedido
              </Button>
            </div>
          </header>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <h4 className="text-sm font-medium text-gray-400">Pendientes</h4>
                <Clock className="w-4 h-4 text-yellow-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-400">{kpis.pending}</div>
              </CardContent>
            </Card>
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <h4 className="text-sm font-medium text-gray-400">Asignados</h4>
                <Users className="w-4 h-4 text-blue-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-400">{kpis.assigned}</div>
              </CardContent>
            </Card>
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <h4 className="text-sm font-medium text-gray-400">En Ruta</h4>
                <Truck className="w-4 h-4 text-purple-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-400">{kpis.inDelivery}</div>
              </CardContent>
            </Card>
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <h4 className="text-sm font-medium text-gray-400">Entregados</h4>
                <CheckCircle2 className="w-4 h-4 text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-400">{kpis.delivered}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <aside className="lg:col-span-1 space-y-6 sticky top-24">
              <h2 className="text-xl font-semibold text-white">Repartidores Activos</h2>
              <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-2">
                {activeDeliveries.length > 0 ? (
                  activeDeliveries.map((delivery) => {
                    const today = getBoliviaDateString();
                    const todayRoutes = deliveryRoutes.filter(
                      (r) => r.delivery_user_id === delivery.id && r.route_date === today
                    );
                    const metrics = deliveryMetrics.find(
                      (m) => m.delivery_user_id === delivery.id && m.metric_date === today
                    );
                    const completedToday = todayRoutes.filter((r) => r.status === 'completed').length;
                    const efficiency =
                      metrics?.efficiency ??
                      (todayRoutes.length > 0
                        ? Math.round((completedToday / todayRoutes.length) * 100)
                        : 0);

                    const deliveryStats: DeliveryStats = {
                      totalToday: todayRoutes.length,
                      completedToday,
                      inProgressToday: todayRoutes.filter((r) => r.status === 'in_progress').length,
                      pendingToday: todayRoutes.filter((r) => r.status === 'pending').length,
                      efficiency,
                    };
                    return (
                      <DeliveryCard
                        key={delivery.id}
                        delivery={delivery}
                        stats={deliveryStats}
                        onViewDetails={() => setSelectedDelivery(delivery)}
                      />
                    );
                  })
                ) : (
                  <div className="text-center py-10 border-2 border-dashed border-gray-700 rounded-lg">
                    <Users className="mx-auto w-8 h-8 text-gray-500" />
                    <p className="mt-2 text-sm text-gray-500">No hay repartidores activos.</p>
                  </div>
                )}
              </div>
            </aside>

            <section className="lg:col-span-2">
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <h3 className="text-white font-bold text-lg">
                      Lista de Pedidos ({filteredOrders.length})
                    </h3>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Buscar..."
                          value={filters.search}
                          onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
                          className="w-full bg-gray-900/50 border border-gray-600 rounded-md pl-9 pr-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <OrderTable orders={filteredOrders} onRowClick={(order) => setSelectedOrder(order)} />
                </CardContent>
              </Card>
            </section>
          </div>
        </div>
      </div>

      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          deliveries={activeDeliveries}
          onClose={() => setSelectedOrder(null)}
          onAssignDelivery={assignDelivery}
          onStatusChange={handleStatusChange}
          onSaveLocation={saveLocation}
          onConfirmDelivered={confirmDelivered}
        />
      )}

      {selectedDelivery && (
        <DeliveryDetailsModal
          delivery={selectedDelivery}
          routes={deliveryRoutes.filter((r) => r.delivery_user_id === selectedDelivery.id)}
          metrics={deliveryMetrics.find((m) => m.delivery_user_id === selectedDelivery.id)}
          onClose={() => setSelectedDelivery(null)}
          // Si en el futuro quieres abrir la programación desde aquí,
          // pásale onSaveSchedule con la misma firma que arriba.
        />
      )}

      {isMapOpen && (
        <MapOverviewModal
          orders={orders}
          onClose={() => setIsMapOpen(false)}
          defaultCenter={{ lat: -17.7833, lng: -63.1821 }} // Santa Cruz
          defaultZoom={12}
        />
      )}
    </>
  );
}