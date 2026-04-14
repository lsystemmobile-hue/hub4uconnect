import { useMemo, useState } from "react";
import { CalendarClock, Eye, RefreshCw, Search, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CentralBillingStatusBadge } from "@/components/CentralBillingStatusBadge";
import { CentralBillingPreviewDialog } from "@/components/CentralBillingPreviewDialog";
import { CentralBillingScheduleDialog } from "@/components/CentralBillingScheduleDialog";
import { useBillingAuth } from "@/hooks/use-billing-auth";
import { useCentralCobrancaData } from "@/hooks/use-central-cobranca";
import { toast } from "@/components/ui/sonner";
import { filterCharges, formatCurrency, formatDate } from "@/modules/central-cobranca/lib";
import type { Charge, ChargeFilters } from "@/modules/central-cobranca/types";

const defaultFilters: ChargeFilters = {
  search: "",
  status: "todos",
  dueDateFrom: "",
  dueDateTo: "",
};

export default function CentralBillingChargesPage() {
  const { profile } = useBillingAuth();
  const { charges, isLoading, sendNow, schedule, syncOmie } = useCentralCobrancaData();
  const [filters, setFilters] = useState<ChargeFilters>(defaultFilters);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [previewCharge, setPreviewCharge] = useState<Charge | null>(null);
  const [scheduleCharge, setScheduleCharge] = useState<Charge | null>(null);

  const filteredCharges = useMemo(() => filterCharges(charges, filters), [charges, filters]);

  const allSelected = filteredCharges.length > 0 && filteredCharges.every((charge) => selectedIds.includes(charge.id));

  const handleToggleAll = (checked: boolean) => {
    setSelectedIds(checked ? filteredCharges.map((charge) => charge.id) : []);
  };

  const handleToggleOne = (chargeId: string, checked: boolean) => {
    setSelectedIds((current) => (checked ? [...new Set([...current, chargeId])] : current.filter((id) => id !== chargeId)));
  };

  const handleBulkSend = async (message: string) => {
    if (selectedIds.length === 0) return;
    await sendNow.mutateAsync({ chargeIds: selectedIds, customMessage: message });
    setPreviewCharge(null);
    setSelectedIds([]);
    toast.success("Cobranças enviadas com confirmação manual.");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-base">Fila de inadimplentes</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Selecione, revise e envie apenas após conferir mensagem e boleto.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => void syncOmie.mutateAsync()} disabled={syncOmie.isPending}>
                <RefreshCw className="mr-2 h-4 w-4" />
                {syncOmie.isPending ? "Sincronizando..." : "Sincronizar Omie"}
              </Button>
              <Button variant="outline" disabled={selectedIds.length === 0} onClick={() => setScheduleCharge(charges.find((charge) => charge.id === selectedIds[0]) ?? null)}>
                <CalendarClock className="mr-2 h-4 w-4" />
                Agendar selecionada
              </Button>
              <Button disabled={selectedIds.length === 0} onClick={() => setPreviewCharge(charges.find((charge) => charge.id === selectedIds[0]) ?? null)}>
                <Send className="mr-2 h-4 w-4" />
                Enviar via WhatsApp
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2 xl:col-span-2">
              <Label htmlFor="charge-search">Buscar cliente</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="charge-search"
                  className="pl-9"
                  value={filters.search}
                  onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                  placeholder="Nome ou documento"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filters.status} onValueChange={(value) => setFilters((current) => ({ ...current, status: value as ChargeFilters["status"] }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="revisao">Em revisão</SelectItem>
                  <SelectItem value="agendada">Agendada</SelectItem>
                  <SelectItem value="enviada">Enviada</SelectItem>
                  <SelectItem value="falha_envio">Falha</SelectItem>
                  <SelectItem value="paga">Paga</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Vencimento de</Label>
                <Input type="date" value={filters.dueDateFrom} onChange={(event) => setFilters((current) => ({ ...current, dueDateFrom: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Até</Label>
                <Input type="date" value={filters.dueDateTo} onChange={(event) => setFilters((current) => ({ ...current, dueDateTo: event.target.value }))} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox checked={allSelected} onCheckedChange={(value) => handleToggleAll(Boolean(value))} aria-label="Selecionar todas" />
                  </TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCharges.map((charge) => (
                  <TableRow key={charge.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(charge.id)}
                        onCheckedChange={(value) => handleToggleOne(charge.id, Boolean(value))}
                        aria-label={`Selecionar ${charge.customer_name}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{charge.customer_name}</p>
                        <p className="text-xs text-muted-foreground">{charge.customer_document}</p>
                      </div>
                    </TableCell>
                    <TableCell>{charge.whatsapp_phone}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(charge.amount_cents)}</TableCell>
                    <TableCell>{formatDate(charge.due_date)}</TableCell>
                    <TableCell>
                      <CentralBillingStatusBadge status={charge.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => setPreviewCharge(charge)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setScheduleCharge(charge)}>
                          <CalendarClock className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!isLoading && filteredCharges.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      Nenhuma cobrança encontrada com os filtros atuais.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>

          <div className="rounded-2xl border bg-muted/30 p-4 text-sm text-muted-foreground">
            {selectedIds.length > 0
              ? `${selectedIds.length} cobrança(s) selecionada(s). Todo envio exige revisão manual do financeiro${profile?.role === "admin" ? " ou do admin" : ""}.`
              : "Selecione uma ou mais cobranças para enviar ou agendar."}
          </div>
        </CardContent>
      </Card>

      <CentralBillingPreviewDialog
        open={Boolean(previewCharge)}
        charge={previewCharge}
        onOpenChange={(open) => !open && setPreviewCharge(null)}
        onConfirm={(message) => void handleBulkSend(message)}
      />

      <CentralBillingScheduleDialog
        open={Boolean(scheduleCharge)}
        charge={scheduleCharge}
        onOpenChange={(open) => !open && setScheduleCharge(null)}
        onConfirm={async ({ scheduledFor, approvalNote, snapshotMessage }) => {
          if (!scheduleCharge || !profile) return;
          await schedule.mutateAsync({
            chargeIds: [scheduleCharge.id],
            scheduledFor,
            approvalNote,
            approvedBy: profile.fullName,
            snapshotMessage,
          });
          setScheduleCharge(null);
          toast.success("Agendamento aprovado e salvo.");
        }}
      />
    </div>
  );
}
