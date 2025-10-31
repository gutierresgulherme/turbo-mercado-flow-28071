import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Zap, TrendingUp, Shield, Check, Loader2 } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCheckout = async () => {
    const email = prompt("Digite seu e-mail para continuar:");
    
    if (!email || !email.includes("@")) {
      toast.error("Por favor, insira um e-mail válido.");
      return;
    }

    try {
      setIsProcessing(true);
      console.log("🚀 Criando checkout Mercado Pago para:", email);

      const { data, error } = await supabase.functions.invoke("mercadopago-checkout", {
        body: JSON.stringify({ email, amount: 37.9 }),
        headers: { "Content-Type": "application/json" },
      });

      if (error) {
        console.error("❌ Erro ao criar checkout:", error);
        toast.error("Falha ao iniciar o checkout. Tente novamente.");
        return;
      }

      if (data?.init_point) {
        console.log("✅ Redirecionando para checkout:", data.init_point);
        window.location.href = data.init_point;
      } else {
        console.error("❌ Nenhum init_point retornado:", data);
        toast.error("Erro ao gerar link de pagamento.");
      }
    } catch (err) {
      console.error("❌ Erro geral no checkout:", err);
      toast.error("Erro inesperado. Verifique sua conexão.");
    } finally {
      setIsProcessing(false);
    }
  };

  const features = [
    {
      icon: <Sparkles className="h-6 w-6" />,
      title: "IA Avançada",
      description: "Geração inteligente de descrições otimizadas para Shopee",
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "Rápido e Eficiente",
      description: "Crie anúncios profissionais em segundos",
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: "Maximize Vendas",
      description: "SEO otimizado para melhor ranqueamento",
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Seguro e Confiável",
      description: "Pagamento 100% seguro via Mercado Pago",
    },
  ];

  const benefits = [
    "Acesso vitalício à plataforma",
    "Geração ilimitada de anúncios",
    "Atualizações gratuitas incluídas",
    "Suporte técnico prioritário",
    "Dashboard completo de métricas",
    "Otimização automática de SEO",
  ];

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10" />
        <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-20">
          <div className="text-center space-y-6 sm:space-y-8">
            <Badge className="bg-primary/20 text-primary border-primary/30 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm">
              🚀 IA Powered
            </Badge>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold bg-gradient-primary bg-clip-text text-transparent animate-in fade-in slide-in-from-bottom-4 duration-1000 px-2">
              Scale Turbo Shopee
            </h1>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-5 duration-1000 delay-150 px-4">
              Crie anúncios profissionais para Shopee em segundos usando
              Inteligência Artificial avançada
            </p>

            {/* CTA Card */}
            <Card className="w-full max-w-md mx-auto border-primary/30 bg-card/60 backdrop-blur-lg shadow-glow-orange animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-300">
              <CardContent className="p-6 sm:p-8 space-y-5 sm:space-y-6">
                <div className="space-y-2">
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-4xl sm:text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                      R$ 37,90
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Pagamento único • Acesso vitalício
                  </p>
                </div>

                <Button
                  size="lg"
                  className="w-full bg-gradient-primary hover:opacity-90 text-base sm:text-lg font-semibold shadow-glow-orange transition-all hover:scale-105 py-5 sm:py-6"
                  onClick={handleCheckout}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-5 w-5" />
                      Começar Agora
                    </>
                  )}
                </Button>

                <div className="space-y-2">
                  {benefits.slice(0, 3).map((benefit, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-secondary" />
                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Button
              variant="ghost"
              onClick={() => navigate("/auth")}
              className="text-muted-foreground hover:text-foreground"
            >
              Já tem uma conta? Faça login
            </Button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Por que escolher o Scale Turbo?
          </h2>
          <p className="text-muted-foreground text-lg">
            Tudo que você precisa para dominar a Shopee
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, i) => (
            <Card
              key={i}
              className="border-border/50 backdrop-blur-sm bg-card/90 hover:border-primary/50 transition-all hover:scale-105"
            >
              <CardContent className="p-6 space-y-3">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-lg">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Benefits Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <Card className="border-primary/30 backdrop-blur-sm bg-card/90">
          <CardContent className="p-8 md:p-12">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-4">
                O que está incluído?
              </h2>
              <p className="text-muted-foreground">
                Tudo que você precisa em um único pagamento
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {benefits.map((benefit, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-6 w-6 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
                    <Check className="h-4 w-4 text-secondary" />
                  </div>
                  <span>{benefit}</span>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-8 border-t border-border">
              <Button
                size="lg"
                className="w-full bg-gradient-primary hover:opacity-90 text-lg font-semibold shadow-glow-orange transition-all hover:scale-105"
                onClick={handleCheckout}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    Acesso Vitalício • R$ 37,90
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;