import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const now = new Date().toISOString();
    const { data: schedules, error } = await supabaseAdmin
      .from("charge_schedules")
      .select("*")
      .eq("status", "pendente_execucao")
      .lte("scheduled_for", now);

    if (error) throw error;

    for (const schedule of schedules ?? []) {
      const { error: dispatchError } = await supabaseAdmin.functions.invoke("dispatch-charge", {
        body: { chargeId: schedule.charge_id, messageOverride: schedule.snapshot_message },
      });

      await supabaseAdmin
        .from("charge_schedules")
        .update({ status: dispatchError ? "falha" : "executado" })
        .eq("id", schedule.id);
    }

    return new Response(JSON.stringify({ ok: true, processed: schedules?.length ?? 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "Erro inesperado." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
