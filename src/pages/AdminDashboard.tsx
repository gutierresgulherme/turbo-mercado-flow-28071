import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowLeft, Users, ShoppingBag, CreditCard, TrendingUp } from "lucide-react";

interface Stats {
  totalUsers: number;
  totalAds: number;
  totalPayments: number;
  revenue: number;
}

interface Payment {
  payment_id: string;
  email: string;
  amount: number;
  status: string;
  payment_method: string;
  created_at: string;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalAds: 0,
    totalPayments: 0,
    revenue: 0,
  });
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastPaymentId, setLastPaymentId] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAndLoadData();
    loadPayments();

    // Setup realtime listener for new payments
    const paymentsChannel = supabase
      .channel('admin-payments-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'payments',
        },
        (payload) => {
          console.log('💸 Novo pagamento recebido:', payload);
          const newPayment = payload.new as Payment;
          
          if (newPayment.status === 'approved' && newPayment.payment_id !== lastPaymentId) {
            // Play success sound
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.play().catch(console.error);
            
            // Show toast notification
            toast.success(`💸 Nova Venda Aprovada!`, {
              description: `Cliente: ${newPayment.email} | Valor: R$ ${Number(newPayment.amount).toFixed(2)}`,
              duration: 10000,
            });
            
            setLastPaymentId(newPayment.payment_id);
            
            // Reload data
            loadPayments();
            checkAdminAndLoadData();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(paymentsChannel);
    };
  }, [lastPaymentId]);

  const loadPayments = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("payments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setPayments(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar pagamentos:", error);
    }
  };

  const checkAdminAndLoadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      // Check if user is admin
      const { data: roles } = await (supabase as any)
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      const hasAdminRole = roles?.some((r: any) => r.role === "admin");
      if (!hasAdminRole) {
        toast.error("Acesso negado: apenas administradores");
        navigate("/dashboard");
        return;
      }

      // Load stats
      const { data: profiles } = await (supabase as any).from("profiles").select("id");
      const { data: ads } = await (supabase as any).from("ads").select("id");
      const { data: paymentsData } = await (supabase as any).from("payments").select("amount");

      const totalRevenue = paymentsData?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;

      setStats({
        totalUsers: profiles?.length || 0,
        totalAds: ads?.length || 0,
        totalPayments: paymentsData?.length || 0,
        revenue: totalRevenue,
      });
    } catch (error: any) {
      toast.error(error.message || "Erro ao carregar dados");
      navigate("/dashboard");
    } finally {
      setLoading(false);
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
          Voltar ao Dashboard
        </Button>

        <div>
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Painel Administrativo
          </h1>
          <p className="text-muted-foreground mt-1">
            Visão geral do sistema • Atualização em tempo real ativa 🔴
          </p>
        </div>

        {loading ? (
          <Card className="border-border/50 backdrop-blur-sm bg-card/90">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">Carregando...</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-border/50 backdrop-blur-sm bg-card/90">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Total de Usuários
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <span className="text-3xl font-bold text-primary">{stats.totalUsers}</span>
                </CardContent>
              </Card>

              <Card className="border-border/50 backdrop-blur-sm bg-card/90">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4" />
                    Total de Anúncios
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <span className="text-3xl font-bold text-secondary">{stats.totalAds}</span>
                </CardContent>
              </Card>

              <Card className="border-border/50 backdrop-blur-sm bg-card/90">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Total de Pagamentos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <span className="text-3xl font-bold text-accent">{stats.totalPayments}</span>
                </CardContent>
              </Card>

              <Card className="border-border/50 backdrop-blur-sm bg-card/90">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Receita Total
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <span className="text-3xl font-bold text-primary">
                    R$ {stats.revenue.toFixed(2)}
                  </span>
                </CardContent>
              </Card>
            </div>

            <Card className="border-border/50 backdrop-blur-sm bg-card/90">
              <CardHeader>
                <CardTitle>📊 Vendas Recentes</CardTitle>
                <CardDescription>
                  Últimas transações aprovadas • Atualização automática
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Método</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            Nenhuma venda registrada ainda
                          </TableCell>
                        </TableRow>
                      ) : (
                        payments.map((payment) => (
                          <TableRow key={payment.payment_id}>
                            <TableCell className="font-medium">{payment.email}</TableCell>
                            <TableCell className="text-secondary font-semibold">
                              R$ {Number(payment.amount).toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={payment.status === "approved" ? "default" : "secondary"}
                              >
                                {payment.status === "approved" ? "✅ Aprovado" : payment.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{payment.payment_method || "N/A"}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(payment.created_at).toLocaleString("pt-BR")}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 backdrop-blur-sm bg-card/90">
              <CardHeader>
                <CardTitle>Informações do Sistema</CardTitle>
                <CardDescription>
                  Estatísticas e métricas da plataforma
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-4 border border-border rounded-lg">
                  <span className="text-sm text-muted-foreground">Status do Sistema</span>
                  <Badge className="bg-secondary">Operacional</Badge>
                </div>
                <div className="flex justify-between items-center p-4 border border-border rounded-lg">
                  <span className="text-sm text-muted-foreground">Modo de Pagamento</span>
                  <Badge>Produção (Mercado Pago)</Badge>
                </div>
                <div className="flex justify-between items-center p-4 border border-border rounded-lg">
                  <span className="text-sm text-muted-foreground">Última Atualização</span>
                  <span className="text-sm">{new Date().toLocaleDateString("pt-BR")}</span>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
