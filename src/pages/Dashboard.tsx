import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, LogOut, Sparkles, TrendingUp, ShoppingBag, Crown, Settings } from "lucide-react";
interface Ad {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  status: string;
  created_at: string;
}
const Dashboard = () => {
  const navigate = useNavigate();
  const [ads, setAds] = useState<Ad[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    checkAuthAndLoadData();
  }, []);
  const checkAuthAndLoadData = async () => {
    try {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      // Check if user is admin
      const {
        data: roles
      } = await (supabase as any).from("user_roles").select("role").eq("user_id", session.user.id);
      const hasAdminRole = roles?.some(r => r.role === "admin");
      setIsAdmin(hasAdminRole || false);

      // Load user's ads
      const {
        data: adsData,
        error
      } = await (supabase as any).from("ads").select("*").eq("user_id", session.user.id).order("created_at", {
        ascending: false
      });
      if (error) throw error;
      setAds(adsData || []);
    } catch (error: any) {
      toast.error(error.message || "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };
  const stats = {
    total: ads.length,
    published: ads.filter(a => a.status === "published").length,
    draft: ads.filter(a => a.status === "draft").length
  };
  return <div className="min-h-screen p-6 bg-gradient-hero">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Meus Anúncios
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie seus anúncios da Shopee com IA
            </p>
          </div>
          <div className="flex gap-3">
            {isAdmin && <Button onClick={() => navigate("/admin-dashboard")} variant="outline" className="border-primary/50 hover:bg-primary/10">
                <Crown className="mr-2 h-4 w-4" />
                Admin
              </Button>}
            <Button onClick={() => navigate("/webhook-settings")} variant="outline">
              <Settings className="mr-2 h-4 w-4" />
              Webhook
            </Button>
            <Button onClick={() => navigate("/create")} className="bg-gradient-primary hover:opacity-90">
              <Plus className="mr-2 h-4 w-4" />
              Novo Anúncio
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-border/50 backdrop-blur-sm bg-card/90">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Anúncios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-primary" />
                <span className="text-3xl font-bold">{stats.total}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 backdrop-blur-sm bg-card/90">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Roas Mínimo
Produtos Listados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-secondary" />
                <span className="text-3xl font-bold">{stats.published}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 backdrop-blur-sm bg-card/90">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Roas Médio
Aceitável</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-accent" />
                <span className="text-3xl font-bold">{stats.draft}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ads List */}
        <div className="space-y-4">
          {loading ? <Card className="border-border/50 backdrop-blur-sm bg-card/90">
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">Carregando...</p>
              </CardContent>
            </Card> : ads.length === 0 ? <Card className="border-border/50 backdrop-blur-sm bg-card/90">
              <CardContent className="p-8 text-center space-y-4">
                <Sparkles className="h-12 w-12 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground">
                  Você ainda não criou nenhum anúncio.
                </p>
                <Button onClick={() => navigate("/create")} className="bg-gradient-primary hover:opacity-90">
                  Criar Primeiro Anúncio
                </Button>
              </CardContent>
            </Card> : ads.map(ad => <Card key={ad.id} className="border-border/50 backdrop-blur-sm bg-card/90">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle>{ad.title}</CardTitle>
                      <CardDescription>
                        Criado em {new Date(ad.created_at).toLocaleDateString("pt-BR")}
                      </CardDescription>
                    </div>
                    <Badge variant={ad.status === "published" ? "default" : "secondary"} className={ad.status === "published" ? "bg-secondary" : ""}>
                      {ad.status === "published" ? "Publicado" : "Rascunho"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {ad.description}
                  </p>
                  {ad.keywords && ad.keywords.length > 0 && <div className="flex flex-wrap gap-2">
                      {ad.keywords.map((keyword, i) => <Badge key={i} variant="outline" className="text-xs">
                          {keyword}
                        </Badge>)}
                    </div>}
                </CardContent>
              </Card>)}
        </div>
      </div>
    </div>;
};
export default Dashboard;