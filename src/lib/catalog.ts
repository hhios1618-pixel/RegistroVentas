import { supabaseClient as supabase } from '@/lib/supabase';

/** Búsqueda por código o nombre (autocompletar) */
export async function searchProducts(q: string, limit = 10) {
  const like = `%${q}%`;
  const { data, error } = await supabase
    .from('products')
    .select('code,name,retail_price,wholesale_price,stock,category')
    .or(`code.ilike.${like},name.ilike.${like}`)
    .eq('active', true)
    .order('name')
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

/** Recupera por código exacto (cuando el usuario escoge uno) */
export async function getProduct(code: string) {
  const { data, error } = await supabase
    .from('products')
    .select('code,name,retail_price,wholesale_price,stock')
    .eq('code', code)
    .maybeSingle();
  if (error) throw error;
  return data;
}