import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sendWebhook(supabase: any, userId: string, eventType: string, paymentData: any) {
  try {
    const { data: settings } = await supabase
      .from("webhook_settings")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();

    if (!settings) {
      console.log("⚠️ Nenhuma webhook configurada para o usuário");
      return;
    }

    const payload = {
      event_type: eventType,
      payment_id: paymentData.id,
      email: paymentData.email,
      amount: paymentData.amount,
      status: paymentData.status,
      payment_method: paymentData.payment_method,
      timestamp: new Date().toISOString(),
    };

    console.log("📤 Enviando webhook para:", settings.webhook_url);

    const response = await fetch(settings.webhook_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseBody = await response.text();
    const success = response.ok;

    console.log(`${success ? "✅" : "❌"} Webhook ${success ? "enviado" : "falhou"}:`, response.status);

    await supabase.from("webhook_logs").insert({
      user_id: userId,
      webhook_url: settings.webhook_url,
      event_type: eventType,
      payload: payload,
      response_status: response.status,
      response_body: responseBody.substring(0, 1000),
      success: success,
    });

  } catch (error) {
    console.error("❌ Erro ao enviar webhook:", error);
    
    await supabase.from("webhook_logs").insert({
      user_id: userId,
      webhook_url: "error",
      event_type: eventType,
      payload: paymentData,
      response_status: 0,
      response_body: error instanceof Error ? error.message : "Unknown error",
      success: false,
    });
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    console.log("📬 Webhook recebido:", JSON.stringify(body, null, 2));

    const paymentId = body.data?.id;
    if (!paymentId) return new Response(JSON.stringify({ ok: false }), { headers: corsHeaders });

    const MERCADO_PAGO_ACCESS_TOKEN = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const supabase = createClient(supabaseUrl!, supabaseKey!);

    const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}` },
    });
    const payment = await paymentRes.json();

    console.log("💳 Detalhes do pagamento:", payment.status, payment.payer?.email);

    // Registra o pagamento
    await supabase.from("payments").upsert({
      payment_id: payment.id.toString(),
      email: payment.payer.email,
      status: payment.status,
      amount: payment.transaction_amount,
      payment_method: payment.payment_type_id,
      date: new Date().toISOString(),
    }, { onConflict: "payment_id" });

    let userId: string | null = null;
    const email = payment.payer.email;
    const { data } = await supabase.auth.admin.listUsers();
    const existingUser = data?.users?.find((u) => u.email === email);

    // Se aprovado, marcar usuário como premium
    if (payment.status === "approved") {
      if (existingUser) {
        userId = existingUser.id;
        await supabase.from("profiles").update({ is_premium: true }).eq("id", existingUser.id);
        console.log("✅ Usuário atualizado para premium:", existingUser.email);
      }
    }

    // Enviar webhook para URL configurada pelo usuário
    if (existingUser) {
      let eventType = "payment_pending";
      if (payment.status === "approved") eventType = "payment_success";
      else if (payment.status === "rejected" || payment.status === "cancelled") eventType = "payment_failed";

      const paymentData = {
        id: payment.id.toString(),
        email: payment.payer.email,
        amount: payment.transaction_amount,
        status: payment.status,
        payment_method: payment.payment_type_id,
      };

      await sendWebhook(supabase, existingUser.id, eventType, paymentData);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Erro no webhook:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
