import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, AlertTriangle, Brain, Package, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge, TipoBadge, AlertaBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { mockNotas } from "@/data/mockData";

export default function NotaDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const nota = mockNotas.find((n) => n.id === id);

  if (!nota) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <p className="text-muted-foreground">Nota não encontrada.</p>
      <Button onClick={() => navigate("/notas")}>Voltar</Button>
    </div>
  );

  const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  const Field = ({ label, value }: { label: string; value?: string }) => (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value || "Não identificado"}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/notas")}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">NF {nota.numero_nota}</h1>
            <StatusBadge status={nota.status_analise} />
            <TipoBadge tipo={nota.tipo_arquivo} />
          </div>
          <p className="text-sm text-muted-foreground">{nota.emitente_nome}</p>
        </div>
      </div>

      {/* Dados Principais */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" />Dados Principais</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Field label="Número" value={nota.numero_nota} />
            <Field label="Série" value={nota.serie} />
            <Field label="Data Emissão" value={new Date(nota.data_emissao).toLocaleDateString("pt-BR")} />
            <Field label="Valor Total" value={fmt(nota.valor_total)} />
          </div>
          <Separator className="my-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-2 font-semibold">Emitente</p>
              <Field label="Razão Social" value={nota.emitente_nome} />
              <Field label="CNPJ" value={nota.emitente_cnpj} />
              {nota.emitente_ie && <Field label="IE" value={nota.emitente_ie} />}
              {nota.emitente_endereco && <Field label="Endereço" value={nota.emitente_endereco} />}
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2 font-semibold">Destinatário</p>
              <Field label="Razão Social" value={nota.destinatario_nome} />
              <Field label="CNPJ" value={nota.destinatario_cnpj} />
            </div>
          </div>
          <Separator className="my-4" />
          <p className="text-xs text-muted-foreground mb-1">Chave de Acesso</p>
          <p className="text-xs font-mono bg-muted p-2 rounded">{nota.chave_acesso}</p>
        </CardContent>
      </Card>

      {/* Itens */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4" />Produtos / Itens ({nota.itens.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead className="hidden md:table-cell">NCM</TableHead>
                <TableHead className="hidden lg:table-cell">CFOP</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead className="text-right">Unitário</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {nota.itens.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="max-w-[250px]">
                    <p className="text-sm truncate">{item.descricao}</p>
                    {item.codigo_produto && <p className="text-xs text-muted-foreground">Cód: {item.codigo_produto}</p>}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{item.ncm || "-"}</TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{item.cfop || "-"}</TableCell>
                  <TableCell className="text-right text-sm">{item.quantidade} {item.unidade}</TableCell>
                  <TableCell className="text-right text-sm">{fmt(item.valor_unitario)}</TableCell>
                  <TableCell className="text-right text-sm font-medium">{fmt(item.valor_total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Tributos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Receipt className="h-4 w-4" />Tributos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Field label="Base ICMS" value={fmt(nota.base_calculo_icms)} />
            <Field label="ICMS" value={fmt(nota.icms)} />
            <Field label="IPI" value={fmt(nota.ipi)} />
            <Field label="PIS" value={fmt(nota.pis)} />
            <Field label="COFINS" value={fmt(nota.cofins)} />
            <Field label="Frete" value={fmt(nota.valor_frete)} />
          </div>
          <Separator className="my-4" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Field label="Valor Produtos" value={fmt(nota.valor_produtos)} />
            <Field label="Valor Impostos" value={fmt(nota.valor_impostos)} />
            <Field label="Descontos" value={fmt(nota.valor_desconto)} />
            <div>
              <p className="text-xs text-muted-foreground">Valor Total</p>
              <p className="text-lg font-bold text-primary">{fmt(nota.valor_total)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumo IA */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Brain className="h-4 w-4 text-primary" />Resumo Inteligente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-primary/5 rounded-lg p-4">
            <p className="text-sm leading-relaxed">{nota.resumo_ia}</p>
          </div>
        </CardContent>
      </Card>

      {/* Alertas */}
      {nota.alertas.length > 0 && (
        <Card className="border-destructive/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" />Alertas ({nota.alertas.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {nota.alertas.map((a) => (
              <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/10">
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertaBadge tipo={a.tipo_alerta} />
                    <Badge variant={a.status === "ativo" ? "destructive" : "secondary"}>{a.status}</Badge>
                  </div>
                  <p className="text-sm">{a.descricao}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
