import { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { buildMessagePreview } from "@/modules/central-cobranca/lib";
import type { Charge } from "@/modules/central-cobranca/types";

interface Props {
  open: boolean;
  charge: Charge | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: { scheduledFor: string; approvalNote: string; snapshotMessage: string }) => void;
}

export function CentralBillingScheduleDialog({ open, charge, onOpenChange, onConfirm }: Props) {
  const [scheduledFor, setScheduledFor] = useState("");
  const [approvalNote, setApprovalNote] = useState("");
  const [snapshotMessage, setSnapshotMessage] = useState("");

  useEffect(() => {
    if (charge) {
      setSnapshotMessage(buildMessagePreview(charge).message);
      setScheduledFor(charge.suggested_send_time.slice(0, 16));
      setApprovalNote("Envio aprovado após revisão manual do financeiro.");
    }
  }, [charge]);

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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() =>
              onConfirm({
                scheduledFor: new Date(scheduledFor).toISOString(),
                approvalNote,
                snapshotMessage,
              })
            }
            disabled={!charge || !scheduledFor || !approvalNote.trim()}
          >
            <CalendarClock className="mr-2 h-4 w-4" />
            Salvar agendamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
