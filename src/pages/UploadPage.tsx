import { useState, useCallback } from "react";
import { Upload, FileText, CheckCircle, AlertCircle, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface UploadFile {
  id: string;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: "uploading" | "processing" | "done" | "error";
}

export default function UploadPage() {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const simulateUpload = useCallback((file: File) => {
    const id = Math.random().toString(36).slice(2);
    const uf: UploadFile = { id, name: file.name, size: file.size, type: file.type, progress: 0, status: "uploading" };
    setFiles((prev) => [uf, ...prev]);

    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 30;
      if (p >= 100) {
        p = 100;
        clearInterval(interval);
        setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, progress: 100, status: "processing" } : f)));
        setTimeout(() => {
          const success = Math.random() > 0.15;
          setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, status: success ? "done" : "error" } : f)));
        }, 1500);
      } else {
        setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, progress: Math.min(p, 100) } : f)));
      }
    }, 300);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    Array.from(e.dataTransfer.files).forEach(simulateUpload);
  }, [simulateUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) Array.from(e.target.files).forEach(simulateUpload);
  }, [simulateUpload]);

  const removeFile = (id: string) => setFiles((prev) => prev.filter((f) => f.id !== id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Upload de Notas</h1>
        <p className="text-muted-foreground">Envie arquivos CSV, PDF ou imagens de notas fiscais</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={cn(
              "border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer",
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            )}
            onClick={() => document.getElementById("file-input")?.click()}
          >
            <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Arraste arquivos aqui ou clique para selecionar</p>
            <p className="text-sm text-muted-foreground mt-2">CSV, PDF, JPG, PNG • Múltiplos arquivos</p>
            <input id="file-input" type="file" className="hidden" multiple accept=".csv,.pdf,.jpg,.jpeg,.png" onChange={handleFileSelect} />
          </div>
        </CardContent>
      </Card>

      {files.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Arquivos ({files.length})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {files.map((f) => (
              <div key={f.id} className="flex items-center gap-3 p-3 rounded-lg border">
                <FileText className="h-8 w-8 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{f.name}</p>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {(f.size / 1024).toFixed(0)} KB
                    </Badge>
                  </div>
                  {f.status === "uploading" && <Progress value={f.progress} className="h-1.5 mt-2" />}
                  {f.status === "processing" && <p className="text-xs text-primary mt-1">Processando com IA...</p>}
                  {f.status === "done" && (
                    <div className="flex items-center gap-1 mt-1 text-success">
                      <CheckCircle className="h-3 w-3" />
                      <span className="text-xs">Processado com sucesso</span>
                    </div>
                  )}
                  {f.status === "error" && (
                    <div className="flex items-center gap-1 mt-1 text-destructive">
                      <AlertCircle className="h-3 w-3" />
                      <span className="text-xs">Erro no processamento</span>
                    </div>
                  )}
                </div>
                <button onClick={() => removeFile(f.id)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

