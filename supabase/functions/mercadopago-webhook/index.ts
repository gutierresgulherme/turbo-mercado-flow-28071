import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Se aprovado, marcar usuário como premium
    if (payment.status === "approved") {
      const email = payment.payer.email;
      const { data } = await supabase.auth.admin.listUsers();
      const existingUser = data?.users?.find((u) => u.email === email);

      if (existingUser) {
        await supabase.from("profiles").update({ is_premium: true }).eq("id", existingUser.id);
        console.log("✅ Usuário atualizado para premium:", existingUser.email);
      }
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
