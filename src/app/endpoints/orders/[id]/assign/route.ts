// src/app/endpoints/orders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: { persistSession: false },
});

type OrderItemIn = {
  product_code?: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  // extras que tu tabla soporta:
  sale_type?: string | null;
  image_url?: string | null;
  original_name?: string | null;
  is_recognized?: boolean | null;
  base_product_name?: string | null;
};

type Payload = {
  // a nivel orden (en tu tabla son NULLABLE: podemos mandar null)
  sale_type?: 'unidad' | 'mayor' | null;
  local?: 'La Paz' | 'El Alto' | 'Cochabamba' | 'Santa Cruz' | 'Sucre' | null;

  // vendedor operativo (compat)
  seller: string;
  seller_role?: string | null;

  // comercial explícito (opcional)
  sales_user_id?: string | null;
  sales_role?: string | null;

  destino?: string | null;
  customer_id: string;                   // CI/NIT (OBLIGATORIO en tu tabla)
  customer_phone?: string | null;
  numero?: string | null;

  customer_name: string;                 // lo usas en dashboard
  payment_method?: 'EFECTIVO' | 'QR' | 'TRANSFERENCIA' | null;

  address?: string | null;               // libre
  notes?: string | null;

  delivery_date?: string | null;         // 'YYYY-MM-DD'
  delivery_from?: string | null;         // 'HH:mm'
  delivery_to?: string | null;           // 'HH:mm'

  sistema?: boolean;

  // totales y detalle
  items: OrderItemIn[];
};

const money = (n: number) => Number((Math.round(n * 100) / 100).toFixed(2));

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Payload;

    // ---- Validaciones mínimas (compat con tu schema) ----
    if (!body) return NextResponse.json({ error: 'Cuerpo vacío' }, { status: 400 });
    const {
      seller, customer_id, customer_name,
      items,
      sale_type = null, local = null, seller_role = null, sales_user_id = null, sales_role = null,
      customer_phone = null, numero = null, destino = null, address = null,
      notes = null, payment_method = null, delivery_date = null, delivery_from = null, delivery_to = null,
      sistema = false,
    } = body;

    if (!seller?.trim()) return NextResponse.json({ error: 'Falta vendedor (seller)' }, { status: 400 });
    if (!customer_id?.trim()) return NextResponse.json({ error: 'Falta CI/NIT (customer_id)' }, { status: 400 });
    if (!customer_name?.trim()) return NextResponse.json({ error: 'Falta nombre del cliente' }, { status: 400 });
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Incluye al menos 1 producto' }, { status: 400 });
    }
    if (items.length > 50) {
      return NextResponse.json({ error: 'Máximo 50 productos' }, { status: 400 });
    }
    for (const it of items) {
      if (!it.product_name?.trim()) return NextResponse.json({ error: 'Cada item debe tener nombre' }, { status: 400 });
      if (!(Number.isFinite(it.quantity) && it.quantity > 0)) return NextResponse.json({ error: 'Cantidad inválida' }, { status: 400 });
      if (!(Number.isFinite(it.unit_price) && it.unit_price >= 0)) return NextResponse.json({ error: 'Precio inválido' }, { status: 400 });
    }

    const amount = money(items.reduce((s, it) => s + it.quantity * it.unit_price, 0));
    const items_summary = items.map(it => `${it.quantity} ${it.product_name}`).join('\n');

    // ---- INSERT orders (deja que order_no lo asigne la SEQUENCE) ----
    const { data: orderIns, error: orderErr } = await admin
      .from('orders')
      .insert([{
        // columnas “compat”
        sale_type, local,
        seller: seller.trim(),
        seller_role,
        is_promoter: (seller_role ?? '').toUpperCase() === 'PROMOTOR',
        sales_user_id, sales_role,

        destino,
        customer_id: customer_id.trim(),
        customer_phone: customer_phone || null,
        numero,
        amount,
        sistema: !!sistema,

        customer_name: customer_name.trim(),
        payment_method,
        address: address?.trim() || null,
        notes: notes?.trim() || null,
        delivery_date: delivery_date || null,
        delivery_from: delivery_from || null,
        delivery_to: delivery_to || null,
        items_summary,
      }])
      .select('id, order_no')
      .single();

    if (orderErr || !orderIns) {
      return NextResponse.json({ error: orderErr?.message || 'No se pudo crear la orden' }, { status: 500 });
    }

    const orderId = orderIns.id as string;

    // ---- INSERT order_items (incluye tus columnas extra si vienen) ----
    const itemsPayload = items.map((it) => ({
      order_id: orderId,
      product_code: it.product_code ?? null,
      product_name: it.product_name.trim(),
      quantity: it.quantity,
      unit_price: money(it.unit_price),
      subtotal: money(it.quantity * it.unit_price),

      // extras (tu tabla los tiene, son NULLABLE)
      sale_type: it.sale_type ?? null,
      image_url: it.image_url ?? null,
      original_name: it.original_name ?? null,
      is_recognized: typeof it.is_recognized === 'boolean' ? it.is_recognized : null,
      base_product_name: it.base_product_name ?? null,
    }));

    const { error: itemsErr } = await admin.from('order_items').insert(itemsPayload);
    if (itemsErr) {
      // rollback manual para no dejar basura
      await admin.from('order_items').delete().eq('order_id', orderId);
      await admin.from('orders').delete().eq('id', orderId);
      return NextResponse.json({ error: itemsErr.message }, { status: 500 });
    }

    // OK
    return NextResponse.json({ id: orderId, order_no: orderIns.order_no, amount }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error inesperado' }, { status: 500 });
  }
}
