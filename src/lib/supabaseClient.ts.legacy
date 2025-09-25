import { createClient } from '@supabase/supabase-js';

const URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SRV  = process.env.SUPABASE_SERVICE_ROLE_KEY!; // server-only

// Cliente para el navegador (componentes "use client")
export const supabase = createClient(URL, ANON, { auth: { persistSession: true } });
export default supabase;

// Cliente para server (route handlers / server actions)
export function supabaseService() {
  return createClient(URL, SRV, { auth: { persistSession: false } });
}