import type { BillingSnapshot, Charge, DispatchRecord, MessageTemplate, NotificationItem, ScheduleItem } from "./types";

const defaultMessage =
  "Olá, {{nome}}, tudo bem? Identificamos um boleto em aberto no valor de {{valor}} com vencimento em {{data}}. Segue o boleto para pagamento.";

const charges: Charge[] = [
  {
    id: "charge-1",
    customer_name: "Academia Prime Fitness",
    customer_document: "12.345.678/0001-10",
    whatsapp_phone: "5511998765432",
    amount_cents: 38990,
    due_date: "2026-04-08",
    status: "pendente",
    omie_customer_id: "OM-1001",
    omie_receivable_id: "REC-9001",
    boleto_pdf_url: "https://example.com/boletos/prime-fitness.pdf",
    boleto_number: "23791.11111 11111.111114 11111.111111 1 99990000038990",
    last_sync_at: "2026-04-13T08:15:00.000Z",
    message_preview: defaultMessage,
    risk_level: "alto",
    suggested_send_time: "2026-04-13T14:00:00.000Z",
  },
  {
    id: "charge-2",
    customer_name: "Clínica Vida Plena",
    customer_document: "45.987.120/0001-55",
    whatsapp_phone: "5511987654321",
    amount_cents: 128000,
    due_date: "2026-04-06",
    status: "falha_envio",
    omie_customer_id: "OM-1002",
    omie_receivable_id: "REC-9002",
    boleto_pdf_url: "https://example.com/boletos/vida-plena.pdf",
    boleto_number: "23791.22222 22222.222224 22222.222221 2 99990000128000",
    last_sync_at: "2026-04-13T08:20:00.000Z",
    message_preview: defaultMessage,
    risk_level: "alto",
    suggested_send_time: "2026-04-13T15:30:00.000Z",
  },
  {
    id: "charge-3",
    customer_name: "Mercado Sousa",
    customer_document: "08.333.221/0001-30",
    whatsapp_phone: "5511911122233",
    amount_cents: 55900,
    due_date: "2026-04-12",
    status: "agendada",
    omie_customer_id: "OM-1003",
    omie_receivable_id: "REC-9003",
    boleto_pdf_url: "https://example.com/boletos/mercado-sousa.pdf",
    boleto_number: "23791.33333 33333.333335 33333.333331 3 99990000055900",
    last_sync_at: "2026-04-13T08:25:00.000Z",
    message_preview: defaultMessage,
    risk_level: "medio",
    suggested_send_time: "2026-04-13T16:00:00.000Z",
  },
  {
    id: "charge-4",
    customer_name: "Transportadora Leste",
    customer_document: "77.654.001/0001-80",
    whatsapp_phone: "5511970009988",
    amount_cents: 214500,
    due_date: "2026-04-10",
    status: "enviada",
    omie_customer_id: "OM-1004",
    omie_receivable_id: "REC-9004",
    boleto_pdf_url: "https://example.com/boletos/transportadora-leste.pdf",
    boleto_number: "23791.44444 44444.444446 44444.444441 4 99990000214500",
    last_sync_at: "2026-04-13T08:30:00.000Z",
    message_preview: defaultMessage,
    risk_level: "medio",
    suggested_send_time: "2026-04-13T13:30:00.000Z",
  },
  {
    id: "charge-5",
    customer_name: "Studio Aurora",
    customer_document: "55.001.900/0001-65",
    whatsapp_phone: "5511933344455",
    amount_cents: 24990,
    due_date: "2026-04-03",
    status: "paga",
    omie_customer_id: "OM-1005",
    omie_receivable_id: "REC-9005",
    boleto_pdf_url: "https://example.com/boletos/studio-aurora.pdf",
    boleto_number: "23791.55555 55555.555557 55555.555551 5 99990000024990",
    last_sync_at: "2026-04-13T08:40:00.000Z",
    message_preview: defaultMessage,
    risk_level: "baixo",
    suggested_send_time: "2026-04-13T10:00:00.000Z",
    payment_updated_at: "2026-04-13T09:12:00.000Z",
  },
];

const dispatches: DispatchRecord[] = [
  {
    id: "dispatch-1",
    charge_id: "charge-4",
    customer_name: "Transportadora Leste",
    message_sent: "Olá, Transportadora Leste, tudo bem? Identificamos um boleto em aberto no valor de R$ 2.145,00 com vencimento em 10/04/2026. Segue o boleto para pagamento.",
    status: "enviado",
    channel: "whatsapp",
    created_at: "2026-04-13T10:05:00.000Z",
  },
  {
    id: "dispatch-2",
    charge_id: "charge-2",
    customer_name: "Clínica Vida Plena",
    message_sent: "Olá, Clínica Vida Plena, tudo bem? Identificamos um boleto em aberto no valor de R$ 1.280,00 com vencimento em 06/04/2026. Segue o boleto para pagamento.",
    status: "falha",
    channel: "whatsapp",
    created_at: "2026-04-13T09:10:00.000Z",
    error_message: "Template utilitário rejeitado pela API do WhatsApp.",
  },
];

const schedules: ScheduleItem[] = [
  {
    id: "schedule-1",
    charge_id: "charge-3",
    customer_name: "Mercado Sousa",
    scheduled_for: "2026-04-13T16:00:00.000Z",
    approved_by: "Equipe Financeira Demo",
    approval_note: "Cliente costuma responder melhor no fim da tarde.",
    snapshot_message: "Olá, Mercado Sousa, tudo bem? Identificamos um boleto em aberto no valor de R$ 559,00 com vencimento em 12/04/2026. Segue o boleto para pagamento.",
    status: "pendente_execucao",
    created_at: "2026-04-13T08:45:00.000Z",
  },
];

const notifications: NotificationItem[] = [
  {
    id: "notification-1",
    title: "Novo inadimplente importado",
    description: "Academia Prime Fitness entrou na fila após sincronização Omie.",
    type: "novo_inadimplente",
    created_at: "2026-04-13T08:15:00.000Z",
    read: false,
  },
  {
    id: "notification-2",
    title: "Falha no envio do WhatsApp",
    description: "Clínica Vida Plena precisa de revisão antes de reenviar.",
    type: "falha_envio",
    created_at: "2026-04-13T09:10:00.000Z",
    read: false,
  },
  {
    id: "notification-3",
    title: "Agendamento próximo",
    description: "Mercado Sousa possui envio aprovado para hoje às 16:00.",
    type: "agendamento_proximo",
    created_at: "2026-04-13T09:40:00.000Z",
    read: true,
  },
];

const templates: MessageTemplate[] = [
  {
    id: "template-1",
    name: "Cobrança utilitária padrão",
    category: "utilitario",
    content: defaultMessage,
    active: true,
  },
];

export const mockBillingSnapshot: BillingSnapshot = {
  charges,
  dispatches,
  schedules,
  notifications,
  templates,
};
