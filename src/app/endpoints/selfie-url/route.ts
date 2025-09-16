import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Ajusta si tu bucket tiene otro nombre; en tu consola se ve "attendance-selfies"
const BUCKET = process.env.ATTENDANCE_BUCKET ?? 'attendance-selfies';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const attendanceId = searchParams.get('attendance_id');
    if (!attendanceId) {
      return NextResponse.json({ error: 'attendance_id requerido' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL!,                 // SERVER env
      process.env.SUPABASE_SERVICE_ROLE_KEY!     // SERVICE ROLE (solo server)
    );

    // 1) Tomar selfie_path desde attendance
    const { data: rec, error: qErr } = await supabase
      .from('attendance')
      .select('selfie_path')
      .eq('id', attendanceId)
      .single();

    if (qErr) throw qErr;

    if (!rec?.selfie_path) {
      return NextResponse.json({ error: 'Sin selfie_path para este registro' }, { status: 404 });
    }

    // 2) Firmar URL por 120s
    const { data: signed, error: sErr } = await supabase
      .storage.from(BUCKET)
      .createSignedUrl(rec.selfie_path, 120);

    if (sErr) throw sErr;

    return NextResponse.json({ url: signed.signedUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'server_error' }, { status: 500 });
  }
}