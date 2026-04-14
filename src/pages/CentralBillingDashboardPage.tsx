import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, BellRing, CalendarClock, Wallet } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCentralCobrancaData } from "@/hooks/use-central-cobranca";
import { formatCurrency, formatDateTime } from "@/modules/central-cobranca/lib";

export default function CentralBillingDashboardPage() {
  const { dashboard, suggestions, notifications } = useCentralCobrancaData();

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Inadimplentes" value={String(dashboard.totalInadimplentes)} icon={AlertTriangle} description="clientes com cobrança aberta" />
        <MetricCard title="Valores em aberto" value={formatCurrency(dashboard.totalOpenAmount)} icon={Wallet} description="soma dos títulos pendentes" />
        <MetricCard title="Enviadas hoje" value={String(dashboard.sentToday)} icon={BellRing} description="disparos confirmados manualmente" />
        <MetricCard title="Pendentes" value={String(dashboard.pendingReview)} icon={CalendarClock} description="precisam de revisão ou confirmação" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status das cobranças</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={dashboard.chart}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="total" fill="hsl(118 52% 41%)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Assistente inteligente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {suggestions.map((suggestion) => (
              <div key={suggestion.charge_id} className="rounded-2xl border p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{suggestion.title}</p>
                  <span className="text-xs uppercase tracking-wide text-primary">{suggestion.risk_level}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{suggestion.reason}</p>
                <p className="mt-3 text-xs text-muted-foreground">
                  Melhor horário sugerido: {formatDateTime(suggestion.suggested_send_time)} | Tom: {suggestion.tone}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Últimos alertas internos</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {notifications.slice(0, 3).map((item) => (
            <div key={item.id} className="rounded-2xl border p-4">
              <p className="font-medium">{item.title}</p>
              <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
              <p className="mt-3 text-xs text-muted-foreground">{formatDateTime(item.created_at)}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
