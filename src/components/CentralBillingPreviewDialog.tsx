import { useEffect, useState } from "react";
import { ExternalLink, Send, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { buildMessagePreview } from "@/modules/central-cobranca/lib";
import type { Charge } from "@/modules/central-cobranca/types";

interface Props {
  open: boolean;
  charge: Charge | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (message: string) => void;
}

export function CentralBillingPreviewDialog({ open, charge, onOpenChange, onConfirm }: Props) {
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (charge) {
      setMessage(buildMessagePreview(charge).message);
    }
  }, [charge]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Revisar envio via WhatsApp</DialogTitle>
          <DialogDescription>
            Nenhuma mensagem sai automaticamente. Revise o texto, confira o boleto e confirme manualmente.
          </DialogDescription>
        </DialogHeader>

        {charge ? (
          <div className="space-y-4">
            <div className="rounded-xl border bg-muted/40 p-4 text-sm">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Controle obrigatório antes do envio
              </div>
              <p className="mt-2 text-muted-foreground">
                Cliente: {charge.customer_name} | WhatsApp: {charge.whatsapp_phone}
              </p>
            </div>

            <Textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className="min-h-[180px]"
              placeholder="Mensagem da cobrança"
            />

            <div className="rounded-xl border p-4">
              <p className="text-sm font-medium">Boleto anexado</p>
              <p className="mt-1 text-sm text-muted-foreground">{charge.boleto_number}</p>
              <Button asChild variant="outline" size="sm" className="mt-3">
                <a href={charge.boleto_pdf_url} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Visualizar PDF
                </a>
              </Button>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => onConfirm(message)} disabled={!charge}>
            <Send className="mr-2 h-4 w-4" />
            Confirmar envio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
