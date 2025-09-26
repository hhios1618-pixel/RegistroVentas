// src/app/endpoints/orders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { geocodeFirstOSM, normalizeAddressForSantaCruz } from '@/lib/geocode';

export const runtime = 'nodejs'; // Necesario para usar SERVICE_ROLE en Vercel

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: { persistSession: false },
});

type LocalOption = 'La Paz' | 'El Alto' | 'Cochabamba' | 'Santa Cruz' | 'Sucre';

type OrderItemIn = {
  product_code?: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
};

type Payload = {
  sale_type: 'unidad' | 'mayor';
  local: LocalOption;

  // IMPORTANTE: hoy este suele ser el delivery (nombre). Lo mantenemos por compat.
  seller: string;
  seller_role?: 'ASESOR' | 'PROMOTOR' | 'delivery' | 'repartidor' | null;

  // NUEVO: comercial explícito
  sales_user_id?: string | null;
  sales_role?: 'ASESOR' | 'PROMOTOR' | null;

  destino: string;
  customer_id: string;               // CI/NIT
  customer_phone?: string | null;
  numero?: string | null;

  customer_name: string;
  payment_method?: 'EFECTIVO' | 'QR' | 'TRANSFERENCIA' | null;
  address?: string | null;           // dirección libre opcional
  notes?: string | null;
  delivery_date?: string | null;     // 'YYYY-MM-DD'
  delivery_from?: string | null;     // 'HH:mm'
  delivery_to?: string | null;       // 'HH:mm'

  sistema?: boolean;
  items: OrderItemIn[];
};

const money = (n: number): number =>
  Number(((Math.round(n * 100) / 100)).toFixed(2));

function isOperativeRole(r?: string | null) {
  if (!r) return false;
  const s = r.trim().toLowerCase();
  return s === 'delivery' || s === 'repartidor';
}

