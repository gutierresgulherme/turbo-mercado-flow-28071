import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabase = createClient(supabaseUrl!, supabaseKey!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { webhook_url } = await req.json();

    if (!webhook_url) {
      return new Response(
        JSON.stringify({ error: "URL da webhook é obrigatória" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("🧪 Testando webhook para:", webhook_url);

    const testPayload = {
      event_type: "test",
      payment_id: "test_" + Date.now(),
      email: user.email,
      amount: 37.9,
      status: "approved",
      payment_method: "pix",
      timestamp: new Date().toISOString(),
      note: "Este é um teste de webhook. Use-o para validar sua integração.",
    };

    const response = await fetch(webhook_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testPayload),
    });

    const responseBody = await response.text();
    const success = response.ok;

    console.log(`${success ? "✅" : "❌"} Teste ${success ? "bem-sucedido" : "falhou"}:`, response.status);

    // Log do teste
    const supabaseAdmin = createClient(
      supabaseUrl!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await supabaseAdmin.from("webhook_logs").insert({
      user_id: user.id,
      webhook_url: webhook_url,
      event_type: "test",
      payload: testPayload,
      response_status: response.status,
      response_body: responseBody.substring(0, 1000),
      success: success,
      source: 'manual_test',
    });

    return new Response(
      JSON.stringify({
        success: success,
        status_code: response.status,
        response_preview: responseBody.substring(0, 200),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("❌ Erro ao testar webhook:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
