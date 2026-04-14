import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, FileText, AlertTriangle, Brain, Package, Receipt, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertaBadge, DocumentoBadge, StatusBadge, TipoBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useNotas } from "@/hooks/use-notas";
import { countActiveAlerts, formatCurrency, formatDate, getNotaPrimaryLabel } from "@/lib/notas";

export default function NotaDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notas } = useNotas();
  const nota = notas.find((currentNota) => currentNota.id === id);

  if (!nota) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Nota nao encontrada.</p>
        <Button onClick={() => navigate("/notas")}>Voltar</Button>
      </div>
    );
  }

  const isNfse = nota.documento_tipo === "nfse";
  const nfseData = nota.nfse_data;
  const csvData = nota.csv_data;
  const isCsvImported = nota.tipo_arquivo === "csv" && Boolean(csvData);

  /** Renderiza apenas se tiver valor — sem "Não identificado" */
  const Field = ({ label, value }: { label: string; value?: string | null }) => {
    if (!value) return null;
    return (
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/notas")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">{getNotaPrimaryLabel(nota)}</h1>
            {nota.documento_tipo ? <DocumentoBadge tipo={nota.documento_tipo} /> : null}
            <StatusBadge status={nota.status_analise} />
            <TipoBadge tipo={nota.tipo_arquivo} />
          </div>
          <p className="text-sm text-muted-foreground">{nota.emitente_nome ?? nota.nome_arquivo}</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            Dados Principais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isCsvImported && csvData ? (
            // ── Modo CSV: somente dados extraídos do arquivo CSV ──
            <>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-4">
                <Field label="Número" value={csvData.numero} />
                <Field label="Data Emissão" value={nota.data_emissao ? formatDate(nota.data_emissao) : csvData.emissao_original} />
                <Field label="Valor Total" value={nota.valor_total !== undefined ? formatCurrency(nota.valor_total) : undefined} />
                <Field label="UF" value={csvData.uf} />
              </div>
              {(csvData.emitente_nome || csvData.emitente_cnpj || csvData.tomador_nome || csvData.tomador_cnpj) && (
                <>
                  <Separator className="my-2" />
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {(csvData.emitente_nome || csvData.emitente_cnpj) && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground">Prestador</p>
                        <Field label="Razão Social" value={csvData.emitente_nome} />
                        <Field label="CPF/CNPJ" value={csvData.emitente_cnpj} />
                      </div>
                    )}
                    {(csvData.tomador_nome || csvData.tomador_cnpj) && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground">Tomador</p>
                        <Field label="Razão Social" value={csvData.tomador_nome} />
                        <Field label="CPF/CNPJ" value={csvData.tomador_cnpj} />
                      </div>
                    )}
                  </div>
                </>
              )}
              {csvData.codigo_verificacao && (
                <>
                  <Separator className="my-2" />
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">Código de Verificação</p>
                    <p className="break-all rounded bg-muted p-2 font-mono text-xs">{csvData.codigo_verificacao}</p>
                  </div>
                </>
              )}
            </>
          ) : (
            // ── Modo XML (NFe ou NFSe): apenas campos com valor real extraído ──
            <>
              {(nota.numero_nota || nota.serie || nota.data_emissao || nota.valor_total !== undefined) && (
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-4">
                  <Field label="Número" value={nota.numero_nota} />
                  <Field label="Série" value={nota.serie} />
                  <Field label="Data Emissão" value={nota.data_emissao ? formatDate(nota.data_emissao) : undefined} />
                  <Field label="Valor Total" value={nota.valor_total !== undefined ? formatCurrency(nota.valor_total) : undefined} />
                </div>
              )}
              {(nota.emitente_nome || nota.emitente_cnpj || nota.destinatario_nome || nota.destinatario_cnpj) && (
                <>
                  <Separator className="my-2" />
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {(nota.emitente_nome || nota.emitente_cnpj) && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground">{isNfse ? "Prestador" : "Emitente"}</p>
                        <Field label="Razão Social" value={nota.emitente_nome} />
                        <Field label="CNPJ" value={nota.emitente_cnpj} />
                        <Field label={isNfse ? "Inscrição Municipal" : "IE"} value={nota.emitente_ie} />
                        <Field label="Endereço" value={nota.emitente_endereco} />
                      </div>
                    )}
                    {(nota.destinatario_nome || nota.destinatario_cnpj) && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground">{isNfse ? "Tomador" : "Destinatário"}</p>
                        <Field label="Razão Social" value={nota.destinatario_nome} />
                        <Field label={isNfse ? "CPF/CNPJ" : "CNPJ"} value={nota.destinatario_cnpj} />
                      </div>
                    )}
                  </div>
                </>
              )}
              {isNfse && nfseData ? (
                <>
                  <Separator className="my-2" />
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-4">
                    <Field label="Competência" value={nfseData.competencia ? formatDate(nfseData.competencia) : undefined} />
                    <Field label="Município Emissão" value={nfseData.municipio_emissao} />
                    <Field label="Município Prestação" value={nfseData.municipio_prestacao} />
                    <Field label="Status NFSe" value={nfseData.status} />
                  </div>
                </>
              ) : nota.chave_acesso ? (
                <>
                  <Separator className="my-2" />
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">Chave de Acesso</p>
                    <p className="break-all rounded bg-muted p-2 font-mono text-xs">{nota.chave_acesso}</p>
                  </div>
                </>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      {isCsvImported && csvData ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4" />
              Dados do CSV
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-semibold text-muted-foreground">Emitente</p>
                <Field label="Razao Social" value={csvData.emitente_nome} />
                <Field label="CPF/CNPJ" value={csvData.emitente_cnpj} />
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold text-muted-foreground">Tomador</p>
                <Field label="Razao Social" value={csvData.tomador_nome} />
                <Field label="CPF/CNPJ" value={csvData.tomador_cnpj} />
              </div>
            </div>
          </CardContent>
        </Card>
      ) : isNfse && nfseData ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4" />
              Dados NFSe
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-semibold text-muted-foreground">Prestador</p>
                <Field label="Nome Fantasia" value={nfseData.prestador.nome_fantasia} />
                <Field label="Email" value={nfseData.prestador.email} />
                <Field label="Endereco Completo" value={nfseData.prestador.endereco_completo} />
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold text-muted-foreground">Tomador</p>
                <Field label="Email" value={nfseData.tomador.email} />
                <Field label="Endereco Completo" value={nfseData.tomador.endereco_completo} />
                <Field label="Documento" value={nfseData.tomador.cpf_cnpj} />
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4" />
            {isNfse ? `Servico / Itens (${nota.itens.length})` : `Produtos / Itens (${nota.itens.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {nota.itens.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descricao</TableHead>
                  <TableHead className="hidden md:table-cell">Codigo</TableHead>
                  <TableHead className="hidden lg:table-cell">Referencia</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead className="text-right">Unitario</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nota.itens.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="max-w-[250px]">
                      <p className="truncate text-sm">{item.descricao ?? "Descricao nao identificada"}</p>
                      {item.codigo_produto ? (
                        <p className="text-xs text-muted-foreground">Cod: {item.codigo_produto}</p>
                      ) : null}
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground md:table-cell">{item.codigo_produto || "-"}</TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">{item.ncm || item.cfop || "-"}</TableCell>
                    <TableCell className="text-right text-sm">
                      {item.quantidade !== undefined ? `${item.quantidade} ${item.unidade ?? ""}`.trim() : "Nao identificada"}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {item.valor_unitario !== undefined ? formatCurrency(item.valor_unitario) : "Nao identificado"}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {item.valor_total !== undefined ? formatCurrency(item.valor_total) : "Nao identificado"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-6 text-sm text-muted-foreground">
              {isNfse ? "Nenhum servico foi identificado para esta nota." : "Nenhum item foi identificado para esta nota."}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Receipt className="h-4 w-4" />
            {isNfse ? "Valores e Tributos do Servico" : "Tributos"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isNfse && nfseData ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
              <Field label="Valor Servico" value={nfseData.valores.valor_servico !== null ? formatCurrency(nfseData.valores.valor_servico) : undefined} />
              <Field label="Base de Calculo" value={nfseData.valores.base_calculo !== null ? formatCurrency(nfseData.valores.base_calculo) : undefined} />
              <Field label="ISSQN" value={nfseData.valores.issqn !== null ? formatCurrency(nfseData.valores.issqn) : undefined} />
              <Field label="Total Retido" value={nfseData.valores.valor_total_retido !== null ? formatCurrency(nfseData.valores.valor_total_retido) : undefined} />
              <div>
                <p className="text-xs text-muted-foreground">Valor Liquido</p>
                <p className="text-lg font-bold text-primary">
                  {nfseData.valores.valor_liquido !== null ? formatCurrency(nfseData.valores.valor_liquido) : "Nao identificado"}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
                <Field label="Base ICMS" value={nota.base_calculo_icms !== undefined ? formatCurrency(nota.base_calculo_icms) : undefined} />
                <Field label="ICMS" value={nota.icms !== undefined ? formatCurrency(nota.icms) : undefined} />
                <Field label="IPI" value={nota.ipi !== undefined ? formatCurrency(nota.ipi) : undefined} />
                <Field label="PIS" value={nota.pis !== undefined ? formatCurrency(nota.pis) : undefined} />
                <Field label="COFINS" value={nota.cofins !== undefined ? formatCurrency(nota.cofins) : undefined} />
                <Field label="Frete" value={nota.valor_frete !== undefined ? formatCurrency(nota.valor_frete) : undefined} />
              </div>
              <Separator className="my-4" />
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <Field label="Valor Produtos" value={nota.valor_produtos !== undefined ? formatCurrency(nota.valor_produtos) : undefined} />
                <Field label="Valor Impostos" value={nota.valor_impostos !== undefined ? formatCurrency(nota.valor_impostos) : undefined} />
                <Field label="Descontos" value={nota.valor_desconto !== undefined ? formatCurrency(nota.valor_desconto) : undefined} />
                <div>
                  <p className="text-xs text-muted-foreground">Valor Total</p>
                  <p className="text-lg font-bold text-primary">
                    {nota.valor_total !== undefined ? formatCurrency(nota.valor_total) : "Nao identificado"}
                  </p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="h-4 w-4 text-primary" />
            Resumo automatico
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-primary/5 p-4">
            <p className="text-sm leading-relaxed">
              {nota.resumo_ia ?? "Nenhum resumo disponivel para este arquivo."}
            </p>
          </div>
        </CardContent>
      </Card>

      {nota.alertas.length > 0 ? (
        <Card className="border-destructive/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Alertas ({countActiveAlerts(nota)} ativos / {nota.alertas.length} total)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {nota.alertas.map((alerta) => (
              <div
                key={alerta.id}
                className="flex items-start gap-3 rounded-lg border border-destructive/10 bg-destructive/5 p-3"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <AlertaBadge tipo={alerta.tipo_alerta} />
                    <Badge variant={alerta.status === "ativo" ? "destructive" : "secondary"}>{alerta.status}</Badge>
                  </div>
                  <p className="text-sm">{alerta.descricao}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
