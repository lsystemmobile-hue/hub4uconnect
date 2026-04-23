import { useState } from "react";
import { AlertCircle, CheckCircle2, LockKeyhole, RefreshCw, ShieldCheck, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useBillingAuth } from "@/hooks/use-billing-auth";
import { useCentralCobrancaData } from "@/hooks/use-central-cobranca";
import { isSupabaseConfigured } from "@/integrations/supabase/client";

export default function CentralBillingAdminPage() {
  const { profile, signOut } = useBillingAuth();
  const { markPaid, charges, syncOmie } = useCentralCobrancaData();
  const [syncStep, setSyncStep] = useState<string | null>(null);

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

            {syncStep && (
              <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${syncStep.startsWith("Erro:") ? "bg-red-50 border-red-200" : "bg-muted/50"}`}>
                {syncStep.startsWith("Concluído") ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                ) : syncStep.startsWith("Erro:") ? (
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                ) : (
                  <RefreshCw className="h-4 w-4 shrink-0 animate-spin text-primary" />
                )}
                <span className={syncStep.startsWith("Concluído") ? "text-green-700 font-medium" : syncStep.startsWith("Erro:") ? "text-red-700 font-medium" : "text-muted-foreground"}>
                  {syncStep}
                </span>
              </div>
            )}

            <Button
              variant="outline"
              disabled={syncOmie.isPending}
              onClick={async () => {
                setSyncStep(null);
                syncOmie.reset();
                try {
                  await syncOmie.mutateAsync((step) => setSyncStep(step));
                } catch (e) {
                  const msg = e instanceof Error ? e.message : String(e);
                  setSyncStep(`Erro: ${msg}`);
                } finally {
                  syncOmie.reset();
                }
              }}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${syncOmie.isPending ? "animate-spin" : ""}`} />
              {syncOmie.isPending ? "Sincronizando..." : "Reconciliar Omie"}
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
                <Button variant="outline" size="sm" onClick={async () => { try { await markPaid.mutateAsync(charge.id); } finally { markPaid.reset(); } }}>
                  Marcar como paga
                </Button>
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}
