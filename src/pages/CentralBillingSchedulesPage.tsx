import { CalendarClock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCentralCobrancaData } from "@/hooks/use-central-cobranca";
import { formatDateTime } from "@/modules/central-cobranca/lib";

export default function CentralBillingSchedulesPage() {
  const { schedules } = useCentralCobrancaData();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Agendamentos aprovados</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {schedules.map((schedule) => (
          <div key={schedule.id} className="rounded-2xl border p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-primary" />
                  <p className="font-medium">{schedule.customer_name}</p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{schedule.snapshot_message}</p>
                <p className="mt-2 text-xs text-muted-foreground">Aprovado por {schedule.approved_by}</p>
              </div>
              <div className="space-y-2 text-right">
                <Badge variant="secondary">{schedule.status}</Badge>
                <p className="text-xs text-muted-foreground">{formatDateTime(schedule.scheduled_for)}</p>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
