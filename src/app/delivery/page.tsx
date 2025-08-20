'use client';

import { useEffect, useMemo, useState } from 'react';
import supabase from '@/lib/supabaseClient';
import type { OrderRow, DeliveryUser } from '@/types';

// Definimos UserProfile aquí o lo agregamos al archivo types.ts
interface UserProfile {
  id: string;
  full_name?: string;
  email?: string;
  phone?: string;
  role?: string;
  is_active?: boolean;
}

export default function DeliveryPage() {
  const [me, setMe] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [fileMap, setFileMap] = useState<Record<string, File | null>>({});

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('users_profile').select('*').eq('id', user.id).single();
      setMe(data as UserProfile);
    })();
  }, []);

  const load = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .in('status', ['assigned','out_for_delivery'] as any)
      .order('created_at', { ascending: true });
    setOrders((data || []) as OrderRow[]);
  };

  useEffect(() => {
    if (!me) return;
    load();
    const ch = supabase
      .channel('orders-delivery')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [me]);

  const startRoute = async (orderId: string) => {
    setBusyId(orderId);
    try {
      const { error } = await supabase.rpc('fn_order_transition', {
        p_order_id: orderId,
        p_to_status: 'out_for_delivery',
        p_reason: 'Delivery salió a ruta',
        p_geo_lat: null, p_geo_lng: null, p_evidence_url: null,
      });
      if (error) throw error;
    } finally {
      setBusyId(null);
    }
  };

  const markDelivered = async (orderId: string) => {
    if (!navigator.geolocation) {
      alert('Geolocalización requerida para marcar entregado.');
      return;
    }

    setBusyId(orderId);
    try {
      const coords = await new Promise<GeolocationCoordinates>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(pos.coords),
          (err) => reject(err),
          { enableHighAccuracy: true, timeout: 8000 }
        )
      );

      // Subir evidencia opcional si se adjuntó
      let evidenceUrl: string | null = null;
      const file = fileMap[orderId] || null;
      if (file) {
        const ext = file.name.split('.').pop();
        const path = `evidence/${orderId}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('evidence').upload(path, file, { upsert: true });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from('evidence').getPublicUrl(path);
        evidenceUrl = pub.publicUrl;
      }

      const { error } = await supabase.rpc('fn_order_transition', {
        p_order_id: orderId,
        p_to_status: 'delivered',
        p_reason: 'Entregado por delivery',
        p_geo_lat: coords.latitude,
        p_geo_lng: coords.longitude,
        p_evidence_url: evidenceUrl,
      });
      if (error) throw error;
    } catch (e: any) {
      alert(e.message || 'Error marcando entrega.');
    } finally {
      setBusyId(null);
    }
  };

  const assigned = useMemo(() => orders.filter(o => o.status === 'assigned'), [orders]);
  const active = useMemo(() => orders.filter(o => o.status === 'out_for_delivery'), [orders]);

  return (
    <main className="p-6 space-y-10">
      <h1 className="text-2xl font-bold">Mis Pedidos</h1>

      <section>
        <h2 className="text-xl font-semibold mb-3">Asignados ({assigned.length})</h2>
        <div className="grid gap-3">
          {assigned.map(o => (
            <div key={o.id} className="border rounded p-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{o.order_no}</div>
                <div className="text-sm text-gray-600">Total: ${o.amount?.toFixed(2) || '0.00'}</div>
              </div>
              <button
                onClick={() => startRoute(o.id)}
                className="px-3 py-1 rounded bg-black text-white disabled:opacity-50"
                disabled={busyId === o.id}
              >
                {busyId === o.id ? 'Procesando…' : 'Empezar ruta'}
              </button>
            </div>
          ))}
          {assigned.length === 0 && <div className="text-sm text-gray-500">Sin asignaciones.</div>}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">En ruta ({active.length})</h2>
        <div className="grid gap-3">
          {active.map(o => (
            <div key={o.id} className="border rounded p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{o.order_no}</div>
                  <div className="text-sm text-gray-600">Total: ${o.amount?.toFixed(2) || '0.00'}</div>
                </div>
                <button
                  onClick={() => markDelivered(o.id)}
                  className="px-3 py-1 rounded bg-green-600 text-white disabled:opacity-50"
                  disabled={busyId === o.id}
                >
                  {busyId === o.id ? 'Marcando…' : 'Marcar entregado'}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFileMap(prev => ({ ...prev, [o.id]: e.target.files?.[0] || null }))}
                />
                <span className="text-xs text-gray-500">Foto/evidencia (opcional)</span>
              </div>
            </div>
          ))}
          {active.length === 0 && <div className="text-sm text-gray-500">No hay pedidos en ruta.</div>}
        </div>
      </section>
    </main>
  );
}