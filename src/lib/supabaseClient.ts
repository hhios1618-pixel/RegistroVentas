// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

// Requeridos en .env.local
const URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SRV  = process.env.SUPABASE_SERVICE_ROLE!; // sólo server

// 1) CLIENTE DE NAVEGADOR (para componentes `use client`)
//    Singleton. ¡NO lo llames como función!
const supabase = createClient(URL, ANON, {
  auth: { persistSession: true },
});
export default supabase;

// 2) CLIENTE DE SERVIDOR (para API routes / server actions)
export function supabaseService() {
  return createClient(URL, SRV, { auth: { persistSession: false } });
}