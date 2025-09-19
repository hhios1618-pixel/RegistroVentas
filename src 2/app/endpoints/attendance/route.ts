import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabaseClient";

const normUpper = (s?: string | null) => (s || "").trim().toUpperCase();

export async function GET(req: Request) {
  try {
    const supabase = supabaseService();
    const { searchParams } = new URL(req.url);

    const start = searchParams.get("start");
    const end   = searchParams.get("end");
    const site  = searchParams.get("site_id");
    const q     = (searchParams.get("q") || "").toLowerCase();

    // roles dinámicos (si se pasan desde el front)
    const includeRoles = searchParams.getAll("include_roles[]").map(normUpper);
    const excludeRoles = searchParams.getAll("exclude_roles[]").map(normUpper);

    // 1) attendance
    let att = supabase
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
        person_id,
        site_id
      `)
      .order("created_at", { ascending: false });

    if (start) att = att.gte("created_at", `${start}T00:00:00.000Z`);
    if (end)   att = att.lte("created_at", `${end}T23:59:59.999Z`);
    if (site)  att = att.eq("site_id", site);

    const { data: rows, error: Aerr } = await att;
    if (Aerr) {
      console.error("[attendance] attendance error:", Aerr);
      return NextResponse.json({ error: Aerr.message }, { status: 500 });
    }
    if (!rows?.length) return NextResponse.json({ data: [] }, { headers: { "Cache-Control": "no-store" } });

    // 2) joins
    const personIds = Array.from(new Set(rows.map(r => r.person_id).filter(Boolean)));
    const siteIds   = Array.from(new Set(rows.map(r => r.site_id).filter(Boolean)));

    let qp = supabase.from("people").select("id, full_name, role, local").in("id", personIds);
    if (includeRoles.length) qp = qp.in("role", includeRoles);
    if (excludeRoles.length) qp = qp.not("role", "in", excludeRoles);

    const [{ data: P, error: Perr }, { data: S, error: Serr }] = await Promise.all([
      qp,
      supabase.from("sites").select("id, name").in("id", siteIds),
    ]);

    if (Perr) {
      console.error("[attendance] people error:", Perr);
      return NextResponse.json({ error: Perr.message }, { status: 500 });
    }
    if (Serr) {
      console.error("[attendance] sites error:", Serr);
      return NextResponse.json({ error: Serr.message }, { status: 500 });
    }

    const pMap = new Map((P ?? []).map(p => [p.id, p]));
    const sMap = new Map((S ?? []).map(s => [s.id, s]));

    // 3) salida + filtros
    const out = (rows ?? [])
      .map(r => ({
        id: r.id,
        created_at: r.created_at,
        type: r.type,
        lat: r.lat,
        lng: r.lng,
        accuracy_m: r.accuracy_m,
        device_id: r.device_id,
        selfie_path: r.selfie_path,
        person_id: r.person_id,
        site_id: r.site_id,
        person: pMap.get(r.person_id) || null,
        site:   sMap.get(r.site_id)   || null,
      }))
      .filter(row => {
        if (q) {
          const name = (row.person?.full_name || "").toLowerCase();
          if (!name.includes(q)) return false;
        }
        // si se pasó include/exclude por query
        const role = normUpper(row.person?.role);
        if (includeRoles.length && !includeRoles.includes(role)) return false;
        if (excludeRoles.length && excludeRoles.includes(role)) return false;
        return true;
      });

    return NextResponse.json({ data: out }, { headers: { "Cache-Control": "no-store" } });
  } catch (e:any) {
    console.error("[attendance] server error:", e);
    return NextResponse.json({ error: "server_error", message: e?.message }, { status: 500 });
  }
}