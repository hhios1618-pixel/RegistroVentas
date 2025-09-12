import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ProductReturnRow = {
  id: number;
  created_at: string;
  original_order_no: number;
  original_seller_name: string | null;
  original_customer_name: string | null;
  return_date: string;
  return_branch: string | null;
  return_amount: number;
  reason: string;
  return_method: string | null;
  return_proof_url: string | null;
};

function sbAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET() {
  const sb = sbAdmin();

  try {
    const { data: returnItems, error: itemsError } = await sb
      .from('return_items')
      .select('return_id, product_name, quantity');

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }
    if (!returnItems || returnItems.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    const returnIds = Array.from(new Set(returnItems.map(i => i.return_id)));

    const { data: productReturns, error: returnsError } = await sb
      .from('product_returns')
      .select('*')
      .in('id', returnIds);

    if (returnsError) {
      return NextResponse.json({ error: returnsError.message }, { status: 500 });
    }

    const returnsById = new Map<number, ProductReturnRow>();
    productReturns.forEach(r => returnsById.set(r.id, r));

    const responseData = returnItems.map(item => {
      const parentReturn = returnsById.get(item.return_id);
      if (!parentReturn) return null;

      return {
        return_id: parentReturn.id,
        order_no: parentReturn.original_order_no,
        return_date: parentReturn.return_date,
        branch: parentReturn.return_branch || 'No especificada',
        seller_name: parentReturn.original_seller_name || 'N/A',
        customer_name: parentReturn.original_customer_name || 'N/A',
        product_name: item.product_name,
        quantity: Number(item.quantity || 0),
        return_amount: Number(parentReturn.return_amount || 0),
        reason: parentReturn.reason || 'Sin motivo',
        return_method: parentReturn.return_method || 'N/A',
        return_proof_url: parentReturn.return_proof_url || null,
      };
    }).filter(Boolean);

    (responseData as any[]).sort((a, b) => new Date(b.return_date).getTime() - new Date(a.return_date).getTime());

    return NextResponse.json(responseData, { status: 200 });

  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}