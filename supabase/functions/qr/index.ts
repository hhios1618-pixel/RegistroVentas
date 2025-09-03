// supabase/functions/qr/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

serve(async (req) => {
  // Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const site_id = url.searchParams.get("site_id");
    const ttl = Number(url.searchParams.get("ttl") ?? 60);

    if (!site_id) {
      return new Response(JSON.stringify({ error: "site_id_required" }), {
        status: 400, headers: { "content-type": "application/json", ...corsHeaders },
      });
    }

    const SUPABASE_URL = Deno.env.get("PROJECT_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!;
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "missing_env" }), {
        status: 500, headers: { "content-type": "application/json", ...corsHeaders },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Limpia expirados (opcional)
    await supabase.from("qr_tokens").delete().lt("exp_at", new Date().toISOString());

    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 dígitos
    const exp_at = new Date(Date.now() + ttl * 1000).toISOString();

    const { error } = await supabase.from("qr_tokens").insert({ site_id, code, exp_at });
    if (error) throw error;

    return new Response(JSON.stringify({ code, exp_at }), {
      status: 200, headers: { "content-type": "application/json", ...corsHeaders },
    });
  } catch (e) {
    console.error("[edge qr] error:", e);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500, headers: { "content-type": "application/json", ...corsHeaders },
    });
  }
});