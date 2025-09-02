// /src/app/api/promoters/summary/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function asISODate(input?: string): string {
  // Acepta "DD/MM/YYYY" o "YYYY-MM-DD"
  if (!input) return '';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(input)) {
    const [dd, mm, yyyy] = input.split('/');
    return `${yyyy}-${mm}-${dd}`;
  }
  // ya viene en ISO
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

    const range = (!rawFrom || !rawTo) ? last30() : {
      from: asISODate(rawFrom),
      to: asISODate(rawTo),
    };

    // Nota: la vista tiene columnas por origen: cochabamba, lapaz, elalto, santacruz, sucre, encomienda, tienda
    const { data, error } = await supabase
      .from('promoter_sales_daily_summary')
      .select('sale_date,promoter_name,items,total_bs,cochabamba,lapaz,elalto,santacruz,sucre,encomienda,tienda')
      .gte('sale_date', range.from)
      .lte('sale_date', range.to)
      .order('sale_date', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      range,
      rows: data ?? [],
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'unknown' }, { status: 500 });
  }
}