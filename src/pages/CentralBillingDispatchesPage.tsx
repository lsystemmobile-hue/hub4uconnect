import { useEffect, useState } from "react";
import { MessageSquareWarning, Save, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useCentralCobrancaData } from "@/hooks/use-central-cobranca";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { formatDateTime } from "@/modules/central-cobranca/lib";

export default function CentralBillingDispatchesPage() {
  const { dispatches, templates, updateTemplate, charges } = useCentralCobrancaData();

  const activeTemplate = templates.find((t) => t.active) ?? templates[0] ?? null;
  const [editingContent, setEditingContent] = useState("");
  useEffect(() => {
    if (activeTemplate && !editingContent) setEditingContent(activeTemplate.content);
  }, [activeTemplate?.id]);

  const [testPhone, setTestPhone] = useState("");
  const [testChargeId, setTestChargeId] = useState("");
  const [testSending, setTestSending] = useState(false);

  const chargesWithBoleto = charges.filter((c) => c.boleto_pdf_url);
  const chargeOptions = chargesWithBoleto.length > 0 ? chargesWithBoleto : charges.filter((c) => c.status === "pendente");

  async function handleTestSend() {
    if (!testPhone || !testChargeId) return;
    setTestSending(true);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      };
      if (isSupabaseConfigured && supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
      }
      const base = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
      try {
        const res = await fetch(`${base}/dispatch-charge`, {
          method: "POST",
          headers,
          body: JSON.stringify({ chargeId: testChargeId, testPhone }),
          signal: AbortSignal.timeout(150_000),
        });
        const data = await res.json().catch(() => ({}));
        if (data.ok) {
          toast.success("Mensagem de teste enviada com sucesso!");
        } else {
          toast.error(`Falha no envio: ${data.error ?? `HTTP ${res.status}`}`);
        }
      } catch (e) {
        toast.error(`Erro ao enviar: ${e instanceof Error ? e.message : "Timeout"}`);
      }
    } finally {
      setTestSending(false);
    }
  }

  return (
    <Tabs defaultValue="historico">
      <TabsList>
        <TabsTrigger value="historico">Histórico de envios</TabsTrigger>
        <TabsTrigger value="template">Template</TabsTrigger>
        <TabsTrigger value="teste">Envio de teste</TabsTrigger>
      </TabsList>

      {/* ── Histórico ── */}
      <TabsContent value="historico" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Histórico de envios</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {dispatches.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum envio registrado.</p>
            )}
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
      </TabsContent>

      {/* ── Template ── */}
      <TabsContent value="template" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Template utilitário ativo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeTemplate ? (
              <>
                <div className="flex items-center gap-3">
                  <p className="font-medium">{activeTemplate.name}</p>
                  <Badge variant="default">{activeTemplate.category}</Badge>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="template-content">Conteúdo</Label>
                  <Textarea
                    id="template-content"
                    className="min-h-[160px] font-mono text-sm"
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    placeholder="Use {{nome}}, {{valor}}, {{data}}. Negrito: *texto*. Quebra de linha: Enter."
                  />
                  <p className="text-xs text-muted-foreground">
                    Variáveis: <code>{"{{nome}}"}</code> <code>{"{{valor}}"}</code> <code>{"{{data}}"}</code> — Negrito WhatsApp: <code>*texto*</code>
                  </p>
                </div>
                {editingContent && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Pré-visualização</Label>
                    <div className="rounded-xl bg-muted/50 border px-4 py-3 text-sm whitespace-pre-wrap">
                      {editingContent
                        .replace("{{nome}}", "Nome do Cliente")
                        .replace("{{valor}}", "R$ 1.250,00")
                        .replace("{{data}}", "30/04/2026")}
                    </div>
                  </div>
                )}
                <Button
                  variant="outline"
                  disabled={updateTemplate.isPending || editingContent === activeTemplate.content}
                  onClick={async () => {
                    try {
                      await updateTemplate.mutateAsync({ id: activeTemplate.id, content: editingContent });
                      toast.success("Template salvo com sucesso!");
                    } catch (err) {
                      toast.error(`Erro ao salvar o template: ${err instanceof Error ? err.message : String(err)}`);
                    } finally {
                      updateTemplate.reset();
                    }
                  }}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {updateTemplate.isPending ? "Salvando..." : "Salvar template"}
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum template ativo encontrado.</p>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* ── Envio de teste ── */}
      <TabsContent value="teste" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Send className="h-4 w-4 text-primary" />
              Envio de teste
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Envia uma cobrança real para um número de teste, sem alterar o número cadastrado do cliente.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="test-phone">Número de teste (com DDD)</Label>
                <Input id="test-phone" placeholder="11999999999" value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="test-charge">Cobrança</Label>
                <Select value={testChargeId} onValueChange={setTestChargeId}>
                  <SelectTrigger id="test-charge">
                    <SelectValue placeholder="Selecione uma cobrança..." />
                  </SelectTrigger>
                  <SelectContent>
                    {chargeOptions.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.customer_name} — {c.boleto_pdf_url ? "com boleto" : "sem boleto"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button variant="outline" disabled={!testPhone || !testChargeId || testSending}
              onClick={() => void handleTestSend()}>
              <Send className={`mr-2 h-4 w-4 ${testSending ? "animate-pulse" : ""}`} />
              {testSending ? "Enviando..." : "Enviar para número de teste"}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
