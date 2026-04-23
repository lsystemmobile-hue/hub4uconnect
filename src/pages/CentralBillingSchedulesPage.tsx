import { CalendarClock, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCentralCobrancaData } from "@/hooks/use-central-cobranca";
import { formatCurrency, formatDate, formatDateTime } from "@/modules/central-cobranca/lib";

const scheduleStatusConfig: Record<string, { label: string; icon: React.ReactNode; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pendente_execucao: { label: "Aguardando envio", icon: <Clock className="h-3.5 w-3.5" />, variant: "secondary" },
  executado:        { label: "Enviado",            icon: <CheckCircle2 className="h-3.5 w-3.5" />, variant: "default" },
  cancelado:        { label: "Cancelado",          icon: <XCircle className="h-3.5 w-3.5" />, variant: "outline" },
  falha:            { label: "Falha",              icon: <AlertCircle className="h-3.5 w-3.5" />, variant: "destructive" },
};

export default function CentralBillingSchedulesPage() {
  const { schedules, charges } = useCentralCobrancaData();

  const scheduledCharges = charges.filter((c) => c.status === "agendada");

  const schedulesWithCharge = schedules.map((schedule) => ({
    schedule,
    charge: charges.find((c) => c.id === schedule.charge_id) ?? null,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="h-4 w-4 text-primary" />
          Agendamentos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="charges">
          <TabsList className="mb-4">
            <TabsTrigger value="charges">
              Cobranças agendadas
              {scheduledCharges.length > 0 && (
                <Badge variant="secondary" className="ml-2">{scheduledCharges.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="approvals">
              Agendamentos aprovados
              {schedulesWithCharge.length > 0 && (
                <Badge variant="secondary" className="ml-2">{schedulesWithCharge.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── Cobranças com status "agendada" ── */}
          <TabsContent value="charges">
            {scheduledCharges.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma cobrança com status "agendada" no momento.</p>
            ) : (
              <div className="rounded-2xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>WhatsApp</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Envio agendado para</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scheduledCharges.map((charge) => {
                      // Pega o agendamento mais recente (ou pendente) para esta cobrança
                    const chargeSchedules = schedules.filter((s) => s.charge_id === charge.id);
                    const linked = chargeSchedules.find((s) => s.status === "pendente_execucao") ?? chargeSchedules.at(-1);
                      return (
                        <TableRow key={charge.id}>
                          <TableCell className="font-medium">{charge.customer_name}</TableCell>
                          <TableCell className="text-muted-foreground">{charge.whatsapp_phone}</TableCell>
                          <TableCell className="text-right">{formatCurrency(charge.amount_cents)}</TableCell>
                          <TableCell>{formatDate(charge.due_date)}</TableCell>
                          <TableCell>
                            {linked ? (
                              <span className="text-sm text-primary">{formatDateTime(linked.scheduled_for)}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* ── Registros de agendamento aprovado ── */}
          <TabsContent value="approvals" className="space-y-3">
            {schedulesWithCharge.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum agendamento registrado.</p>
            ) : (
              schedulesWithCharge.map(({ schedule, charge }) => {
                const cfg = scheduleStatusConfig[schedule.status] ?? scheduleStatusConfig.pendente_execucao;
                return (
                  <div key={schedule.id} className="rounded-2xl border p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <CalendarClock className="h-4 w-4 text-primary shrink-0" />
                          <p className="font-medium">{schedule.customer_name}</p>
                          {charge && (
                            <span className="text-sm text-muted-foreground">
                              — {formatCurrency(charge.amount_cents)} · venc. {formatDate(charge.due_date)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground pl-6">{schedule.snapshot_message}</p>
                        {schedule.approval_note && (
                          <p className="text-xs text-muted-foreground pl-6 italic">{schedule.approval_note}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <Badge variant={cfg.variant} className="flex items-center gap-1.5">
                          {cfg.icon}
                          {cfg.label}
                        </Badge>
                        <p className="text-xs text-muted-foreground">{formatDateTime(schedule.scheduled_for)}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
