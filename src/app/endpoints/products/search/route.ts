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

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const q = (searchParams.get('q') || '').trim()
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10) || 10, 50)

    if (q.length < 3) {
      return NextResponse.json({ items: [], hint: 'Escribe al menos 3 letras' }, { status: 200 })
    }

    // --- INICIO DE LA CORRECCIÓN ---
    // 1. Dividimos la consulta en palabras individuales.
    const words = q.split(' ').filter(word => word.length > 2);

    // Si no hay palabras válidas, no buscamos nada.
    if (words.length === 0) {
      return NextResponse.json({ items: [] });
    }

    // 2. Creamos una cadena de condiciones 'OR' para Supabase.
    //    Buscará cualquier palabra en el campo 'name' O en el campo 'code'.
    //    Ejemplo: name.ilike.%escurridor%,code.ilike.%escurridor%,name.ilike.%plomo%,code.ilike.%plomo%
    const orCondition = words
      .flatMap(word => [`name.ilike.%${word}%`, `code.ilike.%${word}%`])
      .join(',');

    // 3. Ejecutamos la consulta con la condición 'OR'.
    const { data, error } = await supabase
      .from('product_prices')
      .select('code,name,category,stock')
      .or(orCondition)
      .order('name', { ascending: true })
      .limit(limit);
    // --- FIN DE LA CORRECCIÓN ---


    if (error) throw error

    const items = (data || []).map((p: any) => ({
      id: String(p.code ?? ''),
      code: p.code ?? null,
      name: p.name ?? '',
      category: p.category ?? null,
      stock: p.stock ?? null,
    }))

    return NextResponse.json({ items })
  } catch (e: any) {
    console.error('[products/search] error', e?.message || e)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}