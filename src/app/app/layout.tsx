// /src/app/app/layout.tsx
import { redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await getServerSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirectTo=/app');          // <-- aquí

  const { data: person, error } = await supabase
    .from('people')
    .select('status, role')
    .eq('user_id', user.id)
    .single();

  let status = person?.status as 'active'|'blocked'|undefined;
  if ((error || !person) && user.email) {
    const { data: byEmail } = await supabase
      .from('people')
      .select('status, role')
      .ilike('email', user.email)
      .single();
    status = (byEmail?.status as any) ?? status;
  }

  if (!status || status !== 'active') {
    await supabase.auth.signOut();
    redirect('/login');                                   // <-- aquí
  }

  return <div className="min-h-dvh">{children}</div>;
}