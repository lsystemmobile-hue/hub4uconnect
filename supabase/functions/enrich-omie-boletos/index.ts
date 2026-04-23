import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { gerarBoleto, obterBoleto } from "../_shared/omie-client.ts";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchBoletoLink(appKey: string, appSecret: string, omieReceivableId: string): Promise<string> {
  const nCodTitulo = Number(omieReceivableId);
  try {
    const obter = await obterBoleto(appKey, appSecret, nCodTitulo);
    if (obter.cGerado === "S" && obter.cLinkBoleto) return obter.cLinkBoleto;
  } catch {
    // ObterBoleto falhou — tenta GerarBoleto direto
  }
  try {
    const gerar = await gerarBoleto(appKey, appSecret, nCodTitulo);
    return gerar.cLinkBoleto ?? "";
  } catch {
    return "";
  }
}

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

  const { data: rows, error } = await supabaseAdmin
    .from("charges")
    .select("id, omie_receivable_id, boleto_pdf_url")
    .eq("status", "pendente");

  // Filtra localmente: sem URL ou com URL expirada (parâmetro Expires no passado)
  const now = Math.floor(Date.now() / 1000);
  const needsEnrich = (rows ?? []).filter((r) => {
    if (!r.boleto_pdf_url) return true;
    const match = r.boleto_pdf_url.match(/[?&]Expires=(\d+)/);
    if (match) return Number(match[1]) < now;
    return false;
  });

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const total = needsEnrich.length;
  console.log("[boletos] cobranças a enriquecer:", total);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  // Lotes de 3 com 800ms entre lotes — respeita rate limit da OMIE
  // 123 registros / 3 = ~41 lotes × ~1.8s = ~74s (dentro do limite de 150s)
  const BATCH = 3;

  for (let i = 0; i < total; i += BATCH) {
    const lote = needsEnrich.slice(i, i + BATCH);

    const results = await Promise.allSettled(
      lote.map(async (row) => {
        const link = await fetchBoletoLink(appKey, appSecret, row.omie_receivable_id);
        if (!link) return { row, ok: false };

        const { error: upErr } = await supabaseAdmin
          .from("charges")
          .update({ boleto_pdf_url: link })
          .eq("id", row.id);

        if (upErr) throw new Error(upErr.message);
        return { row, ok: true };
      }),
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        if (result.value.ok) {
          updated++;
          console.log("[boletos] ✓", result.value.row.omie_receivable_id);
        } else {
          skipped++;
        }
      } else {
        errors++;
        console.log("[boletos] erro:", result.reason);
      }
    }

    // Pausa entre lotes para não exceder rate limit
    if (i + BATCH < total) await sleep(800);
  }

  console.log("[boletos] concluído — updated:", updated, "skipped:", skipped, "errors:", errors);

  return new Response(JSON.stringify({ ok: true, updated, skipped, errors }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
