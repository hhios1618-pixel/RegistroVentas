import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  console.log("--- EJECUTANDO EL ENDPOINT DE DEPURACIÓN DE ENTORNO ---");

  const jwtSecret = process.env.JWT_SECRET;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const functionsUrl = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL;

  const report = {
    message: "Reporte de Variables de Entorno Críticas en Vercel",
    timestamp: new Date().toISOString(),
    
    JWT_SECRET: {
      exists: !!jwtSecret,
      length: jwtSecret?.length ?? 0,
    },
    SUPABASE_SERVICE_ROLE_KEY: {
      exists: !!serviceKey,
      length: serviceKey?.length ?? 0,
      // Muestra solo los primeros y últimos caracteres para confirmar que no es una clave errónea
      preview: `${serviceKey?.substring(0, 4) ?? ''}...${serviceKey?.substring(serviceKey.length - 4) ?? ''}`
    },
    NEXT_PUBLIC_SUPABASE_URL: {
      exists: !!supabaseUrl,
      value: supabaseUrl ?? "No encontrado",
    },
    NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL: {
        exists: !!functionsUrl,
        value: functionsUrl ?? "No encontrado",
    },
  };

  console.log(report);

  return NextResponse.json(report);
}