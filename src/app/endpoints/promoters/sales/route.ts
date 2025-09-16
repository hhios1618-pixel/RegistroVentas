// /src/app/endpoints/promoters/sales/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY as string

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE en .env')
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: { persistSession: false },
})

type OriginKey = 'cochabamba' | 'lapaz' | 'elalto' | 'santacruz' | 'sucre' | 'encomienda' | 'tienda'
type WarehouseKey = Exclude<OriginKey, 'encomienda'>

type Line = {
  origin: OriginKey
  warehouseOrigin?: WarehouseKey | null
  district?: string | null
  productId?: string | null
  productName: string
  quantity: number
  unitPrice: number
  customerName?: string
  customerPhone?: string
  notes?: string
}

type Payload = {
  promoterName: string
  saleDate: string   // YYYY-MM-DD o DD/MM/YYYY (se normaliza abajo)
  lines: Line[]
}

/* =========================
   Helpers de normalización
   ========================= */
function asISODate(input: string): string {
  const s = (input || '').trim()
  if (!s) return ''
  // DD/MM/YYYY -> YYYY-MM-DD
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [dd, mm, yyyy] = s.split('/')
    return `${yyyy}-${mm}-${dd}`
  }
  // YYYY-MM-DD..., cortamos a 10
  return s.slice(0, 10)
}

function last30(): { from: string; to: string } {
  const toD = new Date()
  const fromD = new Date()
  fromD.setDate(toD.getDate() - 30)
  return {
    from: fromD.toISOString().slice(0, 10),
    to: toD.toISOString().slice(0, 10),
  }
}

/* =========================
   POST: inserta ventas
   ========================= */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Payload

    if (!body?.promoterName?.trim()) {
      return NextResponse.json({ error: 'promoterName requerido' }, { status: 400 })
    }
    const saleDateISO = asISODate(body.saleDate)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(saleDateISO)) {
      return NextResponse.json({ error: 'saleDate inválido (use YYYY-MM-DD o DD/MM/YYYY)' }, { status: 400 })
    }
    if (!Array.isArray(body.lines) || body.lines.length === 0) {
      return NextResponse.json({ error: 'lines vacío' }, { status: 400 })
    }

    const allowedOrigins = new Set<OriginKey>(['cochabamba','lapaz','elalto','santacruz','sucre','encomienda','tienda'])
    const allowedWarehouses = new Set<WarehouseKey>(['cochabamba','lapaz','elalto','santacruz','sucre','tienda'])

    const rows = body.lines.map((l, i) => {
      if (!allowedOrigins.has(l.origin)) throw new Error(`origin inválido en línea ${i+1}`)
      if (!l.productName?.trim()) throw new Error(`productName requerido en línea ${i+1}`)
      if (!Number.isFinite(l.quantity) || l.quantity <= 0) throw new Error(`quantity inválido en línea ${i+1}`)
      if (!Number.isFinite(l.unitPrice) || l.unitPrice < 0) throw new Error(`unitPrice inválido en línea ${i+1}`)
      if (l.customerPhone && !/^\+?\d{8,15}$/.test(l.customerPhone)) {
        throw new Error(`customerPhone inválido en línea ${i+1}`)
      }

      if (l.origin === 'encomienda') {
        if (!l.warehouseOrigin || !allowedWarehouses.has(l.warehouseOrigin)) {
          throw new Error(`warehouseOrigin requerido/ inválido en línea ${i+1} para encomienda`)
        }
      } else {
        // Si quieres compatibilidad retro, NO fuerces district:
        // (puedes comentar el siguiente bloque si te llegan históricos con null)
        if (!l.district || !l.district.trim()) {
          throw new Error(`district requerido en línea ${i+1} (cuando origin != encomienda)`)
        }
      }

      return {
        promoter_name: body.promoterName.trim(),
        sale_date: saleDateISO,
        origin: l.origin,
        warehouse_origin: l.origin === 'encomienda' ? (l.warehouseOrigin as string) : null,
        district: l.origin !== 'encomienda' ? (l.district?.trim() || null) : null,
        product_id: l.productId ?? null,
        product_name: l.productName.trim(),
        quantity: l.quantity,
        unit_price: l.unitPrice,
        customer_name: l.customerName?.trim() || null,
        customer_phone: l.customerPhone?.trim() || null,
        notes: l.notes?.trim() || null,
      }
    })

    const { error } = await supabase.from('promoter_sales').insert(rows)
    if (error) {
      console.error('[promoters/sales] supabase error', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, inserted: rows.length }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'error' }, { status: 400 })
  }
}

/* =========================
   GET: detalle + totales
   ========================= */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const rawFrom = (searchParams.get('from') || '').trim()
    const rawTo   = (searchParams.get('to')   || '').trim()
    const q       = (searchParams.get('q')    || '').trim()

    const range = (!rawFrom || !rawTo)
      ? last30()
      : { from: asISODate(rawFrom), to: asISODate(rawTo) }

    let query = supabase
      .from('promoter_sales')
      .select('*')
      .gte('sale_date', range.from)
      .lte('sale_date', range.to)
      .order('sale_date', { ascending: true })

    if (q) {
      query = query.or(
        [
          `promoter_name.ilike.%${q}%`,
          `origin.ilike.%${q}%`,
          `district.ilike.%${q}%`,
          `product_name.ilike.%${q}%`,
          `customer_name.ilike.%${q}%`,
          `customer_phone.ilike.%${q}%`,
          `warehouse_origin.ilike.%${q}%`,
        ].join(',')
      )
    }

    const { data, error } = await query
    if (error) {
      console.error('[promoters/sales GET] supabase error', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const rows = Array.isArray(data) ? data : []

    // Totales por promotor para tarjetas / resumen lateral
    const totalsByPromoter: Record<string, { items: number; bs: number }> = {}
    for (const r of rows) {
      const key = r.promoter_name || '—'
      if (!totalsByPromoter[key]) totalsByPromoter[key] = { items: 0, bs: 0 }
      totalsByPromoter[key].items += Number(r.quantity || 0)
      totalsByPromoter[key].bs    += Number(r.quantity || 0) * Number(r.unit_price || 0)
    }

    const summary = Object.entries(totalsByPromoter).map(([promoter, v]) => ({
      promoter,
      items: v.items,
      total_bs: v.bs,
    }))

    return NextResponse.json({
      rows,
      summary,
      totalRows: rows.length,
      totalItems: summary.reduce((s, x) => s + x.items, 0),
      totalBs:    summary.reduce((s, x) => s + x.total_bs, 0),
      range,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'error' }, { status: 400 })
  }
}