import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Loader2, Sparkles, ArrowLeft, Calculator } from "lucide-react";

const Create = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  
  // Campos do produto
  const [productName, setProductName] = useState("");
  const [productCost, setProductCost] = useState("");
  const [taxRate, setTaxRate] = useState("");
  const [desiredMargin, setDesiredMargin] = useState("");
  
  // Taxas Shopee
  const [freeShipping, setFreeShipping] = useState("no"); // "yes" = 20%, "no" = 14%
  const [fixedFee, setFixedFee] = useState("high"); // "low" = R$2 (< R$8), "high" = R$4 (> R$8)
  
  // IA fields
  const [keywords, setKeywords] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [generatedDescription, setGeneratedDescription] = useState("");
  
  // Cálculo do preço final
  const [finalPrice, setFinalPrice] = useState(0);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      }
    };
    checkAuth();
  }, [navigate]);

  // Cálculo automático do preço final
  useEffect(() => {
    if (!productCost || !taxRate || !desiredMargin) {
      setFinalPrice(0);
      return;
    }

    const cost = parseFloat(productCost);
    const tax = parseFloat(taxRate);
    const margin = parseFloat(desiredMargin);
    const commission = freeShipping === "yes" ? 20 : 14;
    const fixed = fixedFee === "low" ? 2 : 4;

    // Fórmula: Preço Final = Custo + (Custo × Margem/100) + TaxaFixa + (Custo × Comissão/100) + (Custo × Imposto/100)
    const calculatedPrice = cost + (cost * margin / 100) + fixed + (cost * commission / 100) + (cost * tax / 100);
    setFinalPrice(calculatedPrice);
  }, [productCost, taxRate, desiredMargin, freeShipping, fixedFee]);

  const handleClear = () => {
    setProductName("");
    setProductCost("");
    setTaxRate("");
    setDesiredMargin("");
    setFreeShipping("no");
    setFixedFee("high");
    setKeywords("");
    setTargetAudience("");
    setGeneratedDescription("");
    setFinalPrice(0);
    toast.info("Campos limpos com sucesso!");
  };

  const handleGenerateAd = () => {
    if (!productName.trim()) {
      toast.error("Preencha o nome do produto");
      return;
    }
    if (finalPrice === 0) {
      toast.error("Preencha todos os campos obrigatórios para calcular o preço");
      return;
    }
    toast.success("Anúncio gerado com sucesso!");
  };

  const handleGenerate = async () => {
    if (!productName.trim()) {
      toast.error("Adicione o nome do produto");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-ad", {
        body: {
          title: productName,
          keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
          targetAudience,
        },
      });

      if (error) throw error;
      setGeneratedDescription(data.description);
      toast.success("Descrição gerada com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao gerar descrição");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!productName.trim() || !generatedDescription.trim()) {
      toast.error("Nome do produto e descrição são obrigatórios");
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await (supabase as any).from("ads").insert({
        user_id: user.id,
        title: productName,
        description: generatedDescription,
        keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
        target_audience: targetAudience,
        status: "published",
      });

      if (error) throw error;
      toast.success("Anúncio salvo com sucesso!");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar anúncio");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6 bg-gradient-hero">
      <div className="max-w-7xl mx-auto space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <Card className="border-primary/30 backdrop-blur-sm bg-card/90 shadow-[0_0_30px_rgba(251,146,60,0.15)]">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Calculator className="h-8 w-8 text-primary" />
              <div>
                <CardTitle className="text-3xl">Calculadora de Preços Shopee</CardTitle>
                <CardDescription className="text-base">
                  Calcule o preço ideal considerando custos, impostos e taxas da plataforma
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Grid de campos principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Nome do Produto */}
              <Card className="border-border/50 bg-muted/30">
                <CardContent className="pt-6 space-y-2">
                  <Label htmlFor="productName" className="text-base">
                    Nome do Produto <span className="text-primary">*</span>
                  </Label>
                  <Input
                    id="productName"
                    placeholder="Ex: Fone de Ouvido Bluetooth TWS com Cancelamento de Ruído"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="bg-background border-primary/20 focus:border-primary"
                  />
                  <p className="text-xs text-muted-foreground">
                    Quanto mais detalhado, melhor será o resultado.
                  </p>
                </CardContent>
              </Card>

              {/* Custo do Produto */}
              <Card className="border-border/50 bg-muted/30">
                <CardContent className="pt-6 space-y-2">
                  <Label htmlFor="productCost" className="text-base">
                    Custo do Produto (R$) <span className="text-primary">*</span>
                  </Label>
                  <Input
                    id="productCost"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={productCost}
                    onChange={(e) => setProductCost(e.target.value)}
                    className="bg-background border-primary/20 focus:border-primary"
                  />
                  <p className="text-xs text-muted-foreground">
                    Valor que você paga pelo produto (sem taxas).
                  </p>
                </CardContent>
              </Card>

              {/* Alíquota de Imposto */}
              <Card className="border-border/50 bg-muted/30">
                <CardContent className="pt-6 space-y-2">
                  <Label htmlFor="taxRate" className="text-base">
                    Alíquota de Imposto (%) <span className="text-primary">*</span>
                  </Label>
                  <Input
                    id="taxRate"
                    type="number"
                    step="0.01"
                    placeholder="0"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    className="bg-background border-primary/20 focus:border-primary"
                  />
                  <p className="text-xs text-muted-foreground">
                    Percentual de impostos sobre o produto (ex: 10%).
                  </p>
                </CardContent>
              </Card>

              {/* Margem Desejada */}
              <Card className="border-border/50 bg-muted/30">
                <CardContent className="pt-6 space-y-2">
                  <Label htmlFor="desiredMargin" className="text-base">
                    Margem Desejada (%) <span className="text-primary">*</span>
                  </Label>
                  <Input
                    id="desiredMargin"
                    type="number"
                    step="0.01"
                    placeholder="0"
                    value={desiredMargin}
                    onChange={(e) => setDesiredMargin(e.target.value)}
                    className="bg-background border-primary/20 focus:border-primary"
                  />
                  <p className="text-xs text-muted-foreground">
                    Lucro desejado sobre o custo (ex: 30% = R$30 de lucro para cada R$100).
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Wrappers de Taxas Shopee */}
            <div className="space-y-6 pt-4">
              {/* Wrapper 1 - Programa de Frete Grátis */}
              <Card className="border-secondary/30 bg-card shadow-[0_0_20px_rgba(6,182,212,0.1)]">
                <CardContent className="pt-6 space-y-4">
                  <Label className="text-lg font-semibold text-secondary">
                    Programa de Frete Grátis Shopee
                  </Label>
                  <RadioGroup value={freeShipping} onValueChange={setFreeShipping}>
                    <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="yes" id="shipping-yes" />
                      <Label htmlFor="shipping-yes" className="cursor-pointer flex-1">
                        Sim (20% de comissão)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="no" id="shipping-no" />
                      <Label htmlFor="shipping-no" className="cursor-pointer flex-1">
                        Não (14% de comissão)
                      </Label>
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>

              {/* Wrapper 2 - Taxa Fixa Shopee */}
              <Card className="border-secondary/30 bg-card shadow-[0_0_20px_rgba(6,182,212,0.1)]">
                <CardContent className="pt-6 space-y-4">
                  <Label className="text-lg font-semibold text-secondary">
                    Selecione o tipo de taxa fixa Shopee
                  </Label>
                  <RadioGroup value={fixedFee} onValueChange={setFixedFee}>
                    <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="low" id="fee-low" />
                      <Label htmlFor="fee-low" className="cursor-pointer flex-1">
                        Produto menor que R$8 → Taxa Fixa de R$2
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="high" id="fee-high" />
                      <Label htmlFor="fee-high" className="cursor-pointer flex-1">
                        Produto maior que R$8 → Taxa Fixa de R$4
                      </Label>
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>
            </div>

            {/* Resultado do Cálculo */}
            {finalPrice > 0 && (
              <Card className="border-primary/50 bg-gradient-to-br from-primary/10 to-secondary/10 shadow-[0_0_40px_rgba(251,146,60,0.2)]">
                <CardContent className="pt-6">
                  <div className="text-center space-y-2">
                    <p className="text-lg text-muted-foreground">💰 Preço de Venda Sugerido</p>
                    <p className="text-5xl font-bold bg-gradient-to-r from-primary to-secondary text-transparent bg-clip-text">
                      R$ {finalPrice.toFixed(2)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Botões Finais */}
            <div className="flex gap-4 pt-4">
              <Button
                onClick={handleClear}
                variant="outline"
                className="flex-1 border-border/50 hover:border-primary/50"
              >
                Limpar
              </Button>
              <Button
                onClick={handleGenerateAd}
                disabled={!productName.trim() || finalPrice === 0}
                className="flex-1 bg-gradient-primary hover:opacity-90 transition-opacity"
              >
                Gerar Anúncio
              </Button>
            </div>

            {/* Seção de Geração de Descrição com IA */}
            <div className="pt-6 border-t border-border/50 space-y-4">
              <div className="flex items-center gap-3">
                <Sparkles className="h-6 w-6 text-primary" />
                <h3 className="text-xl font-semibold">Gerar Descrição com IA (Opcional)</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="keywords">Palavras-chave (separadas por vírgula)</Label>
                  <Input
                    id="keywords"
                    placeholder="Ex: bluetooth, cancelamento de ruído, TWS"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    className="bg-background border-primary/20 focus:border-primary"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="audience">Público-alvo</Label>
                  <Input
                    id="audience"
                    placeholder="Ex: Jovens de 18-30 anos, gamers"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    className="bg-background border-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={isLoading || !productName}
                className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Sparkles className="mr-2 h-4 w-4" />
                Gerar Descrição com IA
              </Button>

              {generatedDescription && (
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição Gerada</Label>
                  <Textarea
                    id="description"
                    value={generatedDescription}
                    onChange={(e) => setGeneratedDescription(e.target.value)}
                    rows={8}
                    className="font-mono text-sm bg-background border-primary/20"
                  />
                  <Button
                    onClick={handleSave}
                    disabled={isLoading}
                    variant="secondary"
                    className="w-full"
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar Anúncio
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Create;