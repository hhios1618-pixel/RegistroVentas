import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabaseClient";

// GET /endpoints/attendance?start=YYYY-MM-DD&end=YYYY-MM-DD&site_id=...&q=texto
// Devuelve marcas con persona, sucursal y métricas basicas
export async function GET(req: Request) {
  const supabase = supabaseService();
  const { searchParams } = new URL(req.url);

  const start = searchParams.get("start"); // inclusive
  const end   = searchParams.get("end");   // inclusive
  const site  = searchParams.get("site_id");
  const q     = searchParams.get("q");     // texto en full_name

  let query = supabase
    .from("attendance")
    .select(`
      id,
      created_at,
      type,
      lat,
      lng,
      accuracy_m,
      device_id,
      selfie_path,
      person:people(id, full_name, role, local),
      site:sites(id, name)
    `)
    .order("created_at", { ascending: false });

  if (start) query = query.gte("created_at", `${start}T00:00:00.000Z`);
  if (end)   query = query.lte("created_at", `${end}T23:59:59.999Z`);
  if (site)  query = query.eq("site_id", site);

  // Filtro por nombre (case-insensitive) usando ilike en people.full_name
  // Hacemos filtro en app si supabase no permite ilike sobre relación
  const { data, error } = await query;

  if (error) {
    console.error("[endpoints/attendance] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []).filter((r: any) => {
    if (!q) return true;
    const name = (r.person?.full_name || "").toLowerCase();
    return name.includes(q.toLowerCase());
  });

  return NextResponse.json({ data: rows });
}