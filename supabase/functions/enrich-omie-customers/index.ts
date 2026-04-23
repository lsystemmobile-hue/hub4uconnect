import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { consultarCliente } from "../_shared/omie-client.ts";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const appKey = Deno.env.get("OMIE_APP_KEY");
  const appSecret = Deno.env.get("OMIE_APP_SECRET");
  if (!appKey || !appSecret) {
    return new Response(JSON.stringify({ ok: false, error: "Credenciais não configuradas." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Buscar códigos de clientes únicos apenas dos registros pendentes
  const { data: rows, error } = await supabaseAdmin
    .from("charges")
    .select("omie_customer_id")
    .eq("status", "pendente")
    .order("omie_customer_id");

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // IDs únicos
  const uniqueIds = [...new Set((rows ?? []).map((r) => r.omie_customer_id))];
  console.log("[enrich] clientes a enriquecer:", uniqueIds.length);

  let updated = 0;
  let errors = 0;

  for (let i = 0; i < uniqueIds.length; i++) {
    const omieCustomerId = uniqueIds[i];

    try {
      const cliente = await consultarCliente(appKey, appSecret, Number(omieCustomerId));
      const nome = cliente.razao_social || cliente.nome_fantasia || omieCustomerId;
      const documento = cliente.cnpj_cpf ?? "";
      const telefone = `${cliente.telefone1_ddd ?? ""}${cliente.telefone1_numero ?? ""}`.replace(/\D/g, "");

      const { error: upErr } = await supabaseAdmin
        .from("charges")
        .update({
          customer_name: nome,
          customer_document: documento,
          whatsapp_phone: telefone,
        })
        .eq("omie_customer_id", omieCustomerId);

      if (upErr) {
        console.log("[enrich] erro update", omieCustomerId, upErr.message);
        errors++;
      } else {
        updated++;
        console.log("[enrich]", i + 1, "/", uniqueIds.length, "—", nome);
      }
    } catch (err) {
      console.log("[enrich] erro cliente", omieCustomerId, err instanceof Error ? err.message : err);
      errors++;
    }

    // Pausa de 1s entre chamadas para não acionar o bloqueio de redundância
    await sleep(1000);
  }

  console.log("[enrich] concluído — updated:", updated, "errors:", errors);

  return new Response(JSON.stringify({ ok: true, updated, errors }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
