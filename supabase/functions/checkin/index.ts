// supabase/functions/checkin/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Se añaden los nuevos tipos de marcaje al tipo de Payload
type Payload = {
  person_id: string;
  site_id: string;
  type: "in" | "out" | "lunch_in" | "lunch_out";
  lat: number;
  lng: number;
  accuracy: number;
  device_id: string;
  selfie_base64: string;
  qr_code: string;
};

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function haversineMeters(lat1:number, lon1:number, lat2:number, lon2:number): number {
  const toRad = (x:number)=>(x*Math.PI)/180;
  const R = 6371000;
  const dLat = toRad(lat2-lat1);
  const dLon = toRad(lon2-lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return 2*R*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("PROJECT_URL") || Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "missing_env" }), { status: 500, headers: { ...corsHeaders, "content-type":"application/json" }});
    }
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const body: Payload = await req.json();
    
    // Se actualiza la lista de tipos válidos para incluir los de almuerzo
    const validTypes = ["in", "out", "lunch_in", "lunch_out"];
    if (!validTypes.includes(body.type)) {
      return new Response(JSON.stringify({ error:`type_invalid: ${body.type}` }), { status:400, headers:{ ...corsHeaders, "content-type":"application/json" }});
    }

    if (typeof body.accuracy === "number" && body.accuracy > 60) {
      return new Response(JSON.stringify({ error:"accuracy_too_high", accuracy: body.accuracy }), { status:400, headers:{ ...corsHeaders, "content-type":"application/json" }});
    }

    const { data: site, error: sErr } = await supabase
      .from("sites").select("id, lat, lng, radius_m, is_active").eq("id", body.site_id).single();
    if (sErr || !site) return new Response(JSON.stringify({ error:"site_not_found" }), { status:404, headers:{ ...corsHeaders, "content-type":"application/json" }});
    if (site.is_active === false || site.lat == null || site.lng == null) {
      return new Response(JSON.stringify({ error:"site_inactive_or_unset" }), { status:400, headers:{ ...corsHeaders, "content-type":"application/json" }});
    }

    // --- MODIFICACIÓN CLAVE: Geofencing solo para Entrada y Salida principal ---
    if (body.type === 'in' || body.type === 'out') {
      const distance_m = haversineMeters(body.lat, body.lng, site.lat, site.lng);
      const radius = site.radius_m ?? 100;
      if (distance_m > radius) {
        return new Response(JSON.stringify({
          error: "outside_geofence",
          distance_m,
          required_radius: radius,
        }), { status:403, headers:{ ...corsHeaders, "content-type":"application/json" }});
      }
    }
    
    const nowIso = new Date().toISOString();
    const { data: qr, error: qErr } = await supabase
      .from("qr_tokens").select("site_id, code, exp_at").eq("site_id", body.site_id).eq("code", body.qr_code).gt("exp_at", nowIso).maybeSingle();
    if (qErr || !qr) return new Response(JSON.stringify({ error:"qr_invalid_or_expired" }), { status:403, headers:{ ...corsHeaders, "content-type":"application/json" }});
    
    const bytes = dataUrlToBytes(body.selfie_base64);
    const selfiePath = `${body.site_id}/${body.person_id}/${Date.now()}.jpg`;
    const { error: upErr } = await supabase.storage.from("attendance-selfies").upload(selfiePath, bytes, { contentType:"image/jpeg", upsert:false });
    if (upErr) return new Response(JSON.stringify({ error:"upload_failed", details: upErr.message }), { status:500, headers:{ ...corsHeaders, "content-type":"application/json" }});

    const { error: insErr } = await supabase.from("attendance").insert({
      person_id: body.person_id, site_id: body.site_id, type: body.type,
      lat: body.lat, lng: body.lng, accuracy_m: body.accuracy,
      selfie_path: selfiePath, device_id: body.device_id, source: "web",
    });
    if (insErr) return new Response(JSON.stringify({ error:"insert_failed", details: insErr.message }), { status:500, headers:{ ...corsHeaders, "content-type":"application/json" }});
    
    return new Response(JSON.stringify({ ok:true, recorded_at: new Date().toISOString() }), { status:200, headers:{ ...corsHeaders, "content-type":"application/json" }});
  } catch (e) {
    console.error("[edge checkin] error:", e);
    return new Response(JSON.stringify({ error:"internal_error", details: String(e) }), { status:500, headers:{ ...corsHeaders, "content-type":"application/json" }});
  }
});