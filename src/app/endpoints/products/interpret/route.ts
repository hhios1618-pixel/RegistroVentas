import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ProductItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  type: 'BASE' | 'PROMO';
  product_code?: string;
}

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    
    if (!text?.trim()) {
      return NextResponse.json({ error: 'Texto requerido' }, { status: 400 });
    }

    const prompt = `Eres un asistente que interpreta pedidos de productos escritos por vendedoras en Bolivia. Analiza el texto y devuelve todos los productos individuales mencionados.

TEXTO: "${text}"

Debes responder ÚNICAMENTE con un JSON válido con el formato exacto:
{
  "items": [
    {
      "product_name": "nombre del producto",
      "quantity": numero_entero,
      "unit_price": precio_unitario_en_bs,
      "type": "BASE" | "PROMO"
    }
  ]
}

REGLAS IMPORTANTES:
- Identifica cada producto individual, aunque aparezcan dentro de un combo o promoción.
- Si la vendedora indica un combo (por ejemplo, usa la palabra "combo", "pack" o similar) y lista varios productos, agrega un item por cada producto componente. El campo "type" debe ser "PROMO" para esos items.
- Cuando el texto indica un precio total para el combo (ejemplo: "Cobrar 140 bs"), divide ese monto entre los productos del combo de la forma más equitativa posible, redondeando a dos decimales y ajustando el último producto para que la suma coincida con el total. Si no existe precio conocido para el combo, deja el precio en 0.
- Si se especifica cantidad para un producto, úsala. Si no se especifica, usa 1.
- Usa los emojis como pistas del producto (🍎 = manzana, 🥛 = leche, etc.).
- Nunca inventes productos que no estén mencionados.
- No agregues texto adicional, solo el JSON final.

EJEMPLO:
Texto: "\ncombo\nCojín de silicona\nEspaldar\nCobrar 140 bs\n"
Respuesta esperada:
{
  "items": [
    { "product_name": "Cojín de silicona", "quantity": 1, "unit_price": 70, "type": "PROMO" },
    { "product_name": "Espaldar", "quantity": 1, "unit_price": 70, "type": "PROMO" }
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Eres un experto en interpretar pedidos de productos. Responde únicamente con JSON válido.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 1000,
    });

    const responseText = completion.choices[0]?.message?.content?.trim();
    
    if (!responseText) {
      throw new Error('No se recibió respuesta de OpenAI');
    }

    // Intentar parsear el JSON
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseText);
    } catch (parseError) {
      // Si falla el parsing, intentar extraer JSON del texto
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Respuesta no es JSON válido');
      }
    }

    // Validar estructura
    if (!parsedResponse.items || !Array.isArray(parsedResponse.items)) {
      throw new Error('Estructura de respuesta inválida');
    }

    // Validar y limpiar items
    const validItems: ProductItem[] = parsedResponse.items
      .filter((item: any) => item?.product_name && (item?.quantity ?? null) !== null && item?.quantity !== undefined)
      .map((item: any) => ({
        product_name: String(item.product_name).trim(),
        quantity: Math.max(1, parseInt(item.quantity, 10) || 1),
        unit_price: Math.max(0, Number.parseFloat(item.unit_price) || 0),
        type: item.type === 'PROMO' ? 'PROMO' : 'BASE',
        product_code: item.product_code || null
      }));

    if (validItems.length === 0) {
      return NextResponse.json({ 
        error: 'No se pudieron extraer productos válidos del texto' 
      }, { status: 400 });
    }

    return NextResponse.json({ items: validItems });

  } catch (error: any) {
    console.error('Error en interpretación de productos:', error);

    const statusCode = error?.status ?? error?.response?.status;
    const errorCode = error?.code ?? error?.error?.code;

    if (statusCode === 429 || errorCode === 'insufficient_quota') {
      return NextResponse.json(
        { error: 'Se alcanzó el límite de uso de OpenAI. Intenta nuevamente más tarde o revisa el plan de facturación.' },
        { status: 429 }
      );
    }

    if (error?.message?.includes('API key')) {
      return NextResponse.json(
        { error: 'Error de configuración de OpenAI' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: error?.message || 'Error al interpretar productos' },
      { status: 500 }
    );
  }
}
