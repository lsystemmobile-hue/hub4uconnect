import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import { buildMessagePreview, getDashboardMetrics, getLatestDispatches, getRiskSuggestions, sortSchedules } from "@/modules/central-cobranca/lib";
import { loadBillingSnapshot, saveBillingSnapshot } from "@/modules/central-cobranca/storage";
import type { BillingSnapshot, Charge, DispatchRecord, MessageTemplate, NotificationItem, ScheduleItem } from "@/modules/central-cobranca/types";

const BILLING_QUERY_KEY = ["central-cobranca", "snapshot"];

function makeId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

async function getRemoteSnapshot(): Promise<BillingSnapshot> {
  if (!supabase) {
    return loadBillingSnapshot();
  }

  const [chargesRes, dispatchesRes, schedulesRes, notificationsRes, templatesRes] = await Promise.all([
    supabase.from("charges").select("*").order("due_date", { ascending: true }),
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
    charges: (chargesRes.data ?? []) as Charge[],
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
        const snapshot = await getRemoteSnapshot();
        const targets = snapshot.charges.filter((charge) => chargeIds.includes(charge.id));
        const dispatches = targets.map((charge) => ({
          id: makeId("dispatch"),
          charge_id: charge.id,
          customer_name: charge.customer_name,
          message_sent: customMessage || buildMessagePreview(charge).message,
          status: "enviado",
          channel: "whatsapp",
          created_at: new Date().toISOString(),
          error_message: null,
        }));

        const { error: insertError } = await supabase.from("message_dispatches").insert(dispatches);
        if (insertError) throw insertError;

        const { error: updateError } = await supabase.from("charges").update({ status: "enviada" }).in("id", chargeIds);
        if (updateError) throw updateError;

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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: BILLING_QUERY_KEY });
    },
  });

  const schedule = useMutation({
    mutationFn: async ({
      chargeIds,
      scheduledFor,
      approvalNote,
      approvedBy,
      snapshotMessage,
    }: {
      chargeIds: string[];
      scheduledFor: string;
      approvalNote: string;
      approvedBy: string;
      snapshotMessage: string;
    }) => {
      const createItems = (charges: Charge[]) =>
        charges.map((charge) => ({
          id: makeId("schedule"),
          charge_id: charge.id,
          customer_name: charge.customer_name,
          scheduled_for: scheduledFor,
          approved_by: approvedBy,
          approval_note: approvalNote,
          snapshot_message: snapshotMessage || buildMessagePreview(charge).message,
          status: "pendente_execucao",
          created_at: new Date().toISOString(),
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
        schedules: [...snapshot.schedules, ...createItems(snapshot.charges.filter((charge) => chargeIds.includes(charge.id)))],
      }));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: BILLING_QUERY_KEY });
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: BILLING_QUERY_KEY });
    },
  });

  const syncOmie = useMutation({
    mutationFn: async () => {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.from("notifications").insert({
          id: makeId("notification"),
          title: "Sincronização solicitada",
          description: "A reconciliação manual com a Omie foi registrada para execução.",
          type: "novo_inadimplente",
          created_at: new Date().toISOString(),
          read: false,
        });
        if (error) throw error;
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: BILLING_QUERY_KEY });
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
  };
}
