import supabase from './supabaseClient';

export type Person = {
  full_name: string;
  role: 'ASESOR' | 'PROMOTOR';
  local: string | null;
};

export async function listPeople() {
  const { data, error } = await supabase
    .from('people')
    .select('full_name, role, local')
    .eq('active', true)
    .order('full_name');

  if (error) throw error;
  return (data ?? []) as Person[];
}