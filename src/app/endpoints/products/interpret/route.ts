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

    const prompt = `Eres un asistente que interpreta pedidos de productos. Analiza el siguiente texto y extrae los productos mencionados.

TEXTO: "${text}"

Responde ÚNICAMENTE con un JSON válido en este formato exacto:
{
  "items": [
    {
      "product_name": "nombre del producto",
      "quantity": número,
      "unit_price": precio_estimado,
      "type": "BASE"
    }
  ]
}

REGLAS:
- Extrae todos los productos mencionados
- Si no se especifica cantidad, usa 1
- Estima precios razonables en bolivianos para productos comunes
- Usa "type": "BASE" para todos los productos
- NO agregues texto adicional, solo el JSON
- Si hay emojis, úsalos para identificar productos (🍎 = manzana, 🥛 = leche, etc.)`;

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
      .filter((item: any) => item.product_name && item.quantity && item.unit_price)
      .map((item: any) => ({
        product_name: String(item.product_name).trim(),
        quantity: Math.max(1, parseInt(item.quantity) || 1),
        unit_price: Math.max(0, parseFloat(item.unit_price) || 0),
        type: 'BASE' as const,
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
    
    if (error.message?.includes('API key')) {
      return NextResponse.json({ 
        error: 'Error de configuración de OpenAI' 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      error: error.message || 'Error al interpretar productos' 
    }, { status: 500 });
  }
}

