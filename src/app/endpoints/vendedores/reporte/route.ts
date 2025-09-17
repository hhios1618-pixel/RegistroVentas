// RUTA: src/app/endpoints/vendedores/reporte/route.ts
import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// --- TIPOS ---
type SB = SupabaseClient<any, 'public', any>;
type Order = {
  seller: string | null;        // telegram_username o nombre plano
  sales_user_id: string | null; // id de people
  amount: number;
};
type AdSpend = {
  'Nombre de la campaña': string | null;
  'Importe gastado (BOB)': string | number | null;
  matched_user_id: string | null; // id de people
};
type SellerProfile = {
  id: string;
  full_name: string;
  local: string | null;
  telegram_username: string | null;
  role?: string | null;
};

// --- Supabase admin ---
function sbAdmin(): SB {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

// --- Util: parseo de moneda ---
function parseCurrency(value: string | number | null): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  const withoutThousands = value.replace(/\./g, '');
  const withDotDecimal = withoutThousands.replace(',', '.');
  const num = parseFloat(withDotDecimal);
  return Number.isFinite(num) ? num : 0;
}

// --- Normalización de sucursales ---
const CANON_BRANCH: Record<string, string> = {
  'santa cruz': 'Santa Cruz',
  'la paz': 'La Paz',
  'el alto': 'El Alto',
  'cochabamba': 'Cochabamba',
  'sucre': 'Sucre',
  'oruro': 'Oruro',
  'potosi': 'Potosí',
  'potosí': 'Potosí',
  'tarija': 'Tarija',
  'beni': 'Beni',
  'pando': 'Pando',
  'promotores': 'Promotores',
  'sin sucursal': 'Sin Sucursal',
  'sin asignar': 'Sin Asignar'
};
function normalize(s?: string) {
  return (s || '')
    .normalize('NFD')
    // @ts-ignore unicode
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}
function canonicalBranch(raw?: string | null) {
  const key = normalize(raw || '');
  return CANON_BRANCH[key] || (raw ? raw[0]?.toUpperCase() + raw.slice(1).toLowerCase() : 'Sin Sucursal');
}

// --- HANDLER: fuerza SOLO ASESOR/ASESORA ---
export async function GET() {
  const sb = sbAdmin();

  try {
    // 1) Trae SOLO perfiles cuyo rol contenga "ASESOR" (captura ASESOR, ASESORA, ASESORES, etc.)
    // y EXCLUYE cualquier cosa que parezca "PROMOTOR".
    const { data: sellers, error: sellersError } = await sb
      .from('people')
      .select('id, full_name, local, telegram_username, role')
      .or('role.ilike.%asesor%,role.eq.ASESOR,role.eq.Asesor,role.eq.ASESORA') // inclusión robusta
      .not('role', 'ilike', '%promot%'); // exclusión defensiva

    if (sellersError) throw sellersError;
    const sellersList = (sellers || []) as SellerProfile[];

    // Mapas de lookup
    const sellersById = new Map<string, SellerProfile>();
    const sellersByTelegram = new Map<string, SellerProfile>();
    const sellersByName = new Map<string, SellerProfile>();

    sellersList.forEach((s) => {
      sellersById.set(s.id, s);
      if (s.full_name) sellersByName.set(s.full_name.trim(), s);
      if (s.telegram_username) sellersByTelegram.set(s.telegram_username.trim(), s);
    });

    // 2) Orders + Ads (no filtran por rol aquí; filtramos al sumar usando el mapa creado)
    const [{ data: orders, error: ordersError }, { data: adSpends, error: adSpendsError }] = await Promise.all([
      sb.from('orders').select('seller, sales_user_id, amount'),
      sb.from('meta_ad_spend').select(`"Importe gastado (BOB)", matched_user_id`)
    ]);
    if (ordersError) throw ordersError;
    if (adSpendsError) throw adSpendsError;

    // 3) Mapa resumen SOLO para asesores
    type Summary = {
      full_name: string;
      local: string;
      total_sales: number;
      orders_count: number;
      ad_spend: number;
      seller_role: string | null;
    };
    const summaryBySellerId = new Map<string, Summary>();

    sellersList.forEach((s) => {
      summaryBySellerId.set(s.id, {
        full_name: s.full_name,
        local: canonicalBranch(s.local) || 'Sin Sucursal', // evita "Promotores" como sucursal default
        total_sales: 0,
        orders_count: 0,
        ad_spend: 0,
        seller_role: s.role ?? null
      });
    });

    // 4) Sumar pedidos SOLO si pertenecen a un asesor (es decir, si el id está en nuestro mapa)
    (orders as Order[] | null)?.forEach((o) => {
      let sellerId: string | null = null;
      const sellerText = o.seller?.trim();

      if (o.sales_user_id && sellersById.has(o.sales_user_id)) {
        sellerId = o.sales_user_id;
      } else if (sellerText && sellersByTelegram.has(sellerText)) {
        sellerId = sellersByTelegram.get(sellerText)!.id;
      } else if (sellerText && sellersByName.has(sellerText)) {
        sellerId = sellersByName.get(sellerText)!.id;
      }

      if (sellerId && summaryBySellerId.has(sellerId)) {
        const stats = summaryBySellerId.get(sellerId)!; // <- si no es asesor, no existe en el mapa ⇒ ignorado
        stats.total_sales += o.amount || 0;
        stats.orders_count += 1;
      }
    });

    // 5) Sumar Ads SOLO si el matched_user_id es de un asesor
    (adSpends as AdSpend[] | null)?.forEach((ad) => {
      if (ad.matched_user_id && summaryBySellerId.has(ad.matched_user_id)) {
        const stats = summaryBySellerId.get(ad.matched_user_id)!;
        stats.ad_spend += parseCurrency(ad['Importe gastado (BOB)']);
      }
    });

    // 6) Salida
    const finalSummary = Array.from(summaryBySellerId.values()).map((data) => {
      const roas = data.ad_spend > 0 ? data.total_sales / data.ad_spend : null;
      return {
        seller_name: data.full_name,
        branch: data.local,           // ya canónica
        total_sales: data.total_sales,
        orders_count: data.orders_count,
        ad_spend: data.ad_spend,
        roas,
        seller_role: data.seller_role // informativo
      };
    });

    return NextResponse.json(finalSummary, { status: 200 });
  } catch (e: any) {
    console.error('Error en API de reporte de vendedores (solo asesoras):', e);
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}