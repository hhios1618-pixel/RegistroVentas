// supabase/functions/qr/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type CheckType = "in" | "out" | "lunch_in" | "lunch_out";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
} as const;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const site_id = url.searchParams.get("site_id");
    const type = url.searchParams.get("type") as CheckType | null;
    const ttl = Number(url.searchParams.get("ttl") ?? 60);

    if (!site_id) {
      return new Response(JSON.stringify({ error: "site_id_required" }), { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } });
    }
    if (!type || !["in","out","lunch_in","lunch_out"].includes(type)) {
      return new Response(JSON.stringify({ error: "type_required" }), { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } });
    }

    const SUPABASE_URL = Deno.env.get("PROJECT_URL") ?? Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "missing_env" }), { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // limpia expirados
    await supabase.from("qr_tokens").delete().lt("exp_at", new Date().toISOString());

    const rnd = Math.floor(100000 + Math.random() * 900000).toString();
    const code = `${rnd}-${type}`; // liga tipo
    const exp_at = new Date(Date.now() + ttl * 1000).toISOString();

    const { error } = await supabase.from("qr_tokens").insert({ site_id, code, exp_at });
    if (error) throw error;

    return new Response(JSON.stringify({ code, exp_at }), { status: 200, headers: { ...corsHeaders, "content-type": "application/json" } });
  } catch (e) {
    console.error("[edge qr] error:", e);
    return new Response(JSON.stringify({ error: "internal_error" }), { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } });
  }
});