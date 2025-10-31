import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Send, Loader2, CheckCircle, XCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface WebhookLog {
  id: string;
  event_type: string;
  webhook_url: string;
  success: boolean;
  response_status: number | null;
  created_at: string;
  source: string;
}

const WebhookSettings = () => {
  const navigate = useNavigate();
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [hasSettings, setHasSettings] = useState(false);

  useEffect(() => {
    loadSettings();
    loadLogs();
  }, []);

  const loadSettings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("webhook_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Erro ao carregar configurações:", error);
      return;
    }

    if (data) {
      setWebhookUrl(data.webhook_url);
      setIsActive(data.is_active);
      setHasSettings(true);
    }
  };

  const loadLogs = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("webhook_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Erro ao carregar logs:", error);
      return;
    }

    setLogs(data || []);
  };

  const handleSave = async () => {
    if (!webhookUrl.trim()) {
      toast.error("Por favor, insira uma URL válida");
      return;
    }

    try {
      const urlPattern = /^https?:\/\/.+/;
      if (!urlPattern.test(webhookUrl)) {
        toast.error("URL deve começar com http:// ou https://");
        return;
      }

      setIsSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("webhook_settings")
        .upsert({
          user_id: user.id,
          webhook_url: webhookUrl,
          is_active: isActive,
        }, { onConflict: "user_id" });

      if (error) throw error;

      toast.success("Configurações salvas com sucesso!");
      setHasSettings(true);
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    if (!hasSettings) {
      toast.error("Salve as configurações antes de testar");
      return;
    }

    try {
      setIsTesting(true);
      
      const { data, error } = await supabase.functions.invoke("test-webhook", {
        body: { webhook_url: webhookUrl },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success("Webhook testado com sucesso!");
      } else {
        toast.error("Falha no teste do webhook");
      }

      await loadLogs();
    } catch (error) {
      console.error("Erro ao testar webhook:", error);
      toast.error("Erro ao testar webhook");
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao Dashboard
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Configurações de Webhook</CardTitle>
            <CardDescription>
              Configure a URL para receber notificações automáticas de pagamento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="webhook-url">URL da Webhook</Label>
              <Input
                id="webhook-url"
                type="url"
                placeholder="https://seusite.com/webhook"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Esta URL receberá notificações POST em JSON com os dados do pagamento
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Webhook Ativo</Label>
                <p className="text-sm text-muted-foreground">
                  Ative ou desative o envio de notificações
                </p>
              </div>
              <Switch
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Configurações"
                )}
              </Button>

              <Button
                onClick={handleTest}
                disabled={isTesting || !hasSettings}
                variant="outline"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testando...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Testar Webhook
                  </>
                )}
              </Button>
            </div>

            <div className="p-4 bg-muted rounded-lg space-y-2">
              <h4 className="font-medium text-sm">Eventos enviados:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• <strong>payment_success</strong> - Pagamento aprovado</li>
                <li>• <strong>payment_pending</strong> - Pagamento pendente</li>
                <li>• <strong>payment_failed</strong> - Pagamento falhou</li>
              </ul>
              <p className="text-xs text-muted-foreground mt-2">
                Formato JSON: {`{ event_type, payment_id, email, amount, status, payment_method, timestamp }`}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Histórico de Envios</CardTitle>
            <CardDescription>
              Últimas 10 tentativas de envio de webhook
            </CardDescription>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum envio registrado ainda
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Evento</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Código</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {new Date(log.created_at).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.event_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={log.source === 'manual_test' ? 'secondary' : 'default'}
                          className="text-xs"
                        >
                          {log.source === 'manual_test' ? '🧪 Teste' : '💳 Pagamento Real'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {log.success ? (
                          <div className="flex items-center text-green-600">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Sucesso
                          </div>
                        ) : (
                          <div className="flex items-center text-red-600">
                            <XCircle className="h-4 w-4 mr-1" />
                            Falha
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {log.response_status || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WebhookSettings;
