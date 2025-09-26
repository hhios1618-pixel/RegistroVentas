// @ts-nocheck
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


type CheckType = "in" | "out" | "lunch_in" | "lunch_out";

type Payload = {
  person_id: string;
  site_id: string;
  type: CheckType;
  device_id?: string;
  qr_code?: string;             // solo para validar (no se inserta)
  // solo in/out:
  lat?: number;
  lng?: number;
  accuracy?: number;
  selfie_base64?: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
} as const;

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("PROJECT_URL") ?? Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "missing_env" }), {
        status: 500,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    let body: Payload;
    try { body = await req.json(); }
    catch {
      return new Response(JSON.stringify({ error: "bad_json" }), {
        status: 400, headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const isShift = body.type === "in" || body.type === "out";

    // Requisitos mínimos
    for (const k of ["person_id","site_id","type"] as const) {
      // deno-lint-ignore no-explicit-any
      if ((body as any)[k] == null) {
        return new Response(JSON.stringify({ error:"missing_field", field:k }), {
          status:400, headers:{ ...corsHeaders, "content-type":"application/json" }
        });
      }
    }
    if (!["in","out","lunch_in","lunch_out"].includes(body.type)) {
      return new Response(JSON.stringify({ error:"type_invalid" }), {
        status:400, headers:{ ...corsHeaders, "content-type":"application/json" }
      });
    }

    // Persona
    const { data: person, error: pErr } = await supabase
      .from("people").select("id, active").eq("id", body.person_id).single();
    if (pErr || !person) return new Response(JSON.stringify({ error:"person_not_found" }), {
      status:404, headers:{ ...corsHeaders, "content-type":"application/json" }
    });
    if (person.active === false) return new Response(JSON.stringify({ error:"person_inactive" }), {
      status:403, headers:{ ...corsHeaders, "content-type":"application/json" }
    });

    // Sitio
    const { data: site, error: sErr } = await supabase
      .from("sites").select("id, lat, lng, radius_m, is_active, name").eq("id", body.site_id).single();
    if (sErr || !site) return new Response(JSON.stringify({ error:"site_not_found" }), {
      status:404, headers:{ ...corsHeaders, "content-type":"application/json" }
    });
    if (site.is_active === false) {
      return new Response(JSON.stringify({ error:"site_inactive" }), {
        status:400, headers:{ ...corsHeaders, "content-type":"application/json" }
      });
    }

    // Validación de QR
    if (!body.qr_code || String(body.qr_code).trim() === "") {
      return new Response(JSON.stringify({ error:"missing_field", field:"qr_code" }), {
        status:400, headers:{ ...corsHeaders, "content-type":"application/json" }
      });
    }
    {
      const nowIso = new Date().toISOString();
      const { data: qr, error: qErr } = await supabase
        .from("qr_tokens").select("site_id, code, exp_at")
        .eq("site_id", body.site_id)
        .eq("code", body.qr_code)
        .gt("exp_at", nowIso)
        .maybeSingle();
      if (qErr || !qr) {
        return new Response(JSON.stringify({ error:"qr_invalid_or_expired" }), {
          status:403, headers:{ ...corsHeaders, "content-type":"application/json" }
        });
      }
    }

    // in/out: GPS y selfie obligatorios
    if (isShift) {
      for (const k of ["lat","lng","accuracy","selfie_base64"] as const) {
        // deno-lint-ignore no-explicit-any
        const v = (body as any)[k];
        if (v == null || (k === "selfie_base64" && String(v).trim() === "")) {
          return new Response(JSON.stringify({ error:"missing_field", field:k }), {
            status:400, headers:{ ...corsHeaders, "content-type":"application/json" }
          });
        }
      }
      if (site.lat != null && site.lng != null) {
        const distance_m = haversineMeters(body.lat!, body.lng!, site.lat, site.lng);
        const radius = site.radius_m ?? 100;
        const accuracy = Number.isFinite(body.accuracy) ? Math.max(0, body.accuracy!) : 0;
        const withinAccuracyMargin = accuracy > 0 && (distance_m - accuracy) <= radius;
        if (distance_m > radius && !withinAccuracyMargin) {
          return new Response(JSON.stringify({
              error:"outside_geofence", distance_m, required_radius: radius, accuracy: body.accuracy
            }), { status:403, headers:{ ...corsHeaders, "content-type":"application/json" } }
          );
        }
      }
    }

    // Subir selfie si llegó
    let selfiePath = "";
    if (body.selfie_base64 && body.selfie_base64.length > 8) {
      const bytes = dataUrlToBytes(body.selfie_base64);
      selfiePath = `${body.site_id}/${body.person_id}/${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage.from("attendance-selfies")
        .upload(selfiePath, bytes, { contentType:"image/jpeg", upsert:false });
      if (upErr) return new Response(JSON.stringify({ error:"upload_failed", details: upErr.message }), {
        status:500, headers:{ ...corsHeaders, "content-type":"application/json" }
      });
    }

    // INSERT
    const isLunch = !isShift;
    const row = {
      person_id: body.person_id,
      site_id: body.site_id,
      type: body.type,
      lat: isLunch ? 0 : body.lat!,          // dummy en almuerzo
      lng: isLunch ? 0 : body.lng!,          // dummy en almuerzo
      selfie_path: isLunch ? "" : selfiePath, // dummy '' en almuerzo (NOT NULL)
      accuracy_m: isLunch ? 0 : body.accuracy!,
      device_id: body.device_id ?? null,
      source: "web" as const,
      created_at: new Date().toISOString(),
    };

    const { error: insErr } = await supabase.from("attendance").insert(row);
    if (insErr) {
      return new Response(JSON.stringify({ error:"insert_failed", details: insErr.message }), {
        status:500, headers:{ ...corsHeaders, "content-type":"application/json" }
      });
    }

    return new Response(JSON.stringify({ ok:true, recorded_at: new Date().toISOString() }), {
      status:200, headers:{ ...corsHeaders, "content-type":"application/json" }
    });

  } catch (e) {
    console.error("[edge checkin] error:", e);
    return new Response(JSON.stringify({ error:"internal_error", details: String(e) }), {
      status:500, headers:{ ...corsHeaders, "content-type":"application/json" }
    });
  }
});
