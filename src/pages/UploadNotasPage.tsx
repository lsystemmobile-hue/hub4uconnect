import { useCallback, useState } from "react";
import { Upload, FileText, CheckCircle, AlertCircle, Trash2, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DocumentoBadge, StatusBadge } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useNotas } from "@/hooks/use-notas";
import { formatCurrency, formatDate, getNotaPrimaryLabel, resolveTipoArquivo } from "@/lib/notas";

export default function UploadNotasPage() {
  const [dragOver, setDragOver] = useState(false);
  const { uploads, notas, addFiles, deleteUpload, clearUploads } = useNotas();

  const handleFiles = useCallback(
    async (files: File[]) => {
      const validFiles = files.filter((file) => resolveTipoArquivo(file));
      const invalidFiles = files.filter((file) => !resolveTipoArquivo(file));

      if (invalidFiles.length > 0) {
        toast({
          title: "Arquivos ignorados",
          description: "Somente arquivos CSV são aceitos.",
        });
      }

      if (validFiles.length === 0) {
        return;
      }

      await addFiles(validFiles);
    },
    [addFiles],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setDragOver(false);
      void handleFiles(Array.from(event.dataTransfer.files));
    },
    [handleFiles],
  );

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!event.target.files) {
        return;
      }

      void handleFiles(Array.from(event.target.files));
      event.target.value = "";
    },
    [handleFiles],
  );

  const handleRemove = (uploadId: string) => {
    deleteUpload(uploadId);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Upload de Notas</h1>
        <p className="text-muted-foreground">Envie arquivos CSV para processamento das notas fiscais</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={cn(
              "cursor-pointer rounded-xl border-2 border-dashed p-12 text-center transition-colors",
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
            )}
            onClick={() => document.getElementById("file-input")?.click()}
          >
            <Upload className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">Arraste arquivos aqui ou clique para selecionar</p>
            <p className="mt-2 text-sm text-muted-foreground">Formato aceito: CSV (.csv)</p>
            <input
              id="file-input"
              type="file"
              className="hidden"
              multiple
              accept=".csv"
              onChange={handleFileSelect}
            />
          </div>
        </CardContent>
      </Card>

      {uploads.length > 0 ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-base">Historico de uploads ({uploads.length})</CardTitle>
              <Button variant="destructive" size="sm" onClick={clearUploads}>
                <Trash2 className="h-4 w-4" />
                Limpar todos
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {uploads.map((upload) => {
              const nota = notas.find((currentNota) => currentNota.id === upload.nota_id);
              const totalNotas = upload.registros_processados ?? upload.nota_ids?.length ?? (upload.nota_id ? 1 : 0);

              return (
                <div key={upload.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <FileText className="h-8 w-8 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{upload.nome_arquivo}</p>
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        {upload.tamanho_bytes ? `${(upload.tamanho_bytes / 1024).toFixed(0)} KB` : "Arquivo"}
                      </Badge>
                      {nota?.documento_tipo ? <DocumentoBadge tipo={nota.documento_tipo} /> : null}
                      {nota ? <StatusBadge status={nota.status_analise} /> : null}
                    </div>

                    {nota ? (
                      <div className="mt-1 text-xs text-muted-foreground">
                        <p>{getNotaPrimaryLabel(nota)}</p>
                        <p>
                          {nota.data_emissao ? formatDate(nota.data_emissao) : "Data de emissao nao identificada"}
                          {" - "}
                          {nota.valor_total !== undefined ? formatCurrency(nota.valor_total) : "Valor nao identificado"}
                        </p>
                      </div>
                    ) : null}

                    {upload.tipo_arquivo === "csv" && totalNotas > 1 ? (
                      <p className="mt-1 text-xs text-muted-foreground">{totalNotas} notas importadas deste CSV</p>
                    ) : null}

                    {upload.status_processamento === "processando" ? (
                      <p className="mt-1 text-xs text-primary">Processando arquivo...</p>
                    ) : null}

                    {upload.status_processamento === "concluido" ? (
                      <div className="mt-1 flex items-center gap-1 text-success">
                        <CheckCircle className="h-3 w-3" />
                        <span className="text-xs">
                          {nota?.status_analise === "pendente"
                            ? "Arquivo registrado para revisao"
                            : "Arquivo processado com sucesso"}
                        </span>
                      </div>
                    ) : null}

                    {upload.status_processamento === "erro" ? (
                      <div className="mt-1 flex items-center gap-1 text-destructive">
                        <AlertCircle className="h-3 w-3" />
                        <span className="text-xs">{upload.mensagem_erro ?? "Erro no processamento"}</span>
                      </div>
                    ) : null}
                  </div>

                  <button
                    onClick={() => handleRemove(upload.id)}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Nenhum upload registrado ainda. Os arquivos enviados aparecerao aqui e continuarao disponiveis neste navegador.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
