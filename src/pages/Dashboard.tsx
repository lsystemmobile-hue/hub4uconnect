import { FileText, DollarSign, Building2, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { MetricCard } from "@/components/MetricCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, TipoBadge } from "@/components/StatusBadge";
import { useNotas } from "@/hooks/use-notas";
import {
  formatCurrency,
  formatDate,
  getMetrics,
  getNotaPrimaryLabel,
  getNotasByFornecedor,
  getNotasByMonth,
} from "@/lib/notas";

const COLORS = ["hsl(217,91%,60%)", "hsl(142,71%,45%)", "hsl(38,92%,50%)", "hsl(0,84%,60%)", "hsl(270,60%,55%)", "hsl(180,60%,45%)", "hsl(330,60%,50%)"];

export default function Dashboard() {
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
        <p className="text-muted-foreground">Visão geral das notas fiscais</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Total de Notas" value={String(metrics.totalNotas)} icon={FileText} description="notas registradas" />
        <MetricCard
          title="Valor Total Identificado"
          value={formatCurrency(metrics.valorTotal)}
          icon={DollarSign}
          description="somente notas com total extraído"
        />
        <MetricCard title="Fornecedores" value={String(metrics.fornecedores)} icon={Building2} description="fornecedores únicos" />
        <MetricCard title="Com Alertas" value={String(metrics.comAlertas)} icon={AlertTriangle} description="notas com inconsistências" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Notas por Período</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={byMonth}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="total" fill="hsl(217,91%,60%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Distribuição por Fornecedor</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={byFornecedor.slice(0, 6)} dataKey="valor" nameKey="nome" cx="50%" cy="50%" outerRadius={90} label={({ nome }) => nome.split(" ")[0]}>
                  {byFornecedor.slice(0, 6).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Últimas Notas Processadas</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentes.map((n) => (
              <div
                key={n.id}
                onClick={() => navigate(`/notas/${n.id}`)}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <TipoBadge tipo={n.tipo_arquivo} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">NF {n.numero_nota} - {n.emitente_nome}</p>
                    <p className="text-xs text-muted-foreground">{new Date(n.data_emissao).toLocaleDateString("pt-BR")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-medium">R$ {n.valor_total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  <StatusBadge status={n.status_analise} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
