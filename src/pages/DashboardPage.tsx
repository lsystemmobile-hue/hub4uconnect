import { FileText, DollarSign, Building2, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { MetricCard } from "@/components/MetricCard";
import { StatusBadge, TipoBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNotas } from "@/hooks/use-notas";
import {
  formatCurrency,
  formatDate,
  getMetrics,
  getNotaPrimaryLabel,
  getNotasByFornecedor,
  getNotasByMonth,
} from "@/lib/notas";

const COLORS = [
  "hsl(217,91%,60%)",
  "hsl(142,71%,45%)",
  "hsl(38,92%,50%)",
  "hsl(0,84%,60%)",
  "hsl(270,60%,55%)",
  "hsl(180,60%,45%)",
  "hsl(330,60%,50%)",
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { notas } = useNotas();
  const metrics = getMetrics(notas);
  const byMonth = getNotasByMonth(notas);
  const byFornecedor = getNotasByFornecedor(notas);
  const recentes = notas.slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral dos arquivos registrados neste navegador</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Total de Notas" value={String(metrics.totalNotas)} icon={FileText} description="notas registradas" />
        <MetricCard
          title="Valor Total Identificado"
          value={formatCurrency(metrics.valorTotal)}
          icon={DollarSign}
          description="somente notas com total extraído"
        />
        <MetricCard title="Fornecedores" value={String(metrics.fornecedores)} icon={Building2} description="fornecedores identificados" />
        <MetricCard title="Com Alertas" value={String(metrics.comAlertas)} icon={AlertTriangle} description="alertas ativos" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notas por Período</CardTitle>
          </CardHeader>
          <CardContent>
            {byMonth.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={byMonth}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="total" fill="hsl(217,91%,60%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyCardMessage message="Nenhuma data de emissão identificada nas notas enviadas." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição por Fornecedor</CardTitle>
          </CardHeader>
          <CardContent>
            {byFornecedor.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={byFornecedor.slice(0, 6)}
                    dataKey="valor"
                    nameKey="nome"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ nome }) => nome.split(" ")[0]}
                  >
                    {byFornecedor.slice(0, 6).map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyCardMessage message="Nenhum fornecedor com valor identificado ainda." />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Últimos Arquivos Registrados</CardTitle>
        </CardHeader>
        <CardContent>
          {recentes.length > 0 ? (
            <div className="space-y-3">
              {recentes.map((nota) => (
                <div
                  key={nota.id}
                  onClick={() => navigate(`/notas/${nota.id}`)}
                  className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <TipoBadge tipo={nota.tipo_arquivo} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {getNotaPrimaryLabel(nota)}
                        {nota.emitente_nome ? ` - ${nota.emitente_nome}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {nota.data_emissao ? formatDate(nota.data_emissao) : "Data de emissão não identificada"}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-sm font-medium">
                      {nota.valor_total !== undefined ? formatCurrency(nota.valor_total) : "Valor não identificado"}
                    </span>
                    <StatusBadge status={nota.status_analise} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyCardMessage message="Nenhuma nota foi enviada ainda. Faca upload de um CSV, PDF ou imagem para comecar." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyCardMessage({ message }: { message: string }) {
  return (
    <div className="flex h-[250px] items-center justify-center rounded-lg border border-dashed text-center">
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

