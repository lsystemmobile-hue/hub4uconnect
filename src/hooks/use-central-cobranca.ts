import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import { buildMessagePreview, getDashboardMetrics, getLatestDispatches, getRiskSuggestions, sortSchedules } from "@/modules/central-cobranca/lib";
import { loadBillingSnapshot, saveBillingSnapshot } from "@/modules/central-cobranca/storage";
import type { BillingSnapshot, Charge, DispatchRecord, MessageTemplate, NotificationItem, ScheduleItem } from "@/modules/central-cobranca/types";

const BILLING_QUERY_KEY = ["central-cobranca", "snapshot"];

function makeId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

const DEFAULT_MESSAGE =
  "Olá, {{nome}}! Identificamos um boleto em aberto no valor de {{valor}} com vencimento em {{data}}. Por favor, efetue o pagamento para evitar juros.";

function normalizeCharge(raw: Record<string, unknown>): Charge {
  const tomorrow9am = new Date();
  tomorrow9am.setDate(tomorrow9am.getDate() + 1);
  tomorrow9am.setHours(9, 0, 0, 0);

  return {
    ...raw,
    suggested_send_time: (raw.suggested_send_time as string) ?? tomorrow9am.toISOString(),
    message_preview: (raw.message_preview as string) ?? DEFAULT_MESSAGE,
    risk_level: (raw.risk_level as Charge["risk_level"]) ?? "baixo",
    customer_document: (raw.customer_document as string) ?? "",
    whatsapp_phone: (raw.whatsapp_phone as string) ?? "",
    boleto_pdf_url: (raw.boleto_pdf_url as string) ?? "",
    boleto_number: (raw.boleto_number as string) ?? "",
  } as Charge;
}

async function getRemoteSnapshot(): Promise<BillingSnapshot> {
  if (!supabase) {
    return loadBillingSnapshot();
  }

  const [chargesRes, dispatchesRes, schedulesRes, notificationsRes, templatesRes] = await Promise.all([
    supabase.from("charges").select("*")
      .not("status", "in", '("paga","cancelada")')
      .gte("due_date", new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().slice(0, 10))
      .lte("due_date", new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10))
      .order("due_date", { ascending: true }),
    supabase.from("message_dispatches").select("*").order("created_at", { ascending: false }),
    supabase.from("charge_schedules").select("*").order("scheduled_for", { ascending: true }),
    supabase.from("notifications").select("*").order("created_at", { ascending: false }),
    supabase.from("message_templates").select("*").order("name", { ascending: true }),
  ]);

  if (chargesRes.error) throw chargesRes.error;
  if (dispatchesRes.error) throw dispatchesRes.error;
  if (schedulesRes.error) throw schedulesRes.error;
  if (notificationsRes.error) throw notificationsRes.error;
  if (templatesRes.error) throw templatesRes.error;

  return {
    charges: (chargesRes.data ?? []).map(normalizeCharge),
    dispatches: (dispatchesRes.data ?? []) as DispatchRecord[],
    schedules: (schedulesRes.data ?? []) as ScheduleItem[],
    notifications: (notificationsRes.data ?? []) as NotificationItem[],
    templates: (templatesRes.data ?? []) as MessageTemplate[],
  };
}

async function getSnapshot() {
  return isSupabaseConfigured ? getRemoteSnapshot() : loadBillingSnapshot();
}

function updateLocal(updater: (snapshot: BillingSnapshot) => BillingSnapshot) {
  const next = updater(loadBillingSnapshot());
  saveBillingSnapshot(next);
  return next;
}

