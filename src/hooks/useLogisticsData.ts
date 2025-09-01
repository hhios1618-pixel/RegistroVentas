// src/hooks/useLogisticsData.ts
'use client';

import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { OrderRow, DeliveryUser, OrderStatus, DeliveryRoute, EnrichedDeliveryRoute } from '@/lib/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function useLogisticsData() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryUser[]>([]);
  const [deliveryRoutes, setDeliveryRoutes] = useState<EnrichedDeliveryRoute[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState<boolean>(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const [ordersRes, deliveriesRes, routesRes] = await Promise.all([
        // ACTUALIZADO: Agregamos los campos de encomienda en la consulta
        supabase.from('orders').select(`
          *, 
          seller_profile:sales_user_id(full_name), 
          delivery_profile:delivery_assigned_to(full_name), 
          order_items(*),
          is_encomienda,
          fecha_salida_bodega,
          fecha_entrega_encomienda,
          venta_fecha,
          venta_desde,
          venta_hasta
        `).order('created_at', { ascending: false }),
        supabase.from('users_profile').select('*').eq('role', 'delivery').order('full_name', { ascending: true }),
        supabase.from('delivery_routes').select('*').order('created_at', { ascending: false }),
      ]);

      if (ordersRes.error) throw new Error(`Error cargando pedidos: ${ordersRes.error.message}`);
      if (deliveriesRes.error) throw new Error(`Error cargando repartidores: ${deliveriesRes.error.message}`);
      if (routesRes.error) throw new Error(`Error cargando rutas: ${routesRes.error.message}`);

      const ordersData = (ordersRes.data ?? []) as OrderRow[];
      const routesData = (routesRes.data ?? []) as DeliveryRoute[];

      const enrichedRoutes = routesData.map((r: DeliveryRoute) => ({
        ...r,
        order_no: ordersData.find((o: OrderRow) => o.id === r.order_id)?.order_no || null
      })) as EnrichedDeliveryRoute[];

      setOrders(ordersData);
      setDeliveries(deliveriesRes.data as DeliveryUser[]);
      setDeliveryRoutes(enrichedRoutes);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const channel = supabase
      .channel('logistica-realtime-final')
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
        console.log('Cambio detectado en la DB, recargando datos...', payload.table);
        loadData(true);
      })
      .subscribe(status => setIsLive(status === 'SUBSCRIBED'));
      
    return () => { supabase.removeChannel(channel); };
  }, [loadData]);

  const assignDelivery = async (orderId: string, deliveryUserId: string) => {
    const { error } = await supabase.from('orders').update({ delivery_assigned_to: deliveryUserId, status: 'assigned' }).eq('id', orderId);
    if (error) { setError('Error al asignar repartidor: ' + error.message); throw error; }
  };

  const saveLocation = async (orderId: string, patch: Partial<Pick<OrderRow, 'delivery_address' | 'notes' | 'delivery_geo_lat' | 'delivery_geo_lng'>>) => {
    const { error } = await supabase.from('orders').update(patch).eq('id', orderId);
    if (error) { setError('Error al guardar ubicación/notas: ' + error.message); throw error; }
  };
  
  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const { error: rpcError } = await supabase.rpc('fn_order_transition', { p_order_id: orderId, p_to_status: newStatus, p_reason: `Cambio de estado por logística a ${newStatus}`, p_geo_lat: null, p_geo_lng: null, p_evidence_url: null });
      if (rpcError) throw rpcError;
      // La función fn_order_transition ahora se encarga de actualizar ambas tablas (orders y delivery_routes)
      // y el canal de Supabase se encargará de recargar los datos en la UI.
    } catch (err: any) { 
      setError('Error al cambiar estado: ' + err.message); 
      throw err; 
    }
  };

  const confirmDelivered = async (orderId: string) => {
    await handleStatusChange(orderId, 'confirmed');
  };

  // NUEVA FUNCIÓN: Actualizar fechas de encomienda
  const updateEncomiendaDates = async (orderId: string, fechaSalida?: string, fechaEntrega?: string) => {
    const updateData: any = {};
    if (fechaSalida !== undefined) updateData.fecha_salida_bodega = fechaSalida;
    if (fechaEntrega !== undefined) updateData.fecha_entrega_encomienda = fechaEntrega;
    
    const { error } = await supabase.from('orders').update(updateData).eq('id', orderId);
    if (error) { 
      setError('Error al actualizar fechas de encomienda: ' + error.message); 
      throw error; 
    }
  };

  // NUEVA FUNCIÓN: Marcar/desmarcar como encomienda
  const toggleEncomienda = async (orderId: string, isEncomienda: boolean) => {
    const { error } = await supabase.from('orders').update({ is_encomienda: isEncomienda }).eq('id', orderId);
    if (error) { 
      setError('Error al cambiar tipo de pedido: ' + error.message); 
      throw error; 
    }
  };

  return { 
    orders, 
    deliveries, 
    deliveryRoutes, 
    loading, 
    error, 
    isLive,
    loadData, 
    assignDelivery, 
    handleStatusChange,
    saveLocation,
    confirmDelivered,
    updateEncomiendaDates, // NUEVA
    toggleEncomienda, // NUEVA
    clearError: () => setError(null)
  };
}
