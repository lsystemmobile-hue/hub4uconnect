import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { listarContasReceber } from "../_shared/omie-client.ts";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

/** Converte DD/MM/YYYY → YYYY-MM-DD */
function omieDate(d: string): string {
  if (!d || !d.includes("/")) return d ?? "";
  const [day, month, year] = d.split("/");
  return `${year}-${month}-${day}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const runId = crypto.randomUUID();

  try {
    console.log("[sync] iniciando, runId:", runId);

    const syncInsert = await supabaseAdmin.from("sync_runs").insert({
      id: runId,
      source: "omie",
      status: "running",
      summary: {},
    });
    console.log("[sync] sync_runs insert:", syncInsert.error?.message ?? "ok");

    const appKey = Deno.env.get("OMIE_APP_KEY");
    const appSecret = Deno.env.get("OMIE_APP_SECRET");
    if (!appKey || !appSecret) {
      throw new Error("Credenciais da Omie não configuradas.");
    }

    // ── 1. Buscar todas as contas a receber (todas as páginas) ─────────────────
    const todasContas = [];
    let pagina = 1;
    let totalPaginas = 1;

    while (pagina <= totalPaginas) {
      console.log("[sync] página:", pagina, "/", totalPaginas);
      const res = await listarContasReceber(appKey, appSecret, pagina);
      totalPaginas = res.total_de_paginas ?? 1;
      todasContas.push(...(res.conta_receber_cadastro ?? []));
      pagina++;
    }
    console.log("[sync] total recebido:", todasContas.length);

    // ── 2. Upsert seletivo via RPC — preserva customer_name e campos enriquecidos ─
    // A função sync_charges_batch no banco faz INSERT ... ON CONFLICT DO UPDATE SET
    // apenas status, amount_cents, due_date, boleto_number, last_sync_at.
    // customer_name, whatsapp_phone, customer_document e boleto_pdf_url NÃO são
    // sobrescritos para registros existentes.
    let synced = 0;
    let errors = 0;
    const BATCH = 200;

    for (let i = 0; i < todasContas.length; i += BATCH) {
      const lote = todasContas.slice(i, i + BATCH).map((conta) => ({
        omie_receivable_id: String(conta.codigo_lancamento_omie),
        omie_customer_id: String(conta.codigo_cliente_fornecedor),
        customer_name: String(conta.codigo_cliente_fornecedor),
        amount_cents: Math.round((Number(conta.valor_documento) || 0) * 100),
        due_date: omieDate(conta.data_vencimento),
        boleto_number: conta.numero_documento ?? "",
        status: conta.status_titulo === "RECEBIDO"
          ? "paga"
          : conta.status_titulo === "CANCELADO"
          ? "cancelada"
          : "pendente",
        last_sync_at: new Date().toISOString(),
      }));

      const { data: rpcResult, error } = await supabaseAdmin.rpc("sync_charges_batch", { records: lote });

      if (error) {
        console.log("[sync] erro lote", i, ":", error.message);
        errors += lote.length;
      } else {
        synced += (rpcResult as { synced: number })?.synced ?? lote.length;
        errors += (rpcResult as { errors: number })?.errors ?? 0;
      }
    }

    console.log("[sync] concluído — synced:", synced, "errors:", errors);

    // ── 3. Notificação ─────────────────────────────────────────────────────────
    await supabaseAdmin.from("notifications").insert({
      title: "Sincronização Omie concluída",
      description: `${synced} título(s) sincronizado(s)${errors > 0 ? `, ${errors} erro(s).` : "."}`,
      type: "novo_inadimplente",
      read: false,
      created_at: new Date().toISOString(),
    });

    await supabaseAdmin
      .from("sync_runs")
      .update({ status: "completed", summary: { synced, errors }, finished_at: new Date().toISOString() })
      .eq("id", runId);

    return new Response(JSON.stringify({ ok: true, synced, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    console.log("[sync] ERRO:", message);

    await supabaseAdmin
      .from("sync_runs")
      .update({ status: "failed", error_message: message, finished_at: new Date().toISOString() })
      .eq("id", runId);

    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