export function useCentralCobrancaData() {
  const queryClient = useQueryClient();

  const snapshotQuery = useQuery({
    queryKey: BILLING_QUERY_KEY,
    queryFn: getSnapshot,
  });

  const sendNow = useMutation({
    mutationFn: async ({ chargeIds, customMessage }: { chargeIds: string[]; customMessage: string }) => {
      if (isSupabaseConfigured && supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        };
        if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
        const base = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

        for (const chargeId of chargeIds) {
          const res = await fetch(`${base}/dispatch-charge`, {
            method: "POST",
            headers,
            body: JSON.stringify({ chargeId, messageOverride: customMessage || undefined }),
            signal: AbortSignal.timeout(150_000), // 150s: cobre pior caso com margem (Omie 60s + PDF 30s + Evolution 20s + rede)
          });
          // Le o body completo para fechar a conexão e detectar erros
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            throw new Error(data.error ?? `Erro HTTP ${res.status}`);
          }
        }
        return;
      }

      updateLocal((snapshot) => ({
        ...snapshot,
        charges: snapshot.charges.map((charge) =>
          chargeIds.includes(charge.id) ? { ...charge, status: "enviada" } : charge,
        ),
        dispatches: [
          ...snapshot.dispatches,
          ...snapshot.charges
            .filter((charge) => chargeIds.includes(charge.id))
            .map((charge) => ({
              id: makeId("dispatch"),
              charge_id: charge.id,
              customer_name: charge.customer_name,
              message_sent: customMessage || buildMessagePreview(charge).message,
              status: "enviado" as const,
              channel: "whatsapp" as const,
              created_at: new Date().toISOString(),
              error_message: null,
            })),
        ],
      }));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: BILLING_QUERY_KEY });
    },
  });

  const schedule = useMutation({
    mutationFn: async ({
      chargeIds,
      scheduledFor,
      approvalNote,
      snapshotMessage,
    }: {
      chargeIds: string[];
      scheduledFor: string;
      approvalNote: string;
      approvedBy?: string;
      snapshotMessage: string;
    }) => {
      const createItems = (charges: Charge[]) =>
        charges.map((charge) => ({
          charge_id: charge.id,
          customer_name: charge.customer_name,
          scheduled_for: scheduledFor,
          approved_by: null, // sempre null: evita FK violation (profiles pode não ter linha para este user)
          approval_note: approvalNote,
          snapshot_message: snapshotMessage || buildMessagePreview(charge).message,
          status: "pendente_execucao",
        }));

      if (isSupabaseConfigured && supabase) {
        const snapshot = await getRemoteSnapshot();
        const items = createItems(snapshot.charges.filter((charge) => chargeIds.includes(charge.id)));
        const { error: insertError } = await supabase.from("charge_schedules").insert(items);
        if (insertError) throw insertError;
        const { error: updateError } = await supabase.from("charges").update({ status: "agendada" }).in("id", chargeIds);
        if (updateError) throw updateError;
        return;
      }

      updateLocal((snapshot) => ({
        ...snapshot,
        charges: snapshot.charges.map((charge) =>
          chargeIds.includes(charge.id) ? { ...charge, status: "agendada" } : charge,
        ),
        schedules: [
          ...snapshot.schedules,
          ...snapshot.charges
            .filter((charge) => chargeIds.includes(charge.id))
            .map((charge) => ({
              id: makeId("schedule"),
              charge_id: charge.id,
              customer_name: charge.customer_name,
              scheduled_for: scheduledFor,
              approved_by: null,
              approval_note: approvalNote,
              snapshot_message: snapshotMessage || buildMessagePreview(charge).message,
              status: "pendente_execucao" as const,
              created_at: new Date().toISOString(),
            })),
        ],
      }));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: BILLING_QUERY_KEY });
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase
          .from("message_templates")
          .update({ content })
          .eq("id", id);
        if (error) throw error;
        return;
      }
      updateLocal((snapshot) => ({
        ...snapshot,
        templates: snapshot.templates.map((t) => t.id === id ? { ...t, content } : t),
      }));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: BILLING_QUERY_KEY });
    },
  });

  const markPaid = useMutation({
    mutationFn: async (chargeId: string) => {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase
          .from("charges")
          .update({ status: "paga", payment_updated_at: new Date().toISOString() })
          .eq("id", chargeId);
        if (error) throw error;
        return;
      }

      updateLocal((snapshot) => ({
        ...snapshot,
        charges: snapshot.charges.map((charge) =>
          charge.id === chargeId ? { ...charge, status: "paga", payment_updated_at: new Date().toISOString() } : charge,
        ),
      }));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: BILLING_QUERY_KEY });
    },
  });

  const syncOmie = useMutation({
    mutationFn: async (onStep?: (step: string) => void) => {
      if (isSupabaseConfigured && supabase) {
        onStep?.("Sincronizando títulos com o OMIE...");
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        };
        if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;

        const base = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

        const timeout5min = () => AbortSignal.timeout(5 * 60 * 1000);

        const syncRes = await fetch(`${base}/sync-omie-charges`, { method: "POST", headers, signal: timeout5min() });
        if (!syncRes.ok) throw new Error(`sync-omie-charges: ${syncRes.status}`);
        const syncData = await syncRes.json();
        onStep?.(`✓ ${syncData.synced ?? 0} títulos sincronizados — buscando nomes dos clientes...`);

        const enrichRes = await fetch(`${base}/enrich-omie-customers`, { method: "POST", headers, signal: timeout5min() });
        if (!enrichRes.ok) throw new Error(`enrich-omie-customers: ${enrichRes.status}`);
        const enrichData = await enrichRes.json();
        onStep?.(`✓ ${enrichData.updated ?? 0} nomes atualizados — buscando boletos...`);

        const boletoRes = await fetch(`${base}/enrich-omie-boletos`, { method: "POST", headers, signal: timeout5min() });
        if (!boletoRes.ok) throw new Error(`enrich-omie-boletos: ${boletoRes.status}`);
        const boletoData = await boletoRes.json();
        onStep?.(`Concluído! ${boletoData.updated ?? 0} boleto(s) encontrado(s).`);
        return;
      }

      updateLocal((snapshot) => ({
        ...snapshot,
        notifications: [
          {
            id: makeId("notification"),
            title: "Sincronização solicitada",
            description: "A central simulou uma reconciliação manual com a Omie.",
            type: "novo_inadimplente",
            created_at: new Date().toISOString(),
            read: false,
          },
          ...snapshot.notifications,
        ],
      }));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: BILLING_QUERY_KEY });
    },
  });

  const snapshot = snapshotQuery.data;

  return {
    ...snapshotQuery,
    snapshot,
    charges: snapshot?.charges ?? [],
    dispatches: snapshot ? getLatestDispatches(snapshot.dispatches) : [],
    schedules: snapshot ? sortSchedules(snapshot.schedules) : [],
    notifications: snapshot?.notifications ?? [],
    templates: snapshot?.templates ?? [],
    dashboard: snapshot
      ? getDashboardMetrics(snapshot)
      : { totalInadimplentes: 0, totalOpenAmount: 0, sentToday: 0, pendingReview: 0, chart: [] },
    suggestions: snapshot ? getRiskSuggestions(snapshot.charges, snapshot.dispatches) : [],
    sendNow,
    schedule,
    markPaid,
    syncOmie,
    updateTemplate,
  };
}
