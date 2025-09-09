// Contenido temporal para la prueba "Hola Mundo"
import { NextResponse } from 'next/server';

export async function GET() {
  // Este mensaje debería aparecer en la consola donde corres 'npm run dev'
  console.log("!!! DIAGNÓSTICO: La ruta /api/admin/set-initial-passwords FUE ALCANZADA !!!");

  // Esto es lo que deberías ver en el navegador
  return NextResponse.json({ 
    status: 'OK', 
    message: 'La ruta de Next.js funciona correctamente.' 
  });
}