// src/app/api/orders/[id]/assign/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

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

function parseLocalISO(s?: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd;
}

type AssignBody = {
  deliveryUserId: string;
  desde?: string; // "YYYY-MM-DDTHH:mm" local
  hasta?: string; // "YYYY-MM-DDTHH:mm" local
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;
  const supabase = getSupabaseAdmin();
  const routeDate = getBoliviaDate();

  const { data, error } = await supabase
    .from('delivery_routes')
    .select('id, order_id, delivery_user_id, status, window_start, window_end, route_date')
    .eq('order_id', orderId)
    .eq('route_date', routeDate)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ assignment: data ?? null }, { status: 200 });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;
  if (!orderId) {
    return NextResponse.json({ error: 'Falta el ID del pedido' }, { status: 400 });
  }

  try {
    const body = (await req.json()) as AssignBody | undefined;
    const deliveryUserId = body?.deliveryUserId?.trim();
    const desdeStr = body?.desde?.trim();
    const hastaStr = body?.hasta?.trim();

    if (!deliveryUserId) {
      return NextResponse.json({ error: 'Falta el ID del repartidor' }, { status: 400 });
    }

    let desde: Date | null = null;
    let hasta: Date | null = null;

    if (desdeStr || hastaStr) {
      desde = parseLocalISO(desdeStr);
      hasta = parseLocalISO(hastaStr);
      if (!desde || !hasta) return NextResponse.json({ error: 'Invalid time value' }, { status: 400 });
      if (!(hasta > desde)) return NextResponse.json({ error: 'El rango horario es inválido' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const routeDate = getBoliviaDate();

    // ruta existente del día (si hay)
    const { data: existingRoute, error: checkErr } = await supabase
      .from('delivery_routes')
      .select('id, delivery_user_id, window_start, window_end')
      .eq('order_id', orderId)
      .eq('route_date', routeDate)
      .maybeSingle();

    if (checkErr) return NextResponse.json({ error: checkErr.message }, { status: 500 });

    // validar solapes con otras rutas del delivery
    if (desde && hasta) {
      const { data: others, error: listErr } = await supabase
        .from('delivery_routes')
        .select('id, window_start, window_end')
        .eq('delivery_user_id', deliveryUserId)
        .eq('route_date', routeDate);

      if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 });

      const hasOverlap = (others ?? [])
        .filter(r => r.id !== existingRoute?.id)
        .some(r => {
          if (!r.window_start || !r.window_end) return false;
          const bStart = new Date(r.window_start);
          const bEnd = new Date(r.window_end);
          return overlaps(desde!, hasta!, bStart, bEnd);
        });

      if (hasOverlap) return NextResponse.json({ error: 'OVERLAP' }, { status: 409 });
    }

    // repartidor existe
    const { data: deliveryUser, error: deliveryErr } = await supabase
      .from('users_profile')
      .select('full_name')
      .eq('id', deliveryUserId)
      .single();

    if (deliveryErr || !deliveryUser) {
      return NextResponse.json({ error: 'Repartidor no encontrado' }, { status: 404 });
    }

    // estado actual de la orden
    const { data: curOrder, error: curErr } = await supabase
      .from('orders')
      .select('status, delivery_assigned_to, seller')
      .eq('id', orderId)
      .single();
    if (curErr) return NextResponse.json({ error: curErr.message }, { status: 500 });

    // solo promover pending -> assigned; si ya es out_for_delivery/delivered/etc, respetar
    const nextStatus = curOrder?.status === 'pending' ? 'assigned' : curOrder?.status;
    const nextAssignee = curOrder?.delivery_assigned_to ?? deliveryUserId;

    // CORRECCIÓN CRÍTICA: NO sobrescribir el campo 'seller' con el nombre del delivery
    // El vendedor debe mantenerse como está, solo se asigna el delivery
    const { error: updateErr } = await supabase
      .from('orders')
      .update({
        status: nextStatus,
        delivery_assigned_to: nextAssignee,
        // REMOVIDO: seller: deliveryUser.full_name, <- Esta línea causaba el problema
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

    // inserta/actualiza ruta del día
    if (!existingRoute) {
      const { error: insErr } = await supabase.from('delivery_routes').insert({
        order_id: orderId,
        delivery_user_id: deliveryUserId,
        status: 'pending',
        route_date: routeDate,
        window_start: desde ? desde.toISOString() : null,
        window_end:   hasta ? hasta.toISOString() : null,
      });
      if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
    } else {
      const { error: updErr } = await supabase
        .from('delivery_routes')
        .update({
          delivery_user_id: deliveryUserId,
          window_start: desde ? desde.toISOString() : existingRoute.window_start ?? null,
          window_end:   hasta ? hasta.toISOString() : existingRoute.window_end ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingRoute.id);
      if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    // Warning de ineficiencia: otra entrega misma dirección hoy
    const warnings: string[] = [];
    let currentAddress: string | null = null;

    const { data: orderAddr, error: addrErr1 } = await supabase
      .from('orders')
      .select('delivery_address')
      .eq('id', orderId)
      .single();
    if (!addrErr1 && orderAddr) currentAddress = orderAddr.delivery_address;

    if (currentAddress) {
      const { data: sameAddr, error: addrErr2 } = await supabase
        .from('orders')
        .select('id, delivery_address')
        .eq('delivery_assigned_to', deliveryUserId)
        .in('status', ['assigned', 'out_for_delivery'])
        .neq('id', orderId);

      if (!addrErr2 && sameAddr?.some(o => o.delivery_address === currentAddress)) {
        warnings.push('Hay otra entrega del mismo delivery a la misma dirección hoy.');
      }
    }

    return NextResponse.json({ ok: true, warnings }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error inesperado en el servidor';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}