// src/app/api/sales-report/route.ts
import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type SB = SupabaseClient<any, any, any>;

// MODIFICADO: Se usa el nombre de columna correcto 'image_url'
type OrderItemRow = {
  order_id: string;
  product_name: string;
  quantity: number;
  subtotal: number;
  image_url?: string | null; // << CORREGIDO
};

type OrderRow = {
  id: string;
  created_at?: string | null;
  seller?: string | null;
  seller_role?: string | null;
  sales_user_id?: string | null;
  sales_role?: string | null;
  
  // Nombres de columna confirmados de tu schema
  delivery_date?: string | null;
  payment_proof_url?: string | null;
  sale_type?: string | null; // El frontend lo interpretará como 'Por Mayor' | 'Al Detalle'
  is_encomienda?: boolean | null; // << Usaremos este para determinar el tipo de orden

  [k: string]: any;
};

type ProfileRow = { id?: string | null; full_name?: string | null; role?: string | null };

function sbAdmin(): SB {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE!;
  return createClient(url, key, { auth: { persistSession: false } }) as unknown as SB;
}

// ... (El resto de las funciones de ayuda como clean, isOpRole, etc. se mantienen igual) ...
function clean(r?: string | null) {
  const s = (r ?? '').trim();
  return s || null;
}
function isOpRole(r?: string | null) {
  const s = (r ?? '').trim().toLowerCase();
  return s === 'delivery' || s === 'repartidor';
}
function detectBranchKey(sample: Record<string, any> | undefined | null): string | null {
  if (!sample) return null;
  const c = ['branch', 'sucursal', 'store', 'store_name', 'location', 'local'];
  return c.find(k => Object.prototype.hasOwnProperty.call(sample, k)) ?? null;
}
async function rolesById(sb: SB, ids: string[]) {
  const map = new Map<string, string | null>();
  if (!ids.length) return map;
  const p1 = await sb.from('people').select('id, role' as any).in('id', ids);
  if (!p1.error) ((p1.data as unknown as ProfileRow[]) ?? []).forEach(p => p.id && map.set(p.id, p.role ?? null));
  else if (!/does not exist/i.test(p1.error.message)) throw new Error(p1.error.message);
  const missing = ids.filter(id => !map.has(id));
  if (missing.length) {
    const p2 = await sb.from('users_profile').select('id, role' as any).in('id', missing);
    if (!p2.error) ((p2.data as unknown as ProfileRow[]) ?? []).forEach(p => p.id && map.set(p.id, p.role ?? null));
    else if (!/does not exist/i.test(p2.error.message)) throw new Error(p2.error.message);
  }
  return map;
}
async function rolesByName(sb: SB, names: string[]) {
  const map = new Map<string, string | null>();
  const n = names.map(x => x.trim()).filter(Boolean);
  if (!n.length) return map;
  const p1 = await sb.from('people').select('full_name, role' as any).in('full_name', n);
  if (!p1.error) ((p1.data as unknown as ProfileRow[]) ?? []).forEach(p => {
    const k = (p.full_name ?? '').trim(); if (k) map.set(k, p.role ?? null);
  });
  else if (!/does not exist/i.test(p1.error.message)) throw new Error(p1.error.message);
  const missing = n.filter(x => !map.has(x));
  if (missing.length) {
    const p2 = await sb.from('users_profile').select('full_name, role' as any).in('full_name', missing);
    if (!p2.error) ((p2.data as unknown as ProfileRow[]) ?? []).forEach(p => {
      const k = (p.full_name ?? '').trim(); if (k) map.set(k, p.role ?? null);
    });
    else if (!/does not exist/i.test(p2.error.message)) throw new Error(p2.error.message);
  }
  return map;
}


export async function GET() {
  const sb = sbAdmin();

  try {
    // 1) items
    // MODIFICADO: Se usa el nombre de columna correcto 'image_url'
    const itRes = await sb.from('order_items')
      .select('order_id, product_name, quantity, subtotal, image_url' as any)
      .order('order_id', { ascending: false });
    if (itRes.error) return NextResponse.json({ error: itRes.error.message }, { status: 500 });
    const items = (itRes.data as unknown as OrderItemRow[]) ?? [];
    if (!items.length) return NextResponse.json([], { status: 200 });

    // 2) orders (la consulta con '*' ya trae todos los campos necesarios de 'orders')
    const ids = Array.from(new Set(items.map(i => i.order_id)));
    const oRes = await sb.from('orders').select('*' as any).in('id', ids);
    if (oRes.error) return NextResponse.json({ error: oRes.error.message }, { status: 500 });
    const orders = (oRes.data as unknown as OrderRow[]) ?? [];
    const byId = new Map<string, OrderRow>();
    orders.forEach(o => byId.set(o.id, o));

    const branchKey = detectBranchKey(orders[0]);

    // 3) cat roles comerciales (sin cambios)
    const salesIds = Array.from(new Set(orders.map(o => clean(o.sales_user_id)).filter(Boolean))) as string[];
    const rById = await rolesById(sb, salesIds);
    const sellerNames = Array.from(new Set(orders.map(o => clean(o.seller)).filter(Boolean))) as string[];
    const rByName = await rolesByName(sb, sellerNames);

    // 4) merge y RESOLUCIÓN DE ROL COMERCIAL (sin operativos)
    const rows = items.map(it => {
      const o = byId.get(it.order_id) || ({} as OrderRow);
      const branch =
        branchKey && Object.prototype.hasOwnProperty.call(o, branchKey) ? (o as any)[branchKey] ?? null : null;

      // Lógica de roles (sin cambios)
      let role = clean(o.sales_role);
      if (!role && o.sales_user_id) role = clean(rById.get(o.sales_user_id) ?? null);
      if (!role && !isOpRole(o.seller_role)) role = clean(o.seller_role);
      if (!role && o.seller) role = clean(rByName.get(o.seller.trim()) ?? null);

      // MODIFICADO: Se construye el objeto final con los nombres de columna correctos
      return {
        // Campos existentes
        order_id: it.order_id,
        order_date: o.created_at ?? null,
        branch,
        seller_full_name: clean(o.seller),
        seller_role: role,
        product_name: it.product_name,
        quantity: Number(it.quantity ?? 0),
        subtotal: Number(it.subtotal ?? 0),
        
        // << --- CAMPOS CORREGIDOS SEGÚN TU SCHEMA --- >>
        delivery_date: o.delivery_date ?? null,
        product_image_url: it.image_url ?? null, // Fuente: order_items.image_url
        payment_proof_url: o.payment_proof_url ?? null,
        sale_type: o.sale_type ?? null,
        // Lógica para determinar el tipo de orden basado en 'is_encomienda'
        order_type: o.is_encomienda === true ? 'Encomienda' : 'Pedido',
      };
    });

    rows.sort((a, b) => {
      const ta = a.order_date ? new Date(a.order_date).getTime() : 0;
      const tb = b.order_date ? new Date(b.order_date).getTime() : 0;
      return tb - ta;
    });

    return NextResponse.json(rows, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}