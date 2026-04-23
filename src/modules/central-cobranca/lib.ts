import type {
  BillingSnapshot,
  Charge,
  ChargeFilters,
  ChargeStatus,
  DispatchRecord,
  MessagePreview,
  NotificationItem,
  RiskSuggestion,
  ScheduleItem,
} from "./types";

export function formatCurrency(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatDate(date: string) {
  return new Date(date).toLocaleDateString("pt-BR");
}

export function formatDateTime(date: string) {
  return new Date(date).toLocaleString("pt-BR");
}

export function getChargeStatusLabel(status: ChargeStatus) {
  const labels: Record<ChargeStatus, string> = {
    pendente: "Pendente",
    revisao: "Em revisão",
    agendada: "Agendada",
    enviada: "Enviada",
    falha_envio: "Falha no envio",
    paga: "Paga",
    cancelada: "Cancelada",
  };

  return labels[status];
}

const DEFAULT_MESSAGE =
  "Olá, {{nome}}! Identificamos um boleto em aberto no valor de {{valor}} com vencimento em {{data}}. Por favor, efetue o pagamento para evitar juros.";

export function buildMessagePreview(charge: Charge): MessagePreview {
  const template = charge.message_preview || DEFAULT_MESSAGE;
  const message = template
    .replace("{{nome}}", charge.customer_name)
    .replace("{{valor}}", formatCurrency(charge.amount_cents))
    .replace("{{data}}", formatDate(charge.due_date));

  return {
    charge_id: charge.id,
    customer_name: charge.customer_name,
    whatsapp_phone: charge.whatsapp_phone,
    message,
    boleto_pdf_url: charge.boleto_pdf_url,
  };
}

export function filterCharges(charges: Charge[], filters: ChargeFilters) {
  const search = filters.search.trim().toLowerCase();

  return charges.filter((charge) => {
    const matchesSearch =
      search.length === 0 ||
      charge.customer_name.toLowerCase().includes(search) ||
      charge.customer_document.toLowerCase().includes(search);
    const matchesStatus = filters.status === "todos" || charge.status === filters.status;
    const matchesFrom = !filters.dueDateFrom || charge.due_date >= filters.dueDateFrom;
    const matchesTo = !filters.dueDateTo || charge.due_date <= filters.dueDateTo;

    return matchesSearch && matchesStatus && matchesFrom && matchesTo;
  });
}

export function getDashboardMetrics(snapshot: BillingSnapshot) {
  const totalOpen = snapshot.charges.filter((charge) => charge.status !== "paga" && charge.status !== "cancelada");
  const today = new Date().toISOString().slice(0, 10);
  const dispatchesToday = snapshot.dispatches.filter((dispatch) => dispatch.created_at.slice(0, 10) === today);

  return {
    totalInadimplentes: totalOpen.length,
    totalOpenAmount: totalOpen.reduce((sum, charge) => sum + charge.amount_cents, 0),
    sentToday: dispatchesToday.filter((dispatch) => dispatch.status === "enviado").length,
    pendingReview: snapshot.charges.filter((charge) => charge.status === "pendente" || charge.status === "revisao").length,
    chart: [
      { name: "Pago", total: snapshot.charges.filter((charge) => charge.status === "paga").length },
      { name: "Pendente", total: snapshot.charges.filter((charge) => charge.status === "pendente").length },
      { name: "Enviado", total: snapshot.charges.filter((charge) => charge.status === "enviada").length },
      { name: "Falha", total: snapshot.charges.filter((charge) => charge.status === "falha_envio").length },
    ],
  };
}

export function getRiskSuggestions(charges: Charge[], dispatches: DispatchRecord[]): RiskSuggestion[] {
  return charges
    .filter((charge) => charge.status !== "paga" && charge.status !== "cancelada")
    .map((charge) => {
      const failureCount = dispatches.filter((dispatch) => dispatch.charge_id === charge.id && dispatch.status === "falha").length;
      const overdueDays = Math.max(0, Math.floor((Date.now() - new Date(charge.due_date).getTime()) / 86_400_000));

      let tone: RiskSuggestion["tone"] = "gentil";
      let title = "Contato recomendado";
      let reason = "Cliente com comportamento estável e atraso controlado.";

      if (failureCount > 0 || overdueDays >= 5 || charge.amount_cents >= 100000) {
        tone = "urgente";
        title = "Prioridade alta";
        reason = "Há risco elevado por atraso relevante, valor alto ou histórico de falha.";
      } else if (overdueDays >= 2 || charge.amount_cents >= 50000) {
        tone = "direta";
        title = "Revisar abordagem";
        reason = "Vale usar mensagem mais objetiva por valor ou atraso moderado.";
      }

      return {
        charge_id: charge.id,
        title,
        reason,
        suggested_send_time: charge.suggested_send_time,
        tone,
        risk_level: charge.risk_level,
      };
    })
    .sort((a, b) => {
      const weight = { alto: 3, medio: 2, baixo: 1 };
      return weight[b.risk_level] - weight[a.risk_level];
    })
    .slice(0, 5);
}

export function getUnreadNotifications(notifications: NotificationItem[]) {
  return notifications.filter((item) => !item.read).length;
}

export function sortSchedules(schedules: ScheduleItem[]) {
  return [...schedules].sort((a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime());
}

export function getLatestDispatches(dispatches: DispatchRecord[]) {
  return [...dispatches].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}
