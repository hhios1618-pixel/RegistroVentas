import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    message: "Hola Mundo! El endpoint de prueba funciona!",
    timestamp: new Date().toISOString(),
  });
}