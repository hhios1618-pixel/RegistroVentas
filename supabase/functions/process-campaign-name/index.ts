import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@^2.0.0";
// Usaremos una importación más genérica para OpenAI por si hay problemas de versión
import OpenAI from "https://deno.land/x/openai@v4.29.1/mod.ts"; // Mantener esta por ahora

console.log("Edge Function: Starting up..." );

serve(async (req) => {
  console.log("Edge Function: Request received.");
  try {
    const requestBody = await req.json();
    console.log("Edge Function: Request Body received:", JSON.stringify(requestBody, null, 2));

    const { record } = requestBody;
    console.log("Edge Function: Record extracted:", JSON.stringify(record, null, 2));

    const campaignName = record["Nombre de la campaña"];
    console.log("Edge Function: Campaign Name:", campaignName);

    if (!campaignName) {
      console.error("Error: Nombre de la campaña no proporcionado en el registro o columna incorrecta.");
      throw new Error("Nombre de la campaña no proporcionado en el registro.");
    }

    const openai = new OpenAI({
      apiKey: Deno.env.get("OPENAI_API_KEY"),
    });

    const prompt = `Extrae el nombre del vendedor y el nombre del producto de la siguiente campaña: ${campaignName}. Responde en formato JSON con las claves 'sellerName' y 'productName'. Si no puedes extraer alguno, usa null.`;

    const gptResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    console.log("GPT Raw Response:", JSON.stringify(gptResponse, null, 2));

    const messageContent = gptResponse.choices[0].message.content;

    if (!messageContent) {
      throw new Error("La respuesta de GPT está vacía.");
    }

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(messageContent);
    } catch (jsonError) {
      console.error("Error al parsear JSON de GPT:", jsonError);
      throw new Error("La respuesta de GPT no es un JSON válido.");
    }

    const sellerName = parsedResponse.sellerName || null;
    const productName = parsedResponse.productName || null;

    console.log("Extracted Seller Name:", sellerName);
    console.log("Extracted Product Name:", productName);

    if (!sellerName) {
      throw new Error("GPT no pudo extraer el nombre del vendedor. Respuesta de GPT: " + messageContent);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    const { data, error } = await supabaseAdmin
      .from("meta_ad_spend")
      .update({
        matched_user_id: sellerName,
        advertised_product_name: productName,
      })
      .eq("id", record.id);

    if (error) {
      console.error("Error al actualizar la base de datos:", error);
      throw new Error(`Error al actualizar la base de datos: ${error.message}`);
    }

    console.log("Base de datos actualizada con éxito:", data);

    return new Response(JSON.stringify({ message: "Campaña procesada con éxito" }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error procesando campaña:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
});
