// --- ARCHIVO: hooks/useLogisticsData.js ---
'use client';

import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { OrderRow, DeliveryUser, OrderStatus, DeliveryRoute, DeliveryMetrics } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function useLogisticsData() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const [ordersRes, deliveriesRes] = await Promise.all([
        supabase.from('orders').select(`*, delivery_user:users_profile(full_name, phone, vehicle_type)`).order('created_at', { ascending: false }),
        supabase.from('users_profile').select('*').eq('role', 'delivery').order('full_name', { ascending: true }),
      ]);

      if (ordersRes.error) throw new Error(`Error cargando pedidos: ${ordersRes.error.message}`);
      if (deliveriesRes.error) throw new Error(`Error cargando repartidores: ${deliveriesRes.error.message}`);

      const formattedOrders = ordersRes.data.map(order => ({
        ...order,
        delivery_assigned_to_name: order.delivery_user?.full_name || null,
      }));

      setOrders(formattedOrders as OrderRow[]);
      setDeliveries(deliveriesRes.data as DeliveryUser[]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const channel = supabase
      .channel('logistica-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => loadData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users_profile' }, () => loadData(true))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadData]);

  const assignDelivery = async (orderId: string, deliveryId: string) => {
    try {
      const delivery = deliveries.find(d => d.id === deliveryId);
      if (!delivery) throw new Error("Repartidor no encontrado");
      
      const newLoad = (delivery.current_load ?? 0) + 1;

      const { data: updatedOrder, error } = await supabase.from('orders')
        .update({ delivery_assigned_to: deliveryId, status: 'assigned', updated_at: new Date().toISOString() })
        .eq('id', orderId)
        .select(`*, delivery_user:users_profile(full_name)`)
        .single();
      if (error) throw error;
      
      await supabase.from('users_profile').update({ current_load: newLoad }).eq('id', deliveryId);
      
      // Actualizar estado local
      const formattedOrder = { ...updatedOrder, delivery_assigned_to_name: updatedOrder.delivery_user?.full_name || null };
      setOrders(prev => prev.map(o => o.id === orderId ? formattedOrder : o));
      setDeliveries(prev => prev.map(d => d.id === deliveryId ? { ...d, current_load: newLoad } : d));
      return formattedOrder;
    } catch (error: any) {
      console.error("Error al asignar:", error);
      throw error;
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const { data: updatedOrder, error } = await supabase.from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId)
        .select(`*, delivery_user:users_profile(full_name)`)
        .single();
      if (error) throw error;

      // Lógica para ajustar carga del repartidor si el pedido se completa o cancela
      const oldOrder = orders.find(o => o.id === orderId);
      if (oldOrder?.delivery_assigned_to && (newStatus === 'confirmed' || newStatus === 'cancelled')) {
        const delivery = deliveries.find(d => d.id === oldOrder.delivery_assigned_to);
        if (delivery) {
          const newLoad = Math.max(0, (delivery.current_load ?? 1) - 1);
          await supabase.from('users_profile').update({ current_load: newLoad }).eq('id', delivery.id);
          setDeliveries(prev => prev.map(d => d.id === delivery.id ? { ...d, current_load: newLoad } : d));
        }
      }

      const formattedOrder = { ...updatedOrder, delivery_assigned_to_name: updatedOrder.delivery_user?.full_name || null };
      setOrders(prev => prev.map(o => o.id === orderId ? formattedOrder : o));
      return formattedOrder;
    } catch (error: any) {
      console.error("Error cambiando estado:", error);
      throw error;
    }
  };

  return { orders, deliveries, loading, error, loadData, assignDelivery, handleStatusChange };
}