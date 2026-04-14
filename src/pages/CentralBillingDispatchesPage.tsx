import { MessageSquareWarning, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCentralCobrancaData } from "@/hooks/use-central-cobranca";
import { formatDateTime } from "@/modules/central-cobranca/lib";

export default function CentralBillingDispatchesPage() {
  const { dispatches } = useCentralCobrancaData();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Histórico de envios</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {dispatches.map((dispatch) => (
          <div key={dispatch.id} className="rounded-2xl border p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  {dispatch.status === "enviado" ? <Send className="h-4 w-4 text-primary" /> : <MessageSquareWarning className="h-4 w-4 text-destructive" />}
                  <p className="font-medium">{dispatch.customer_name}</p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{dispatch.message_sent}</p>
                {dispatch.error_message ? <p className="mt-2 text-sm text-destructive">{dispatch.error_message}</p> : null}
              </div>
              <div className="space-y-2 text-right">
                <Badge variant={dispatch.status === "enviado" ? "default" : "destructive"}>{dispatch.status}</Badge>
                <p className="text-xs text-muted-foreground">{formatDateTime(dispatch.created_at)}</p>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
