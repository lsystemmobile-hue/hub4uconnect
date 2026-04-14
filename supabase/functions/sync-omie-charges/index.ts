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

  const runId = crypto.randomUUID();

  try {
    await supabaseAdmin.from("sync_runs").insert({
      id: runId,
      source: "omie",
      status: "running",
      summary: {},
    });

    const omieAppKey = Deno.env.get("OMIE_APP_KEY");
    const omieAppSecret = Deno.env.get("OMIE_APP_SECRET");
    if (!omieAppKey || !omieAppSecret) {
      throw new Error("Credenciais da Omie não configuradas.");
    }

    // Placeholder do fluxo real:
    // 1. Buscar contas a receber em aberto
    // 2. Buscar cliente associado
    // 3. Upsert em customers e charges
    // 4. Detectar baixa para marcar cobranças como pagas

    await supabaseAdmin.from("notifications").insert({
      title: "Sincronização Omie executada",
      description: "A função está pronta para receber o mapeamento final do serviço financeiro da Omie.",
      type: "novo_inadimplente",
    });

    await supabaseAdmin
      .from("sync_runs")
      .update({ status: "completed", summary: { synced: 0 }, finished_at: new Date().toISOString() })
      .eq("id", runId);

    return new Response(JSON.stringify({ ok: true, synced: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    await supabaseAdmin
      .from("sync_runs")
      .update({
        status: "failed",
        error_message: error instanceof Error ? error.message : "Erro inesperado.",
        finished_at: new Date().toISOString(),
      })
      .eq("id", runId);

    return new Response(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "Erro inesperado." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
