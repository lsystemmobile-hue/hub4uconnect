import { AlertTriangle, BellRing, Clock4 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCentralCobrancaData } from "@/hooks/use-central-cobranca";
import { formatDateTime } from "@/modules/central-cobranca/lib";

const iconByType = {
  novo_inadimplente: BellRing,
  boleto_vencido: AlertTriangle,
  falha_envio: AlertTriangle,
  agendamento_proximo: Clock4,
};

export default function CentralBillingAlertsPage() {
  const { notifications } = useCentralCobrancaData();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Alertas internos</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        {notifications.map((item) => {
          const Icon = iconByType[item.type];
          return (
            <div key={item.id} className="rounded-2xl border p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-primary/10 p-2">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{item.title}</p>
                    {!item.read ? <span className="text-xs font-medium text-primary">Novo</span> : null}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
                  <p className="mt-3 text-xs text-muted-foreground">{formatDateTime(item.created_at)}</p>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
