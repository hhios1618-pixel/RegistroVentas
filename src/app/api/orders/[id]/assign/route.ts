// src/app/api/orders/[id]/assign/route.ts  (Next 15 + ventanas + warnings)
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs'; // SERVICE_ROLE requiere Node

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const srv = process.env.SUPABASE_SERVICE_ROLE;
  if (!url) throw new Error('Missing env: NEXT_PUBLIC_SUPABASE_URL');
  if (!srv) throw new Error('Missing env: SUPABASE_SERVICE_ROLE');
  return createClient(url, srv, { auth: { persistSession: false } });
}

// Fecha local Bolivia (YYYY-MM-DD) para delivery_routes
const getBoliviaDate = (): string => {
  const now = new Date();
  const boliviaDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/La_Paz' }));
  const y = boliviaDate.getFullYear();
  const m = String(boliviaDate.getMonth() + 1).padStart(2, '0');
  const d = String(boliviaDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Convierte dos ISO de La Paz a tstzrange [desde,hasta)
function toRangeUTC(desdeISO: string, hastaISO: string) {
  const d = new Date(new Date(desdeISO + ' America/La_Paz').toUTCString());
  const h = new Date(new Date(hastaISO + ' America/La_Paz').toUTCString());
  // Normaliza a ISO sin ms
  const dIso = d.toISOString();
  const hIso = h.toISOString();
  return `[${dIso},${hIso})`;
}

type AssignBody = {
  deliveryUserId: string;     // requerido
  desde?: string;             // "2025-08-20T14:30:00" (hora local La Paz)
  hasta?: string;             // "2025-08-20T15:30:00" (hora local La Paz)
  createdBy?: string;         // coordinador que asigna (opcional pero recomendado)
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Next 15
) {
  const { id: orderId } = await params;
  if (!orderId) {
    return NextResponse.json({ error: 'Falta el ID del pedido' }, { status: 400 });
  }

  try {
    const body = (await req.json()) as AssignBody | undefined;
    const deliveryUserId = body?.deliveryUserId?.trim();
    const desde = body?.desde?.trim();
    const hasta = body?.hasta?.trim();
    const createdBy = body?.createdBy?.trim() || deliveryUserId; // fallback

    if (!deliveryUserId) {
      return NextResponse.json({ error: 'Falta el ID del repartidor' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const routeDate = getBoliviaDate();

    // 1) Asegura que la orden existe y obtén location_hash para warnings
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('id, location_hash')
      .eq('id', orderId)
      .single();

    if (orderErr || !order) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    // 2) Verifica repartidor
    const { data: deliveryUser, error: deliveryErr } = await supabase
      .from('users_profile')
      .select('full_name')
      .eq('id', deliveryUserId)
      .single();

    if (deliveryErr || !deliveryUser) {
      return NextResponse.json({ error: 'Repartidor no encontrado' }, { status: 404 });
    }

    // 3) Marca la orden como assigned (idempotente)
    const { data: updatedOrder, error: updateErr } = await supabase
      .from('orders')
      .update({
        status: 'assigned',
        delivery_assigned_to: deliveryUserId,
        seller: deliveryUser.full_name, // tu lógica original
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // 4) Inserta/Upsertea la ruta del día para vistas operativas
    // Recomendado tener UNIQUE (order_id, route_date) en delivery_routes
    const { error: routeErr } = await supabase
      .from('delivery_routes')
      .upsert(
        {
          order_id: orderId,
          delivery_user_id: deliveryUserId,
          status: 'pending',
          route_date: routeDate,
        },
        { onConflict: 'order_id,route_date', ignoreDuplicates: false }
      );

    if (routeErr) {
      return NextResponse.json({ error: routeErr.message }, { status: 500 });
    }

    // 5) Si viene ventana, crea la asignación “fuerte” (bloquea solapes)
    let warnings: string[] = [];
    if (desde && hasta) {
      const timeWindow = toRangeUTC(desde, hasta);

      // RPC maneja el exclusion constraint y propaga 23P01 en caso de solape
      const { data: assignment, error: assignErr } = await supabase.rpc(
        'insert_delivery_assignment',
        {
          _order_id: orderId,
          _delivery_id: deliveryUserId,
          _time_window: timeWindow,
          _created_by: createdBy,
        }
      );

      if (assignErr) {
        // 23P01 = exclusion constraint violated
        // 23514 también podría saltar si agregas checks
        const pgCode = (assignErr as any).code;
        if (pgCode === '23P01') {
          return NextResponse.json(
            { error: 'OVERLAP', message: 'El delivery ya tiene otra entrega en ese rango.' },
            { status: 409 }
          );
        }
        return NextResponse.json(
          { error: 'Falló la asignación con ventana', detail: assignErr.message },
          { status: 500 }
        );
      }

      // 6) Warnings por ubicación duplicada en ventana cercana (±45 min)
      const start = new Date(desde);
      const end = new Date(hasta);
      const nearStart = new Date(start.getTime() - 45 * 60 * 1000).toISOString();
      const nearEnd = new Date(end.getTime() + 45 * 60 * 1000).toISOString();

      const { data: near, error: nearErr } = await supabase
        .from('delivery_assignments_view')
        .select('assignment_id, order_id, delivery_id, window_start, window_end, location_hash, status')
        .eq('location_hash', order.location_hash)
        .neq('order_id', orderId)
        .in('status', ['assigned', 'picked_up'])
        .gte('window_end', nearStart)
        .lte('window_start', nearEnd);

      if (!nearErr && near && near.length > 0) {
        warnings.push(
          'Ubicación duplicada cercana: hay otra entrega a la misma dirección en una ventana próxima. Considera consolidar.'
        );
      }
    }

    return NextResponse.json({ ok: true, order: updatedOrder, warnings }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error inesperado en el servidor';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}