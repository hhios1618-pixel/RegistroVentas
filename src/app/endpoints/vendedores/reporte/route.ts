// RUTA: src/app/endpoints/vendedores/reporte/route.ts

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
  local: string | null;
  telegram_username: string | null;
};

function sbAdmin(): SB {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
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
    // 1. OBTENER TODOS LOS VENDEDORES Y CREAR MAPAS DE BÚSQUEDA
    const { data: sellers, error: sellersError } = await sb
      .from('people')
      .select('id, full_name, local, telegram_username')
      .in('role', ['PROMOTOR', 'ASESOR']);
    if (sellersError) throw sellersError;

    const sellersById = new Map<string, SellerProfile>();
    const sellersByTelegram = new Map<string, SellerProfile>();
    const sellersByName = new Map<string, SellerProfile>();

    (sellers as SellerProfile[]).forEach(seller => {
      sellersById.set(seller.id, seller);
      sellersByName.set(seller.full_name.trim(), seller);
      if (seller.telegram_username) {
        sellersByTelegram.set(seller.telegram_username.trim(), seller);
      }
    });

    // 2. OBTENER DATOS DE PEDIDOS Y GASTOS EN PUBLICIDAD
    const [{ data: orders, error: ordersError }, { data: adSpends, error: adSpendsError }] = await Promise.all([
      sb.from('orders').select('seller, sales_user_id, amount'),
      sb.from('meta_ad_spend').select(`"Importe gastado (BOB)", matched_user_id`)
    ]);
    if (ordersError) throw ordersError;
    if (adSpendsError) throw adSpendsError;

    // 3. INICIALIZAR EL MAPA DE RESUMEN
    const sellerSummaryMap = new Map<string, {
      full_name: string;
      local: string;
      total_sales: number;
      orders_count: number;
      ad_spend: number;
    }>();

    (sellers as SellerProfile[]).forEach(seller => {
      sellerSummaryMap.set(seller.id, {
        full_name: seller.full_name,
        local: seller.local || 'Promotores',
        total_sales: 0,
        orders_count: 0,
        ad_spend: 0,
      });
    });

    // 4. PROCESAR PEDIDOS CON LA NUEVA LÓGICA DE MATCH INTELIGENTE
    (orders as Order[]).forEach(order => {
      let sellerId: string | null = null;
      const sellerText = order.seller?.trim();

      // Prioridad 1: Usar el ID de venta si existe
      if (order.sales_user_id && sellersById.has(order.sales_user_id)) {
        sellerId = order.sales_user_id;
      }
      // Prioridad 2: Si no hay ID, intentar matchear por usuario de Telegram
      else if (sellerText && sellersByTelegram.has(sellerText)) {
        sellerId = sellersByTelegram.get(sellerText)!.id;
      }
      // Prioridad 3: Como último recurso, matchear por nombre completo
      else if (sellerText && sellersByName.has(sellerText)) {
        sellerId = sellersByName.get(sellerText)!.id;
      }

      // Si encontramos un vendedor válido, sumamos sus estadísticas
      if (sellerId && sellerSummaryMap.has(sellerId)) {
        const stats = sellerSummaryMap.get(sellerId)!;
        stats.total_sales += order.amount || 0;
        stats.orders_count += 1;
      }
    });

    // 5. PROCESAR GASTOS EN PUBLICIDAD (sin cambios)
    (adSpends as AdSpend[]).forEach(ad => {
      if (ad.matched_user_id && sellerSummaryMap.has(ad.matched_user_id)) {
        const stats = sellerSummaryMap.get(ad.matched_user_id)!;
        const spendAmount = parseCurrency(ad["Importe gastado (BOB)"]);
        stats.ad_spend += spendAmount;
      }
    });

    // 6. CONVERTIR EL MAPA A UN ARRAY Y CALCULAR ROAS (sin cambios)
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