// src/app/api/orders/[id]/assign/route.ts (VERSIÓN BLINDADA ANTI-DUPLICADOS)

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE! 
);

const getBoliviaDate = () => {
  const now = new Date();
  const boliviaDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/La_Paz' }));
  const year = boliviaDate.getFullYear();
  const month = String(boliviaDate.getMonth() + 1).padStart(2, '0');
  const day = String(boliviaDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const orderId = params.id;
  if (!orderId) {
    return NextResponse.json({ error: 'Falta el ID del pedido' }, { status: 400 });
  }

  try {
    const { deliveryUserId } = await req.json();
    if (!deliveryUserId) {
      return NextResponse.json({ error: 'Falta el ID del repartidor' }, { status: 400 });
    }

    const routeDate = getBoliviaDate();

    // ▼▼▼ BLINDAJE 1: VERIFICAR SI YA EXISTE UNA RUTA PARA ESTE PEDIDO HOY ▼▼▼
    const { data: existingRoute, error: checkErr } = await supabase
      .from('delivery_routes')
      .select('id')
      .eq('order_id', orderId)
      .eq('route_date', routeDate)
      .maybeSingle();

    if (checkErr) throw checkErr;

    if (existingRoute) {
      // Si ya existe, no hacemos nada y devolvemos un mensaje claro.
      return NextResponse.json({ message: 'Este pedido ya tiene una ruta asignada para hoy.' }, { status: 200 });
    }

    // Si no existe, procedemos con la asignación.
    const { data: deliveryUser, error: deliveryErr } = await supabase
      .from('users_profile')
      .select('full_name')
      .eq('id', deliveryUserId)
      .single();

    if (deliveryErr || !deliveryUser) {
      return NextResponse.json({ error: 'Repartidor no encontrado' }, { status: 404 });
    }

    const { data: updatedOrder, error: updateErr } = await supabase
      .from('orders')
      .update({
        status: 'assigned',
        delivery_assigned_to: deliveryUserId,
        seller: deliveryUser.full_name,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    const { error: routeErr } = await supabase
      .from('delivery_routes')
      .insert({
        order_id: orderId,
        delivery_user_id: deliveryUserId,
        status: 'pending',
        route_date: routeDate,
      });

    if (routeErr) throw routeErr;

    return NextResponse.json(updatedOrder, { status: 200 });

  } catch (e: any) {
    console.error('Error en la asignación:', e);
    return NextResponse.json({ error: e.message || 'Error inesperado en el servidor' }, { status: 500 });
  }
}
