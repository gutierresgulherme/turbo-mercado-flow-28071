import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, keywords, targetAudience } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurado');
    }

    // Build system prompt for ad generation
    const systemPrompt = `Você é um especialista em copywriting para e-commerce, especializado em criar descrições de produtos para a Shopee. 
Suas descrições devem ser:
- Otimizadas para SEO
- Persuasivas e envolventes
- Formatadas com emojis e quebras de linha
- Destacar benefícios do produto
- Incluir chamadas para ação
- Usar palavras-chave estrategicamente`;

    const userPrompt = `Crie uma descrição profissional para Shopee para o seguinte produto:

Título: ${title}
${keywords && keywords.length > 0 ? `Palavras-chave: ${keywords.join(', ')}` : ''}
${targetAudience ? `Público-alvo: ${targetAudience}` : ''}

A descrição deve ter entre 200-300 palavras, usar emojis relevantes e ser formatada para fácil leitura na Shopee.`;

    console.log('Generating ad description for:', title);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`Erro da API de IA: ${response.status}`);
    }

    const data = await response.json();
    const description = data.choices[0].message.content;

    console.log('Ad generated successfully');

    return new Response(
      JSON.stringify({ description }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error in generate-ad:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});