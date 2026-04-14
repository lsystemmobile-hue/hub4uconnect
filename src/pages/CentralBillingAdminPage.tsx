import { LockKeyhole, RefreshCw, ShieldCheck, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useBillingAuth } from "@/hooks/use-billing-auth";
import { useCentralCobrancaData } from "@/hooks/use-central-cobranca";
import { isSupabaseConfigured } from "@/integrations/supabase/client";

export default function CentralBillingAdminPage() {
  const { profile, signOut } = useBillingAuth();
  const { templates, markPaid, charges, syncOmie } = useCentralCobrancaData();

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserCog className="h-4 w-4 text-primary" />
              Usuário atual
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-medium">{profile?.fullName}</p>
            <p className="text-muted-foreground">{profile?.email}</p>
            <Badge>{profile?.role}</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Integração
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">{isSupabaseConfigured ? "Supabase configurado para autenticação real e leitura de dados." : "Supabase ainda não configurado no frontend. Central operando em modo demonstração."}</p>
            <Button variant="outline" onClick={() => void syncOmie.mutateAsync()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Reconciliar Omie
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LockKeyhole className="h-4 w-4 text-primary" />
              Sessão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => void signOut()}>
              Encerrar sessão
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Template utilitário ativo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {templates.map((template) => (
            <div key={template.id} className="rounded-2xl border p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">{template.name}</p>
                <Badge variant={template.active ? "default" : "secondary"}>{template.category}</Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{template.content}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ações administrativas rápidas</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {charges
            .filter((charge) => charge.status !== "paga")
            .slice(0, 4)
            .map((charge) => (
              <div key={charge.id} className="flex items-center justify-between rounded-2xl border p-4">
                <div>
                  <p className="font-medium">{charge.customer_name}</p>
                  <p className="text-sm text-muted-foreground">Simular baixa vinda da Omie</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => void markPaid.mutateAsync(charge.id)}>
                  Marcar como paga
                </Button>
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}
