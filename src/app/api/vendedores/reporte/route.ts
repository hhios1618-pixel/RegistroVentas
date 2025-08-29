// RUTA: src/app/api/vendedores/reporte/route.ts

import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// --- TIPOS ---
type SB = SupabaseClient<any, "public", any>;
type Order = {
  seller: string | null;
  sales_user_id: string | null;
  amount: number;
};
type AdSpend = {
  "Nombre de la campaña": string | null;
  "Importe gastado (BOB)": string | number | null;
  matched_user_id: string | null;
};
type SellerProfile = {
  id: string;
  full_name: string;
  local: string | null; // La sucursal puede ser null
};

function sbAdmin(): SB {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE!;
  return createClient(url, key, { auth: { persistSession: false } });
}

function parseCurrency(value: string | number | null): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const withoutThousands = value.replace(/\./g, '');
    const withDotDecimal = withoutThousands.replace(',', '.');
    const number = parseFloat(withDotDecimal);
    return isNaN(number) ? 0 : number;
  }
  return 0;
}

export async function GET() {
  const sb = sbAdmin();
  try {
    const { data: sellers, error: sellersError } = await sb
      .from('people')
      .select('id, full_name, local')
      .in('role', ['PROMOTOR', 'ASESOR']);
    if (sellersError) throw sellersError;

    const [{ data: orders, error: ordersError }, { data: adSpends, error: adSpendsError }] = await Promise.all([
      sb.from('orders').select('seller, sales_user_id, amount'),
      sb.from('meta_ad_spend').select(`"Importe gastado (BOB)", matched_user_id`)
    ]);
    if (ordersError) throw ordersError;
    if (adSpendsError) throw adSpendsError;

    const sellerSummaryMap = new Map<string, {
      full_name: string;
      local: string; // Ahora siempre será un string
      total_sales: number;
      orders_count: number;
      ad_spend: number;
    }>();

    // Inicializar el mapa con todos los vendedores
    (sellers as SellerProfile[]).forEach(seller => {
      sellerSummaryMap.set(seller.id, {
        full_name: seller.full_name,
        // --- LÓGICA CORREGIDA AQUÍ ---
        // Si el campo 'local' es nulo, lo clasificamos como 'Promotores'.
        local: seller.local || 'Promotores',
        total_sales: 0,
        orders_count: 0,
        ad_spend: 0,
      });
    });

    // Procesar pedidos, cruzando por sales_user_id
    (orders as Order[]).forEach(order => {
      if (order.sales_user_id && sellerSummaryMap.has(order.sales_user_id)) {
        const stats = sellerSummaryMap.get(order.sales_user_id)!;
        stats.total_sales += order.amount || 0;
        stats.orders_count += 1;
      }
    });

    // Procesar gastos, cruzando por matched_user_id
    (adSpends as AdSpend[]).forEach(ad => {
      if (ad.matched_user_id && sellerSummaryMap.has(ad.matched_user_id)) {
        const stats = sellerSummaryMap.get(ad.matched_user_id)!;
        const spendAmount = parseCurrency(ad["Importe gastado (BOB)"]);
        stats.ad_spend += spendAmount;
      }
    });

    // Convertir el mapa a un array y calcular ROAS
    const finalSummary = Array.from(sellerSummaryMap.values()).map(data => {
      const roas = data.ad_spend > 0 ? data.total_sales / data.ad_spend : null;
      return {
        seller_name: data.full_name,
        branch: data.local,
        total_sales: data.total_sales,
        orders_count: data.orders_count,
        ad_spend: data.ad_spend,
        roas,
      };
    });

    return NextResponse.json(finalSummary, { status: 200 });
  } catch (e: any) {
    console.error("Error en API de reporte de vendedores:", e);
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}