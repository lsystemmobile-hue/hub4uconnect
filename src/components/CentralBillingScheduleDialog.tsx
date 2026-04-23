import { useEffect, useRef, useState } from "react";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/modules/central-cobranca/lib";
import type { Charge } from "@/modules/central-cobranca/types";

const DEFAULT_MESSAGE =
  "Olá, {{nome}}! Identificamos um boleto em aberto no valor de {{valor}} com vencimento em {{data}}. Por favor, efetue o pagamento para evitar juros.";

interface Props {
  open: boolean;
  charge: Charge | null;
  activeTemplateContent?: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: { scheduledFor: string; approvalNote: string; snapshotMessage: string }) => Promise<void> | void;
}

export function CentralBillingScheduleDialog({ open, charge, activeTemplateContent, onOpenChange, onConfirm }: Props) {
  const [scheduledFor, setScheduledFor] = useState("");
  const [approvalNote, setApprovalNote] = useState("");
  const [snapshotMessage, setSnapshotMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!open) setIsSubmitting(false);
  }, [open]);

  useEffect(() => {
    if (charge) {
      const template = activeTemplateContent || charge.message_preview || DEFAULT_MESSAGE;
      const message = template
        .replace("{{nome}}", charge.customer_name)
        .replace("{{valor}}", formatCurrency(charge.amount_cents))
        .replace("{{data}}", formatDate(charge.due_date));
      setSnapshotMessage(message);
      const suggestedUtc = charge.suggested_send_time ?? new Date(Date.now() + 86_400_000).toISOString();
      // Converte UTC → horário local do browser para o input datetime-local
      const d = new Date(suggestedUtc);
      const pad = (n: number) => String(n).padStart(2, "0");
      const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      setScheduledFor(local);
      setApprovalNote("Envio aprovado após revisão manual do financeiro.");
    }
  }, [charge, activeTemplateContent]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Agendar cobrança aprovada</DialogTitle>
          <DialogDescription>
            O agendamento executa automaticamente só porque a revisão e a aprovação aconteceram agora.
          </DialogDescription>
        </DialogHeader>

        {charge ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="scheduled-for">Data e horário</Label>
                <Input
                  id="scheduled-for"
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={(event) => setScheduledFor(event.target.value)}
                />
              </div>

              <div className="rounded-xl border bg-muted/40 p-4 text-sm">
                <p className="font-medium">{charge.customer_name}</p>
                <p className="mt-1 text-muted-foreground">{charge.whatsapp_phone}</p>
                <p className="mt-2 text-primary">
                  Sugestão da IA: melhor janela às{" "}
                  {new Date(charge.suggested_send_time).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="approval-note">Nota de aprovação</Label>
              <Textarea id="approval-note" value={approvalNote} onChange={(event) => setApprovalNote(event.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="snapshot-message">Snapshot da mensagem</Label>
              <Textarea
                id="snapshot-message"
                value={snapshotMessage}
                onChange={(event) => setSnapshotMessage(event.target.value)}
                className="min-h-[140px]"
              />
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={!charge || !scheduledFor || !approvalNote.trim() || isSubmitting}
            onClick={async () => {
              if (isSubmitting) return;
              setIsSubmitting(true);
              try {
                await onConfirm({
                  scheduledFor: new Date(scheduledFor).toISOString(),
                  approvalNote,
                  snapshotMessage,
                });
              } catch (err) {
                const msg = err instanceof Error ? err.message : "Erro desconhecido";
                toast.error(`Erro ao agendar: ${msg}`);
              } finally {
                if (mountedRef.current) setIsSubmitting(false);
              }
            }}
          >
            <CalendarClock className="mr-2 h-4 w-4" />
            {isSubmitting ? "Salvando..." : "Salvar agendamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
