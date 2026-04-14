import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, Trash2, CheckCircle, Download, Eye, Settings, RotateCcw, TestTube2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { StatusBadge, TipoBadge } from "@/components/StatusBadge";
import { toast } from "@/hooks/use-toast";
import { useNotas } from "@/hooks/use-notas";
import { useAssistantConfig } from "@/hooks/use-assistant-config";
import {
  AI_PROVIDER_OPTIONS,
  getDefaultAiConfig,
  getDefaultModel,
  normalizeAiConfig,
  testAiConnection,
  type AiConfig,
  type AiProviderId,
} from "@/lib/assistant";
import { countActiveAlerts, formatDate, getNotaPrimaryLabel } from "@/lib/notas";

export default function AdminNotesPage() {
  const navigate = useNavigate();
  const { notas: allNotas, uploads, deleteNota, exportCsv, reprocessNota, resolveAlertas } = useNotas();
  const { config, setConfig, resetConfig, hydrated } = useAssistantConfig();
  const [statusFilter, setStatusFilter] = useState("todos");
  const [configOpen, setConfigOpen] = useState(false);
  const [draftConfig, setDraftConfig] = useState<AiConfig>(() => config);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    setDraftConfig(config);
  }, [config]);

  const notas =
    statusFilter === "todos"
      ? allNotas
      : allNotas.filter((nota) => nota.status_analise === statusFilter);

  const selectedProvider = useMemo(
    () => AI_PROVIDER_OPTIONS.find((option) => option.value === draftConfig.provider) ?? AI_PROVIDER_OPTIONS[0],
    [draftConfig.provider],
  );

  const handleExport = () => {
    exportCsv(notas.map((nota) => nota.id), "resumo-iob-admin.csv");
  };

  const handleDelete = (notaId: string, label: string) => {
    deleteNota(notaId);
    toast({
      title: "Nota removida",
      description: `${label} foi excluída deste navegador.`,
    });
  };

  const handleResolve = (notaId: string, label: string) => {
    resolveAlertas(notaId);
    toast({
      title: "Alertas resolvidos",
      description: `Os alertas de ${label} foram marcados como resolvidos.`,
    });
  };

  const handleReprocess = async (notaId: string, label: string) => {
    const ok = await reprocessNota(notaId);

    toast({
      title: ok ? "Reprocessamento concluído" : "Reprocessamento indisponível",
      description: ok
        ? `${label} foi reprocessada a partir do CSV salvo.`
        : `Não foi possível reprocessar ${label}.`,
    });
  };

  const canReprocess = (notaId: string) =>
    uploads.some(
      (upload) =>
        upload.tipo_arquivo === "csv" &&
        (upload.nota_id === notaId || upload.nota_ids?.includes(notaId)) &&
        Boolean(upload.conteudo_original),
    );

  const handleProviderChange = (provider: AiProviderId) => {
    setDraftConfig((current) => {
      const currentDefault = getDefaultModel(current.provider);
      const nextDefault = getDefaultModel(provider);
      return {
        ...current,
        provider,
        model: !current.model || current.model === currentDefault ? nextDefault : current.model,
      };
    });
  };

  const handleSaveAssistantConfig = async () => {
    setSaving(true);
    try {
      const normalized = normalizeAiConfig(draftConfig);
      setConfig(normalized);
      setConfigOpen(false);
      toast({
        title: "Configuração salva",
        description: `Assistente configurado para ${normalized.provider.toUpperCase()}.`,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    const normalized = normalizeAiConfig(draftConfig);
    if (!normalized.apiKey || !normalized.model) {
      toast({
        title: "Preencha a configuração",
        description: "Informe provider, modelo e chave da API antes de testar.",
      });
      return;
    }

    setTesting(true);
    try {
      const result = await testAiConnection(normalized, allNotas);
      toast({
        title: "Conexão bem-sucedida",
        description: result.slice(0, 140),
      });
    } catch (error) {
      toast({
        title: "Falha na conexão",
        description: error instanceof Error ? error.message : "Não foi possível testar a API.",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleResetAssistantConfig = () => {
    resetConfig();
    setDraftConfig(getDefaultAiConfig());
    toast({
      title: "Configuração limpa",
      description: "A configuração de IA foi restaurada para o padrão local.",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Administração</h1>
          <p className="text-muted-foreground">Gerencie notas fiscais e processamentos</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled={notas.length === 0} onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Exportar Resumo IOB
          </Button>

          <Dialog open={configOpen} onOpenChange={setConfigOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="mr-2 h-4 w-4" />
                Configurar IA
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Configuração da IA</DialogTitle>
                <DialogDescription>
                  A configuração fica escondida por padrão e é usada pelo chat das notas fiscais neste navegador.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 pt-2">
                <div className="flex justify-end">
                  <Badge variant={hydrated && draftConfig.apiKey && draftConfig.model ? "default" : "secondary"}>
                    {hydrated && draftConfig.apiKey && draftConfig.model ? `${selectedProvider.label} ativo` : "Sem API configurada"}
                  </Badge>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="assistant-provider">Provider</Label>
                    <Select value={draftConfig.provider} onValueChange={(value) => handleProviderChange(value as AiProviderId)}>
                      <SelectTrigger id="assistant-provider" className="h-10">
                        <SelectValue placeholder="Selecione o provider" />
                      </SelectTrigger>
                      <SelectContent>
                        {AI_PROVIDER_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">{selectedProvider.description}</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="assistant-model">Modelo</Label>
                    <Input
                      id="assistant-model"
                      value={draftConfig.model}
                      onChange={(event) =>
                        setDraftConfig((current) => ({
                          ...current,
                          model: event.target.value,
                        }))
                      }
                      placeholder={selectedProvider.defaultModel}
                    />
                    <p className="text-xs text-muted-foreground">Sugestão: {selectedProvider.defaultModel}</p>
                  </div>

                  <div className="space-y-2 lg:col-span-2">
                    <Label htmlFor="assistant-api-key">API Key</Label>
                    <Input
                      id="assistant-api-key"
                      type="password"
                      value={draftConfig.apiKey}
                      onChange={(event) =>
                        setDraftConfig((current) => ({
                          ...current,
                          apiKey: event.target.value,
                        }))
                      }
                      placeholder="Cole sua chave da API aqui"
                      autoComplete="off"
                    />
                    <p className="text-xs text-muted-foreground">
                      Para Groq, use a chave criada na plataforma Groq. Para OpenAI e Gemini, use a chave correspondente do provedor.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:col-span-2">
                    <Button onClick={() => void handleSaveAssistantConfig()} disabled={saving}>
                      {saving ? "Salvando..." : "Salvar configuração"}
                    </Button>
                    <Button variant="outline" onClick={() => void handleTestConnection()} disabled={testing}>
                      <TestTube2 className="mr-2 h-4 w-4" />
                      {testing ? "Testando..." : "Testar conexão"}
                    </Button>
                    <Button variant="ghost" onClick={handleResetAssistantConfig}>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Limpar configuração
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Processadas", value: allNotas.filter((nota) => nota.status_analise === "processado").length, color: "text-success" },
          { label: "Pendentes", value: allNotas.filter((nota) => nota.status_analise === "pendente").length, color: "text-warning" },
          { label: "Com Erro", value: allNotas.filter((nota) => nota.status_analise === "erro").length, color: "text-destructive" },
          { label: "Inconsistentes", value: allNotas.filter((nota) => nota.status_analise === "inconsistente").length, color: "text-warning" },
        ].map((status) => (
          <Card key={status.label}>
            <CardContent className="p-4 text-center">
              <p className={`text-3xl font-bold ${status.color}`}>{status.value}</p>
              <p className="text-xs text-muted-foreground">{status.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Todas as Notas</CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="processado">Processado</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="erro">Erro</SelectItem>
                <SelectItem value="inconsistente">Inconsistente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table className="border-collapse border border-slate-300 dark:border-slate-700">
            <TableHeader>
              <TableRow className="bg-slate-100 dark:bg-slate-800">
                <TableHead className="border border-slate-300 dark:border-slate-700 font-bold text-slate-900 dark:text-slate-100">NF</TableHead>
                <TableHead className="border border-slate-300 dark:border-slate-700 font-bold text-slate-900 dark:text-slate-100">Emitente</TableHead>
                <TableHead className="border border-slate-300 dark:border-slate-700 font-bold text-slate-900 dark:text-slate-100">Data</TableHead>
                <TableHead className="border border-slate-300 dark:border-slate-700 font-bold text-slate-900 dark:text-slate-100">Status</TableHead>
                <TableHead className="border border-slate-300 dark:border-slate-700 font-bold text-slate-900 dark:text-slate-100">Tipo</TableHead>
                <TableHead className="border border-slate-300 dark:border-slate-700 font-bold text-slate-900 dark:text-slate-100">Alertas</TableHead>
                <TableHead className="text-right border border-slate-300 dark:border-slate-700 font-bold text-slate-900 dark:text-slate-100">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notas.length > 0 ? (
                notas.map((nota) => (
                  <TableRow key={nota.id} className="hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                    <TableCell className="border border-slate-300 dark:border-slate-700 font-medium">{getNotaPrimaryLabel(nota)}</TableCell>
                    <TableCell className="border border-slate-300 dark:border-slate-700 max-w-[180px] truncate">{nota.emitente_nome ?? "Não identificado"}</TableCell>
                    <TableCell className="border border-slate-300 dark:border-slate-700 text-sm">
                      {nota.data_emissao ? formatDate(nota.data_emissao) : "Não identificada"}
                    </TableCell>
                    <TableCell className="border border-slate-300 dark:border-slate-700">
                      <StatusBadge status={nota.status_analise} />
                    </TableCell>
                    <TableCell className="border border-slate-300 dark:border-slate-700">
                      <TipoBadge tipo={nota.tipo_arquivo} />
                    </TableCell>
                    <TableCell className="border border-slate-300 dark:border-slate-700">
                      {countActiveAlerts(nota) > 0 ? (
                        <span className="font-medium text-destructive">{countActiveAlerts(nota)}</span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right border border-slate-300 dark:border-slate-700">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/nf-analyzer/notas/${nota.id}`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          disabled={!canReprocess(nota.id)}
                          onClick={() => void handleReprocess(nota.id, getNotaPrimaryLabel(nota))}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        {countActiveAlerts(nota) > 0 ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-success"
                            onClick={() => handleResolve(nota.id, getNotaPrimaryLabel(nota))}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        ) : null}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDelete(nota.id, getNotaPrimaryLabel(nota))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground border border-slate-300 dark:border-slate-700">
                    Nenhuma nota foi registrada ainda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