async function resolveSalesRole(
  sales_user_id: string | null | undefined,
  seller_role: string | null | undefined,
  seller_name: string | null | undefined
): Promise<string | null> {
  // 1) Si viene sales_role explícito en body y NO es operativo, úsalo.
  // (lo validamos afuera, para mantener la prioridad aquí simple)
  // 2) Buscar por sales_user_id en people/users_profile
  if (sales_user_id) {
    // people
    const p1 = await supabase
      .from('people')
      .select('role')
      .eq('id', sales_user_id)
      .maybeSingle();
    if (!p1.error && p1.data?.role && !isOperativeRole(p1.data.role)) {
      return p1.data.role;
    }
    // users_profile
    const p2 = await supabase
      .from('users_profile')
      .select('role')
      .eq('id', sales_user_id)
      .maybeSingle();
    if (!p2.error && p2.data?.role && !isOperativeRole(p2.data.role)) {
      return p2.data.role;
    }
  }

  // 3) Usar seller_role del body si vino y no es operativo
  if (seller_role && !isOperativeRole(seller_role)) {
    return seller_role;
  }

  // 4) Buscar por nombre de seller en people/users_profile (si vino)
  const name = seller_name?.trim();
  if (name) {
    const n1 = await supabase
      .from('people')
      .select('role')
      .eq('full_name', name)
      .maybeSingle();
    if (!n1.error && n1.data?.role && !isOperativeRole(n1.data.role)) {
      return n1.data.role;
    }
    const n2 = await supabase
      .from('users_profile')
      .select('role')
      .eq('full_name', name)
      .maybeSingle();
    if (!n2.error && n2.data?.role && !isOperativeRole(n2.data.role)) {
      return n2.data.role;
    }
  }

  return null; // comercial desconocido => se mostrará “Sin Rol” en el dashboard
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Payload | undefined;
    if (!body) {
      return NextResponse.json({ error: 'Cuerpo vacío' }, { status: 400 });
    }

    const {
      sale_type, local, seller,
      seller_role = null,
      sales_user_id = null,
      sales_role = null, // opcional explícito
      destino, customer_id, customer_phone = null, numero = null,
      customer_name, payment_method = null, address = null, notes = null,
      delivery_date = null, delivery_from = null, delivery_to = null,
      sistema = false,
      items,
    } = body;

    // Validaciones mínimas
    if (!seller?.trim()) return NextResponse.json({ error: 'Falta vendedor (seller)' }, { status: 400 });
    if (!local) return NextResponse.json({ error: 'Falta local' }, { status: 400 });
    if (!destino?.trim()) return NextResponse.json({ error: 'Falta destino' }, { status: 400 });
    if (!customer_id?.trim()) return NextResponse.json({ error: 'Falta ID del cliente' }, { status: 400 });
    if (!customer_name?.trim()) return NextResponse.json({ error: 'Falta nombre del cliente' }, { status: 400 });
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Incluye al menos 1 producto' }, { status: 400 });
    }
    if (items.length > 10) {
      return NextResponse.json({ error: 'Máximo 10 productos' }, { status: 400 });
    }

    for (const it of items) {
      if (!it.product_name?.trim()) {
        return NextResponse.json({ error: 'Cada item debe tener nombre' }, { status: 400 });
      }
      if (!(Number.isFinite(it.quantity) && it.quantity > 0)) {
        return NextResponse.json({ error: 'Cantidad inválida' }, { status: 400 });
      }
      if (!(Number.isFinite(it.unit_price) && it.unit_price >= 0)) {
        return NextResponse.json({ error: 'Precio inválido' }, { status: 400 });
      }
    }

    const amount = money(items.reduce((s, it) => s + it.quantity * it.unit_price, 0));
    const items_summary = items.map(it => `${it.quantity} ${it.product_name}`).join('\n');

    // --- Resolver rol comercial final ---
    // Si vino sales_role y NO es operativo, úsalo; si no, trata de resolver.
    const sales_role_final =
      (sales_role && !isOperativeRole(sales_role) ? sales_role : null) ||
      (await resolveSalesRole(sales_user_id, seller_role, seller));

    // Mantener is_promoter por compat (derivado de seller_role del body, NO del comercial)
    const is_promoter = (seller_role ?? '').toUpperCase() === 'PROMOTOR';

    // 1) ORDER
    const { data: orderIns, error: orderErr } = await supabase
      .from('orders')
      .insert([{
        sale_type,
        local,

        // Compat (operativo):
        seller: seller.trim(),
        seller_role: seller_role ?? null,
        is_promoter,

        // NUEVO (comercial):
        sales_user_id: sales_user_id ?? null,
        sales_role: sales_role_final ?? null,

        destino,
        customer_id,
        customer_phone,
        numero,
        amount,
        sistema: !!sistema,

        // nuevos
        customer_name,
        payment_method,
        address,           // guardas lo que te llega
        notes,
        delivery_date: delivery_date ? delivery_date : null,
        delivery_from: delivery_from ? delivery_from : null,
        delivery_to: delivery_to ? delivery_to : null,
        items_summary,
      }])
      .select('id, order_no')
      .single();

    if (orderErr || !orderIns) {
      return NextResponse.json({ error: orderErr?.message || 'No se pudo crear la orden' }, { status: 500 });
    }

    const orderId = orderIns.id as string;

    // 2) ITEMS
    const itemsPayload = items.map((it) => ({
      order_id: orderId,
      product_code: it.product_code || null,
      product_name: it.product_name.trim(),
      quantity: it.quantity,
      unit_price: money(it.unit_price),
      subtotal: money(it.quantity * it.unit_price),
    }));

    const { error: itemsErr } = await supabase.from('order_items').insert(itemsPayload);
    if (itemsErr) {
      // Rollback manual
      await supabase.from('order_items').delete().eq('order_id', orderId);
      await supabase.from('orders').delete().eq('id', orderId);
      return NextResponse.json({ error: itemsErr.message }, { status: 500 });
    }

    // 3) GEO-CODIFICACIÓN AUTOMÁTICA (no bloqueante)
    try {
      const text = normalizeAddressForSantaCruz(address?.trim() || destino?.trim() || null);
      if (text) {
        const hit = await geocodeFirstOSM(text);
        if (hit) {
          await supabase
            .from('orders')
            .update({
              delivery_address: address?.trim() || destino?.trim() || hit.label || null,
              delivery_geo_lat: hit.lat,
              delivery_geo_lng: hit.lng,
              updated_at: new Date().toISOString(),
            })
            .eq('id', orderId);
        }
      }
    } catch {
      // no rompas la creación si Nominatim falla
    }

    return NextResponse.json(
      { id: orderId, order_no: orderIns.order_no, amount },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error inesperado';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}