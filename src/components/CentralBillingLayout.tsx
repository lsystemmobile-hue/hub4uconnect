import { useMemo, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Bell, CalendarClock, LayoutDashboard, Lock, MessageSquareText, Settings2, Wallet } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useBillingAuth } from "@/hooks/use-billing-auth";

const tabs = [
  { value: "dashboard", path: "/central-cobranca/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { value: "cobrancas", path: "/central-cobranca/cobrancas", label: "Cobranças", icon: Wallet },
  { value: "envios", path: "/central-cobranca/envios", label: "Envios", icon: MessageSquareText },
  { value: "agendamentos", path: "/central-cobranca/agendamentos", label: "Agendamentos", icon: CalendarClock },
  { value: "alertas", path: "/central-cobranca/alertas", label: "Alertas", icon: Bell },
  { value: "admin", path: "/central-cobranca/admin", label: "Admin", icon: Settings2 },
];

export function CentralBillingLayout() {
  const location = useLocation();
  const { profile } = useBillingAuth();

  const activeTab = useMemo(() => {
    const current = tabs.find((tab) => location.pathname.includes(tab.path));
    return current?.value ?? "dashboard";
  }, [location.pathname]);

  if (!profile) {
    return <CentralBillingAuthGate />;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border bg-gradient-to-br from-white via-white to-emerald-50 p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">Central de Cobrança</p>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Cobrança via WhatsApp com revisão humana</h1>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                Operação financeira com controle total: sync com Omie, preview obrigatório, envio manual ou agendado e auditoria centralizada.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border bg-background/80 px-4 py-3 text-sm shadow-sm backdrop-blur">
            <p className="font-medium">{profile.fullName}</p>
            <p className="text-muted-foreground">
              Perfil {profile.role} {profile.active ? "ativo" : "inativo"}
            </p>
          </div>
        </div>
      </div>

      <div className="border-b pb-1">
        <Tabs value={activeTab} className="w-full">
          <TabsList className="h-auto w-full flex-wrap justify-start gap-3 bg-transparent p-0">
            {tabs.map((tab) => (
              <Link key={tab.value} to={tab.path}>
                <TabsTrigger
                  value={tab.value}
                  className="h-11 gap-2 rounded-t-lg rounded-b-none px-5 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none"
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </TabsTrigger>
              </Link>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="min-h-[calc(100vh-230px)]">
        <Outlet />
      </div>
    </div>
  );
}

function CentralBillingAuthGate() {
  const { signIn, isConfigured, loading } = useBillingAuth();
  const [email, setEmail] = useState("financeiro@4uconnect.demo");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await signIn(email, password);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Não foi possível entrar.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-5xl items-center">
      <div className="grid w-full gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-0 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-700 text-white shadow-xl">
          <CardHeader>
            <CardTitle className="text-3xl">Central de Cobrança</CardTitle>
            <CardDescription className="text-emerald-100">
              Plataforma para time financeiro revisar, aprovar e enviar cobranças com segurança.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-emerald-50">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
              <p className="font-medium">Guardrails desta operação</p>
              <p className="mt-2 opacity-90">Nenhuma mensagem automática sem validação. Todo envio exige revisão, confirmação ou aprovação prévia para o agendamento.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4">Sincronização Omie com status e boletos</div>
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4">Meta WhatsApp Cloud API com trilha de auditoria</div>
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4">Sugestões inteligentes de horário e risco</div>
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4">Histórico operacional para financeiro e admin</div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Entrar
            </CardTitle>
            <CardDescription>
              {isConfigured ? "Use as credenciais do Supabase Auth." : "Modo demonstração ativo até configurar as variáveis do Supabase."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isConfigured ? (
              <Alert>
                <AlertTitle>Modo demonstração</AlertTitle>
                <AlertDescription>
                  Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` para autenticação real. Enquanto isso, o módulo funciona com dados mockados.
                </AlertDescription>
              </Alert>
            ) : null}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="billing-email">E-mail</Label>
                <Input id="billing-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billing-password">Senha</Label>
                <Input id="billing-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
              </div>

              {error ? <p className="text-sm text-destructive">{error}</p> : null}

              <Button className="w-full" type="submit" disabled={loading || submitting}>
                {submitting ? "Entrando..." : "Acessar central"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
