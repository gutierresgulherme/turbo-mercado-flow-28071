import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    console.log("🚀 Iniciando integração Mercado Pago Checkout...");

    const token = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!token) throw new Error("❌ MERCADO_PAGO_ACCESS_TOKEN não configurado.");

    const { email, amount } = await req.json();
    if (!email || !amount) {
      return new Response(
        JSON.stringify({ error: "Email e valor são obrigatórios." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("📦 Criando preferência de pagamento...");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const webhookUrl = `${supabaseUrl}/functions/v1/mercadopago-webhook`;

    const preference = {
      items: [
        {
          title: "Scale Turbo Shopee - Acesso Vitalício",
          quantity: 1,
          unit_price: parseFloat(amount.toString()),
          currency_id: "BRL",
        },
      ],
      payer: { email },
      payment_methods: {
        excluded_payment_methods: [],
        excluded_payment_types: [],
        default_payment_method_id: "pix",
        installments: 1,
      },
      back_urls: {
        success: "https://scale-turbo-flow.lovable.app/auth?payment=success",
        failure: "https://scale-turbo-flow.lovable.app/?payment=failure",
        pending: "https://scale-turbo-flow.lovable.app/?payment=pending",
      },
      auto_return: "approved",
      binary_mode: true,
      notification_url: webhookUrl,
    };

    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preference),
    });

    const data = await response.json();
    if (!response.ok || !data.init_point) {
      console.error("❌ Erro ao criar checkout:", data);
      throw new Error("Falha ao criar checkout Mercado Pago");
    }

    console.log("✅ Checkout criado com sucesso:", data.init_point);

    return new Response(JSON.stringify({ init_point: data.init_point }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Erro no fluxo de checkout:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
