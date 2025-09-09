import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabaseServer';
import { supabaseService } from '@/lib/supabaseClient'; // tu factory con SERVICE_ROLE

export async function POST() {
  try {
    const supa = await getServerSupabase();                 // sesión real (anon + cookies)
    const { data: { user } } = await supa.auth.getUser();
    if (!user || !user.email) {
      return NextResponse.json({ ok: false, reason: 'no-session' }, { status: 401 });
    }

    // Actualiza people.user_id por email si aún no está seteado
    const admin = supabaseService();                        // SERVICE_ROLE (server-only)
    const { data: updated, error } = await admin
      .from('people')
      .update({ user_id: user.id })
      .eq('email', user.email)
      .is('user_id', null)                                  // solo si estaba null
      .select('id')
      .maybeSingle();

    if (error) {
      return NextResponse.json({ ok: false, reason: 'update-failed', error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, linked: !!updated });
  } catch (e:any) {
    return NextResponse.json({ ok: false, reason: 'exception', error: e?.message }, { status: 500 });
  }
}