// src/app/api/orders/[id]/assign/route.ts  (Next 15 + blindaje + lazy init)
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

const getBoliviaDate = (): string => {
  const now = new Date();
  const boliviaDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/La_Paz' }));
  const y = boliviaDate.getFullYear();
  const m = String(boliviaDate.getMonth() + 1).padStart(2, '0');
  const d = String(boliviaDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

type AssignBody = { deliveryUserId: string };

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
    if (!deliveryUserId) {
      return NextResponse.json({ error: 'Falta el ID del repartidor' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin(); // ← lazy init en runtime
    const routeDate = getBoliviaDate();

    // Blindaje anti-duplicados en el día
    const { data: existingRoute, error: checkErr } = await supabase
      .from('delivery_routes')
      .select('id')
      .eq('order_id', orderId)
      .eq('route_date', routeDate)
      .maybeSingle();

    if (checkErr) {
      return NextResponse.json({ error: checkErr.message }, { status: 500 });
    }
    if (existingRoute) {
      return NextResponse.json(
        { message: 'Este pedido ya tiene una ruta asignada para hoy.' },
        { status: 200 }
      );
    }

    // Repartidor
    const { data: deliveryUser, error: deliveryErr } = await supabase
      .from('users_profile')
      .select('full_name')
      .eq('id', deliveryUserId)
      .single();

    if (deliveryErr || !deliveryUser) {
      return NextResponse.json({ error: 'Repartidor no encontrado' }, { status: 404 });
    }

    // Actualizar orden
    const { data: updatedOrder, error: updateErr } = await supabase
      .from('orders')
      .update({
        status: 'assigned',
        delivery_assigned_to: deliveryUserId,
        seller: deliveryUser.full_name, // tu lógica
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Insertar ruta del día
    const { error: routeErr } = await supabase.from('delivery_routes').insert({
      order_id: orderId,
      delivery_user_id: deliveryUserId,
      status: 'pending',
      route_date: routeDate,
    });

    if (routeErr) {
      return NextResponse.json({ error: routeErr.message }, { status: 500 });
    }

    return NextResponse.json(updatedOrder, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error inesperado en el servidor';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}