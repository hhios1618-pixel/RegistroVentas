// app/endpoints/usd-rate/route.ts

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // Asegura que la ruta no sea cacheada estáticamente

export async function GET() {
  try {
    // URL de la API P2P de Binance para comprar USDT con BOB
    const BINANCE_P2P_URL = 'https://p2p.binance.com/bendpoints/c2c/v2/friendly/c2c/adv/search';

    const response = await fetch(BINANCE_P2P_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // Buscamos anuncios de compra de USDT pagando con BOB
      body: JSON.stringify({
        fiat: 'BOB',
        page: 1,
        rows: 10,
        tradeType: 'BUY', // Queremos ver precios de gente que VENDE USDT (nosotros COMPRAMOS)
        asset: 'USDT',
        countries: [],
        proMerchantAds: false,
        shieldMerchantAds: false,
        publisherType: null,
        payTypes: [],
        classifies: ['mass', 'profession'],
      }),
      // Next.js extiende fetch para permitir opciones de cacheo
      next: {
        revalidate: 60, // Revalidar y cachear el resultado por 60 segundos
      },
    });

    if (!response.ok) {
      throw new Error(`Error al contactar la API de Binance: ${response.statusText}`);
    }

    const data = await response.json();

    // Verificamos que la respuesta sea exitosa y contenga datos
    if (data.code !== '000000' || !data.data || data.data.length === 0) {
      throw new Error('No se encontraron anuncios P2P en Binance para BOB.');
    }

    // El primer anuncio suele tener el mejor precio
    const bestPrice = data.data[0].adv.price;
    const priceAsNumber = parseFloat(bestPrice);

    return NextResponse.json({
      price: priceAsNumber,
      lastUpdated: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error en la API route de tasa USD:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}