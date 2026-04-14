import { Badge } from "@/components/ui/badge";
import { DocumentoTipo, StatusAnalise, TipoArquivo, TipoAlerta } from "@/data/types";

const statusConfig: Record<StatusAnalise, { label: string; className: string }> = {
  processado: { label: "Processado", className: "bg-success text-success-foreground" },
  pendente: { label: "Pendente", className: "bg-warning text-warning-foreground" },
  erro: { label: "Erro", className: "bg-destructive text-destructive-foreground" },
  inconsistente: { label: "Inconsistente", className: "bg-warning text-warning-foreground" },
};

const tipoConfig: Record<TipoArquivo, { label: string; className: string }> = {
  xml: { label: "XML", className: "bg-primary/10 text-primary border-primary/20" },
  csv: { label: "CSV", className: "bg-sky-100 text-sky-700 border-sky-200" },
  pdf: { label: "PDF", className: "bg-destructive/10 text-destructive border-destructive/20" },
  imagem: { label: "Imagem", className: "bg-success/10 text-success border-success/20" },
};

const alertaConfig: Record<TipoAlerta, string> = {
  inconsistencia_valor: "Inconsistencia de Valor",
  campo_ausente: "Campo Ausente",
  possivel_duplicidade: "Possivel Duplicidade",
  baixa_qualidade: "Baixa Qualidade",
  estrutura_incompleta: "Estrutura Incompleta",
};

const documentoConfig: Record<DocumentoTipo, { label: string; className: string }> = {
  nfe: { label: "NFe", className: "bg-slate-100 text-slate-700 border-slate-200" },
  nfse: { label: "NFSe", className: "bg-amber-100 text-amber-800 border-amber-200" },
};

export function StatusBadge({ status }: { status: StatusAnalise }) {
  const c = statusConfig[status];
  return <Badge className={c.className}>{c.label}</Badge>;
}

export function TipoBadge({ tipo }: { tipo: TipoArquivo }) {
  const c = tipoConfig[tipo];
  return <Badge variant="outline" className={c.className}>{c.label}</Badge>;
}

export function DocumentoBadge({ tipo }: { tipo: DocumentoTipo }) {
  const c = documentoConfig[tipo];
  return <Badge variant="outline" className={c.className}>{c.label}</Badge>;
}

export function AlertaBadge({ tipo }: { tipo: TipoAlerta }) {
  return <Badge variant="destructive">{alertaConfig[tipo]}</Badge>;
}
