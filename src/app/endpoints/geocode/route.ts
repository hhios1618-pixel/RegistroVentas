// En: src/app/endpoints/geocode/route.ts

import { NextResponse } from 'next/server';

// Cambiamos de GET a POST para que coincida con lo que enviará el botón
export async function POST(request: Request) {
  try {
    // Leemos el 'query' del cuerpo de la petición, no de la URL
    const { query } = await request.json();
    
    // Usamos la clave de API de OpenCage que tienes en tus variables de entorno
    const apiKey = process.env.NEXT_PUBLIC_OPENCAGE_API_KEY;

    if (!apiKey) {
      console.error('La clave de API para OpenCage no está configurada en el servidor.');
      return NextResponse.json(
        { error: 'API key for geocoding is not configured.' },
        { status: 500 }
      );
    }

    if (!query) {
      return NextResponse.json(
        { error: 'Geocoding query is missing.' },
        { status: 400 }
      );
    }

    // Construimos la URL para OpenCage
    const apiUrl = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(
      query
    )}&key=${apiKey}&language=es&countrycode=bo&limit=1`;

    // Hacemos la llamada a OpenCage desde el servidor (¡esto evita el error de CORS!)
    const geocodeResponse = await fetch(apiUrl);

    if (!geocodeResponse.ok) {
      const errorText = await geocodeResponse.text();
      console.error('OpenCage API Error Response:', errorText);
      return NextResponse.json(
        { error: `Error from geocoding service: ${geocodeResponse.statusText}` },
        { status: geocodeResponse.status }
      );
    }

    // Devolvemos la respuesta completa de OpenCage al frontend
    const data = await geocodeResponse.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error interno en la ruta /endpoints/geocode:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { error: 'An internal server error occurred.', details: errorMessage },
      { status: 500 }
    );
  }
}