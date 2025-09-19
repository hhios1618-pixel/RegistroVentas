import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// --- Tipos ---
type PersonData = { id: string; full_name: string | null; role: string | null; local: string | null; };
type OrderData = { id: string; created_at: string | null; branch_id: string | null; seller: string | null; sales_user_id: string | null; is_promoter: boolean | null; seller_role: string | null; [key: string]: any; };
type OrderItemData = { order_id: string; product_name: string; quantity: number; subtotal: number; [key: string]: any; };

// --- Función de Normalización ---
function normalizeName(name: string): string {
  if (!name) return '';
  return name.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// --- Helper de Supabase ---
function sbAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

// --- Función de Mapeo de Personal ---
async function getPeopleMaps(sb: ReturnType<typeof sbAdmin>) {
  const { data, error } = await sb.from('people').select('id, full_name, role, local');
  if (error) {
    console.error("Error fetching people:", error);
    return { peopleById: new Map(), peopleByName: new Map() };
  }
  
  const peopleById = new Map<string, PersonData>();
  const peopleByName = new Map<string, PersonData>();

  (data as PersonData[]).forEach(person => {
    peopleById.set(person.id, person);
    if (person.full_name) {
      peopleByName.set(normalizeName(person.full_name), person);
    }
  });
  return { peopleById, peopleByName };
}

// --- API ENDPOINT MAESTRO ---
export async function GET(request: NextRequest) {
  const sb = sbAdmin();
  const { searchParams } = request.nextUrl;
  const channelFilter = searchParams.get('channel');

  try {
    const { peopleById, peopleByName } = await getPeopleMaps(sb);

    const { data: items, error: itemsError } = await sb.from('order_items').select('*');
    if (itemsError) throw itemsError;

    const orderIds = [...new Set(items.map(item => item.order_id))];
    const { data: orders, error: ordersError } = await sb.from('orders').select('*').in('id', orderIds);
    if (ordersError) throw ordersError;

    const ordersMap = new Map<string, OrderData>();
    (orders as OrderData[]).forEach(order => ordersMap.set(order.id, order));

    let rows = (items as OrderItemData[]).map(item => {
      const order = ordersMap.get(item.order_id);
      if (!order) return null;

      let sellerProfile: PersonData | null = null;
      
      // Lógica de búsqueda priorizada
      if (order.sales_user_id && peopleById.has(order.sales_user_id)) {
        sellerProfile = peopleById.get(order.sales_user_id) || null;
      } 
      else if (order.seller) {
        const sellerNameToSearch = normalizeName(order.seller);
        if (peopleByName.has(sellerNameToSearch)) {
          sellerProfile = peopleByName.get(sellerNameToSearch) || null;
        }
      }

      let channel = 'Tienda/Caja';
      const effectiveRole = sellerProfile?.role || order.seller_role;
      if (order.is_promoter === true) {
        channel = 'Promotor';
      } else if (effectiveRole?.toUpperCase().includes('ASESOR')) {
        channel = 'Asesor';
      }

      const finalSellerName = sellerProfile?.full_name || order.seller;
      const finalSellerRole = effectiveRole || 'Desconocido';
      const branch = sellerProfile?.local || order.branch_id || 'Sin Sucursal';

      return {
        product_name: item.product_name,
        quantity: Number(item.quantity ?? 0),
        subtotal: Number(item.subtotal ?? 0),
        product_image_url: item.image_url ?? null,
        order_id: item.order_id,
        order_no: order.order_no ?? null,
        order_date: order.created_at ?? null,
        branch: branch,
        seller_full_name: finalSellerName,
        seller_role: finalSellerRole,
        channel: channel,
      };
    }).filter((row): row is NonNullable<typeof row> => row !== null);

    if (channelFilter) {
      rows = rows.filter(row => row.channel === channelFilter);
    }
    
    (rows as any[]).sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime());
    return NextResponse.json(rows, { status: 200 });

  } catch (e: any) {
    console.error(`Error en API de sales-report: ${e.message}`);
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}