import { useEffect, useRef, useState } from "react";
import { Send, ShieldCheck, FileText, ExternalLink, X, CheckCircle2, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate } from "@/modules/central-cobranca/lib";
import type { Charge } from "@/modules/central-cobranca/types";

const DEFAULT_MESSAGE =
  "Olá, {{nome}}! Identificamos um boleto em aberto no valor de {{valor}} com vencimento em {{data}}. Por favor, efetue o pagamento para evitar juros.";

function buildPreviewMessage(charge: Charge, activeTemplateContent?: string): string {
  const template = activeTemplateContent || charge.message_preview || DEFAULT_MESSAGE;
  return template
    .replace("{{nome}}", charge.customer_name)
    .replace("{{valor}}", formatCurrency(charge.amount_cents))
    .replace("{{data}}", formatDate(charge.due_date));
}

// Etapas de progresso baseadas nos tempos reais da Edge Function
const STEPS = [
  { label: "Verificando cobrança...",         at: 0   },
  { label: "Baixando boleto (PDF)...",         at: 3   },
  { label: "Preparando envio via WhatsApp...", at: 10  },
  { label: "Aguardando confirmação da API...", at: 20  },
  { label: "Renovando URL do boleto (Omie)...",at: 35  },
  { label: "Regenerando boleto no Omie...",    at: 65  },
  { label: "Finalizando envio...",             at: 90  },
];

function SendingProgress({ hasBoleto }: { hasBoleto: boolean }) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setElapsed(0);
    intervalRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  // Filtra etapas relevantes (sem boleto pula etapas de PDF/Omie)
  const steps = hasBoleto ? STEPS : STEPS.filter((s) => !s.label.includes("PDF") && !s.label.includes("Omie") && !s.label.includes("boleto"));

  const currentStepIndex = steps.reduce((acc, step, i) => (elapsed >= step.at ? i : acc), 0);
  const progressPct = Math.min((elapsed / 110) * 100, 95); // 110s = pior caso

  return (
    <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
      {/* Barra de progresso */}
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-1000 ease-linear"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Etapas */}
      <div className="space-y-1.5">
        {steps.map((step, i) => {
          const done = i < currentStepIndex;
          const active = i === currentStepIndex;
          const pending = i > currentStepIndex;
          return (
            <div
              key={step.label}
              className={`flex items-center gap-2.5 text-sm transition-all duration-300 ${
                done    ? "text-muted-foreground" :
                active  ? "text-foreground font-medium" :
                          "text-muted-foreground/40"
              }`}
            >
              {done   ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" /> :
               active ? <Loader2 className="h-3.5 w-3.5 shrink-0 text-primary animate-spin" /> :
                        <Clock className="h-3.5 w-3.5 shrink-0 opacity-30" />}
              <span>{step.label}</span>
              {done && <span className="ml-auto text-xs text-green-600">✓</span>}
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground pt-1">
        {elapsed}s — Por favor aguarde, o processo pode levar até 2 minutos.
      </p>
    </div>
  );
}

interface Props {
  open: boolean;
  charge: Charge | null;
  activeTemplateContent?: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: (message: string) => Promise<void> | void;
}

function BoletoViewerModal({ url, open, onOpenChange }: { url: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Visualizar Boleto
          </DialogTitle>
          <DialogDescription>
            Clique no botão abaixo para abrir o boleto em uma nova aba do navegador.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 rounded-xl border bg-muted/30 py-8 px-6 text-center">
          <FileText className="h-12 w-12 text-primary/60" />
          <div className="space-y-1">
            <p className="font-medium text-foreground">Boleto disponível</p>
            <p className="text-sm text-muted-foreground break-all">{url}</p>
          </div>
          <Button asChild size="lg">
            <a href={url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Abrir boleto em nova aba
            </a>
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="mr-2 h-4 w-4" />
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CentralBillingPreviewDialog({ open, charge, activeTemplateContent, onOpenChange, onConfirm }: Props) {
  const [message, setMessage] = useState("");
  const [boletoViewerOpen, setBoletoViewerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (charge) {
      setMessage(buildPreviewMessage(charge, activeTemplateContent));
    }
  }, [charge, activeTemplateContent]);

  // Limpa estado ao fechar o modal
  useEffect(() => {
    if (!open) {
      setIsSubmitting(false);
      setBoletoViewerOpen(false);
    }
  }, [open]);

  async function handleConfirm() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onConfirm(message);
    } finally {
      if (mountedRef.current) setIsSubmitting(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => { if (!isSubmitting) onOpenChange(next); }}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Revisar envio via WhatsApp</DialogTitle>
            <DialogDescription>
              Nenhuma mensagem sai automaticamente. Revise o texto, confira o boleto e confirme manualmente.
            </DialogDescription>
          </DialogHeader>

          {charge ? (
            <div className="space-y-4">
              {/* Painel de progresso — exibido durante envio */}
              {isSubmitting ? (
                <SendingProgress hasBoleto={Boolean(charge.boleto_pdf_url)} />
              ) : (
                <>
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

                  {charge.boleto_pdf_url ? (
                    <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-primary" />
                        <div>
                          <p className="text-sm font-medium">Boleto anexado</p>
                          {charge.boleto_number && (
                            <p className="text-xs text-muted-foreground">{charge.boleto_number}</p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setBoletoViewerOpen(true)}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        Visualizar Boleto
                      </Button>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          ) : null}

          <DialogFooter className="flex-row justify-end gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button onClick={() => void handleConfirm()} disabled={!charge || isSubmitting}>
              <Send className="mr-2 h-4 w-4" />
              {isSubmitting ? "Aguarde..." : "Confirmar envio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {charge?.boleto_pdf_url && (
        <BoletoViewerModal
          url={charge.boleto_pdf_url}
          open={boletoViewerOpen}
          onOpenChange={setBoletoViewerOpen}
        />
      )}
    </>
  );
}
