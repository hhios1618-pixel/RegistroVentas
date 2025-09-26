// /src/app/endpoints/promoters/summary/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withSupabaseRetry, isSupabaseTransientError } from '@/lib/supabase';
import type { PostgrestResponse } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/* ========= Tipos ========= */
type SummaryRow = {
  sale_date: string;          // ISO YYYY-MM-DD
  promoter_name: string | null;
  items: number | null;
  total_bs: number | null;
  cochabamba: number | null;
  lapaz: number | null;
  elalto: number | null;
  santacruz: number | null;
  sucre: number | null;
  encomienda: number | null;
  tienda: number | null;
};

function asISODate(input?: string): string {
  // Acepta "DD/MM/YYYY" o "YYYY-MM-DD"
  if (!input) return '';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(input)) {
    const [dd, mm, yyyy] = input.split('/');
    return `${yyyy}-${mm}-${dd}`;
  }
  return input.slice(0, 10);
}

function last30(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 30);
  const f = from.toISOString().slice(0, 10);
  const t = to.toISOString().slice(0, 10);
  return { from: f, to: t };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const rawFrom = url.searchParams.get('from') || '';
    const rawTo = url.searchParams.get('to') || '';

    const range = (!rawFrom || !rawTo)
      ? last30()
      : { from: asISODate(rawFrom), to: asISODate(rawTo) };

    // Devolver PROMESA tipada desde el callback (no builder)
    const resp: PostgrestResponse<SummaryRow> = await withSupabaseRetry(
      async (): Promise<PostgrestResponse<SummaryRow>> => {
        const r = await supabase
          .from('promoter_sales_daily_summary')
          .select(
            // bypass del parser de columnas por seguridad en vistas
            'sale_date,promoter_name,items,total_bs,cochabamba,lapaz,elalto,santacruz,sucre,encomienda,tienda' as any
          )
          .gte('sale_date', range.from)
          .lte('sale_date', range.to)
          .order('sale_date', { ascending: true });

        return r as PostgrestResponse<SummaryRow>;
      }
    );

    const { data, error } = resp;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      range,
      rows: (data ?? []) as SummaryRow[],
    }, { status: 200, headers: { 'Cache-Control': 'no-store' } });

  } catch (e: any) {
    if (isSupabaseTransientError(e)) {
      console.error('[promoters/summary] Supabase temporalmente no disponible:', e.message);
      return NextResponse.json({ error: 'supabase_unavailable' }, { status: 503 });
    }
    console.error('[promoters/summary] server_error:', e);
    return NextResponse.json({ error: e?.message ?? 'unknown' }, { status: 500 });
  }
}
