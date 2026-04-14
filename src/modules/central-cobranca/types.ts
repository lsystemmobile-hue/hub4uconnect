export type BillingRole = "admin" | "financeiro";

export type ChargeStatus =
  | "pendente"
  | "revisao"
  | "agendada"
  | "enviada"
  | "falha_envio"
  | "paga"
  | "cancelada";

export type DispatchStatus = "enviado" | "falha" | "agendado";

export type NotificationType = "novo_inadimplente" | "boleto_vencido" | "falha_envio" | "agendamento_proximo";

export interface BillingProfile {
  id: string;
  email: string;
  fullName: string;
  role: BillingRole;
  active: boolean;
}

export interface Charge {
  id: string;
  customer_name: string;
  customer_document: string;
  whatsapp_phone: string;
  amount_cents: number;
  due_date: string;
  status: ChargeStatus;
  omie_customer_id: string;
  omie_receivable_id: string;
  boleto_pdf_url: string;
  boleto_number: string;
  last_sync_at: string;
  message_preview: string;
  risk_level: "baixo" | "medio" | "alto";
  suggested_send_time: string;
  payment_updated_at?: string | null;
}

export interface ChargeFilters {
  search: string;
  status: "todos" | ChargeStatus;
  dueDateFrom: string;
  dueDateTo: string;
}

export interface ChargeSelection {
  selectedIds: string[];
  totalSelected: number;
}

export interface MessagePreview {
  charge_id: string;
  customer_name: string;
  whatsapp_phone: string;
  message: string;
  boleto_pdf_url: string;
}

export interface ScheduleRequest {
  charge_ids: string[];
  scheduled_for: string;
  approval_note: string;
  approved_by: string;
  snapshot_message: string;
}

export interface DispatchRecord {
  id: string;
  charge_id: string;
  customer_name: string;
  message_sent: string;
  status: DispatchStatus;
  channel: "whatsapp";
  created_at: string;
  error_message?: string | null;
}

export interface RiskSuggestion {
  charge_id: string;
  title: string;
  reason: string;
  suggested_send_time: string;
  tone: "gentil" | "direta" | "urgente";
  risk_level: "baixo" | "medio" | "alto";
}

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  type: NotificationType;
  created_at: string;
  read: boolean;
}

export interface ScheduleItem {
  id: string;
  charge_id: string;
  customer_name: string;
  scheduled_for: string;
  approved_by: string;
  approval_note: string;
  snapshot_message: string;
  status: "pendente_execucao" | "executado" | "cancelado" | "falha";
  created_at: string;
}

export interface MessageTemplate {
  id: string;
  name: string;
  category: "utilitario";
  content: string;
  active: boolean;
}

export interface BillingSnapshot {
  charges: Charge[];
  dispatches: DispatchRecord[];
  schedules: ScheduleItem[];
  notifications: NotificationItem[];
  templates: MessageTemplate[];
}
