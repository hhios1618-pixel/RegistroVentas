// src/app/api/orders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs'; // Necesario para usar SERVICE_ROLE en Vercel

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE!;

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
  seller: string;
  seller_role?: 'ASESOR' | 'PROMOTOR' | null;
  destino: string;
  customer_id: string;               // CI/NIT
  customer_phone?: string | null;
  numero?: string | null;

  customer_name: string;
  payment_method?: 'EFECTIVO' | 'QR' | 'TRANSFERENCIA' | null;
  address?: string | null;
  notes?: string | null;
  delivery_date?: string | null;     // 'YYYY-MM-DD'
  delivery_from?: string | null;     // 'HH:mm'
  delivery_to?: string | null;       // 'HH:mm'

  sistema?: boolean;
  items: OrderItemIn[];
};

const money = (n: number): number => Number(((Math.round(n * 100) / 100)).toFixed(2));

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Payload | undefined;
    if (!body) {
      return NextResponse.json({ error: 'Cuerpo vacío' }, { status: 400 });
    }

    const {
      sale_type, local, seller, seller_role = 'ASESOR',
      destino, customer_id, customer_phone = null, numero = null,
      customer_name, payment_method = null, address = null, notes = null,
      delivery_date = null, delivery_from = null, delivery_to = null,
      sistema = false,
      items,
    } = body;

    // Validaciones mínimas
    if (!seller?.trim()) return NextResponse.json({ error: 'Falta vendedor' }, { status: 400 });
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

    const is_promoter = seller_role === 'PROMOTOR';
    const amount = money(items.reduce((s, it) => s + it.quantity * it.unit_price, 0));
    const items_summary = items.map(it => `${it.quantity} ${it.product_name}`).join('\n');

    // 1) ORDER
    const { data: orderIns, error: orderErr } = await supabase
      .from('orders')
      .insert([{
        sale_type, local, seller, seller_role, is_promoter,
        destino, customer_id, customer_phone, numero,
        amount, sistema: !!sistema,

        // nuevos
        customer_name,
        payment_method,
        address,
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

    return NextResponse.json(
      { id: orderId, order_no: orderIns.order_no, amount },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error inesperado';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}