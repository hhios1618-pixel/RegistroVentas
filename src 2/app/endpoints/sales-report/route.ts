import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// --- TIPOS ---
type SB = SupabaseClient<any, "public", any>;
type OrderItemRow = { order_id: string; product_name: string; quantity: number; subtotal: number; image_url?: string | null; };
type OrderRow = { id: string; order_no?: number | null; created_at?: string | null; seller?: string | null; seller_role?: string | null; sales_user_id?: string | null; sales_role?: string | null; delivery_date?: string | null; payment_proof_url?: string | null; sale_type?: string | null; is_encomienda?: boolean | null; [k: string]: any; };
type ProfileRow = { id: string; full_name: string | null; role: string | null; telegram_username: string | null; };

// --- HELPERS (Funciones de Ayuda) ---
function sbAdmin(): SB {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

function clean(r?: string | null): string | null {
  const s = (r ?? '').trim();
  return s || null;
}

function isOpRole(r?: string | null): boolean {
  const s = (r ?? '').trim().toLowerCase();
  return s === 'delivery' || s === 'repartidor';
}

function detectBranchKey(sample: Record<string, any> | undefined | null): string | null {
  if (!sample) return null;
  const c = ['branch', 'sucursal', 'store', 'store_name', 'location', 'local'];
  return c.find(k => Object.prototype.hasOwnProperty.call(sample, k)) ?? null;
}

// --- CAMBIO: Función mejorada para obtener todos los perfiles ---
async function getAllUserProfiles(sb: SB): Promise<Map<string, ProfileRow>> {
  const profiles = new Map<string, ProfileRow>();
  
  const [
    { data: peopleData, error: peopleError },
    { data: usersProfileData, error: usersProfileError }
  ] = await Promise.all([
      sb.from('people').select('id, full_name, role, telegram_username'),
      sb.from('users_profile').select('id, full_name, role, telegram_username')
  ]);

  if (peopleError) console.error("Error fetching from people:", peopleError);
  if (usersProfileError) console.error("Error fetching from users_profile:", usersProfileError);

  (peopleData as ProfileRow[] | null)?.forEach(p => p.id && profiles.set(p.id, p));
  (usersProfileData as ProfileRow[] | null)?.forEach(p => p.id && profiles.set(p.id, p)); // users_profile tiene prioridad si hay IDs duplicados

  return profiles;
}


// --- API ENDPOINT ---
export async function GET() {
  const sb = sbAdmin();

  try {
    const allProfiles = await getAllUserProfiles(sb);
    const profilesByTelegram = new Map<string, ProfileRow>();
    const profilesByName = new Map<string, ProfileRow>();

    for (const profile of allProfiles.values()) {
        if (profile.telegram_username) profilesByTelegram.set(profile.telegram_username.trim(), profile);
        if (profile.full_name) profilesByName.set(profile.full_name.trim(), profile);
    }

    const itRes = await sb.from('order_items').select('order_id, product_name, quantity, subtotal, image_url');
    if (itRes.error) throw new Error(itRes.error.message);
    const items = (itRes.data as OrderItemRow[]) ?? [];
    if (!items.length) return NextResponse.json([], { status: 200 });

    const ids = Array.from(new Set(items.map(i => i.order_id)));
    const oRes = await sb.from('orders').select('*').in('id', ids);
    if (oRes.error) throw new Error(oRes.error.message);
    const orders = (oRes.data as OrderRow[]) ?? [];
    const byId = new Map<string, OrderRow>();
    orders.forEach(o => byId.set(o.id, o));

    const branchKey = detectBranchKey(orders[0]);

    const rows = items.map(it => {
      const o = byId.get(it.order_id) || ({} as OrderRow);
      
      let sellerProfile: ProfileRow | undefined | null = null;
      const sellerText = clean(o.seller);

      if (o.sales_user_id && allProfiles.has(o.sales_user_id)) {
          sellerProfile = allProfiles.get(o.sales_user__id);
      } else if (sellerText && profilesByTelegram.has(sellerText)) {
          sellerProfile = profilesByTelegram.get(sellerText);
      } else if (sellerText && profilesByName.has(sellerText)) {
          sellerProfile = profilesByName.get(sellerText);
      }
      
      if (sellerProfile && isOpRole(sellerProfile.role)) {
          return null;
      }
      
      const finalSellerName = sellerProfile?.full_name || sellerText;
      const finalSellerRole = sellerProfile?.role || 'Desconocido';
      
      return {
        order_id: it.order_id,
        order_no: o.order_no ?? null,
        order_date: o.created_at ?? null,
        branch: branchKey && o[branchKey] ? o[branchKey] : null,
        seller_full_name: finalSellerName,
        seller_role: finalSellerRole,
        product_name: it.product_name,
        quantity: Number(it.quantity ?? 0),
        subtotal: Number(it.subtotal ?? 0),
        delivery_date: o.delivery_date ?? null,
        product_image_url: it.image_url ?? null,
        payment_proof_url: o.payment_proof_url ?? null,
        sale_type: o.sale_type ?? null,
        order_type: o.is_encomienda === true ? 'Encomienda' : 'Pedido',
      };
    }).filter(Boolean);

    (rows as any[]).sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime());

    return NextResponse.json(rows, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}