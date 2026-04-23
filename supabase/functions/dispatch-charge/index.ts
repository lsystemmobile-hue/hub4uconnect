import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { fetchWithTimeout } from "../_shared/fetch-helpers.ts";
import { gerarBoleto, obterBoleto } from "../_shared/omie-client.ts";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

function formatCurrency(cents: number): string {
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("T")[0].split("-");
  return `${day}/${month}/${year}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { chargeId, messageOverride, testPhone } = await req.json();

    // ── Buscar cobrança ────────────────────────────────────────────────────────
    const { data: charge, error: chargeError } = await supabaseAdmin
      .from("charges")
      .select("*")
      .eq("id", chargeId)
      .single();

    if (chargeError || !charge) {
      throw new Error("Cobrança não encontrada.");
    }

    // ── Montar mensagem ────────────────────────────────────────────────────────
    // Busca o template ativo da tabela para garantir que edições pelo site reflitam no envio
    const { data: templateRow } = await supabaseAdmin
      .from("message_templates")
      .select("content")
      .eq("active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const templateBase = messageOverride
      || templateRow?.content
      || charge.message_preview
      || "Olá, {{nome}}! Identificamos um boleto em aberto no valor de {{valor}} com vencimento em {{data}}. Por favor, efetue o pagamento para evitar juros.";

    const message = templateBase
      .replace("{{nome}}", charge.customer_name)
      .replace("{{valor}}", formatCurrency(charge.amount_cents))
      .replace("{{data}}", formatDate(charge.due_date));

    // ── Credenciais Evolution API ──────────────────────────────────────────────
    const evolutionUrl = Deno.env.get("EVOLUTION_API_URL");
    const evolutionKey = Deno.env.get("EVOLUTION_API_KEY");
    const evolutionInstance = Deno.env.get("EVOLUTION_INSTANCE");

    if (!evolutionUrl || !evolutionKey || !evolutionInstance) {
      throw new Error("Secrets da Evolution API não configurados (EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE).");
    }

    const headers = {
      "Content-Type": "application/json",
      "apikey": evolutionKey,
    };

    // Garantir que o número tenha o prefixo 55 (Brasil)
    const rawPhone = testPhone ? String(testPhone) : String(charge.whatsapp_phone);
    const phone = rawPhone.replace(/\D/g, "");
    const number = phone.startsWith("55") ? phone : `55${phone}`;

    // ── Enviar via Evolution API ───────────────────────────────────────────────
    let evolutionRes: Response;

    if (charge.boleto_pdf_url) {
      // Baixa o PDF e converte para base64 (Evolution API não acessa URLs pré-assinadas do Omie)
      let pdfUrl = charge.boleto_pdf_url;
      let pdfRes: Response | null = null;

      try {
        pdfRes = await fetchWithTimeout(pdfUrl, { timeoutMs: 15_000 });
      } catch (e) {
        console.log("[dispatch] primeiro download falhou:", e instanceof Error ? e.message : String(e));
      }

      const firstAttemptFailed = !pdfRes || !pdfRes.ok;

      // Qualquer falha (403, 400, 5xx, timeout) dispara renovação via Omie
      if (firstAttemptFailed) {
        console.log("[dispatch] URL indisponível (status:", pdfRes?.status ?? "timeout", "), renovando via Omie...");
        const appKey = Deno.env.get("OMIE_APP_KEY");
        const appSecret = Deno.env.get("OMIE_APP_SECRET");
        if (!appKey || !appSecret) {
          throw new Error("Credenciais Omie não configuradas para renovar o boleto.");
        }
        const nCodTitulo = Number(charge.omie_receivable_id);
        let freshUrl = "";
        let omieError = "";
        try {
          const obter = await obterBoleto(appKey, appSecret, nCodTitulo);
          if (obter.cGerado === "S" && obter.cLinkBoleto) freshUrl = obter.cLinkBoleto;
        } catch (e) {
          omieError = e instanceof Error ? e.message : String(e);
        }
        if (!freshUrl) {
          try {
            const gerar = await gerarBoleto(appKey, appSecret, nCodTitulo);
            freshUrl = gerar.cLinkBoleto ?? "";
          } catch (e) {
            omieError = e instanceof Error ? e.message : String(e);
          }
        }
        if (!freshUrl) {
          throw new Error(`Omie não conseguiu regerar o boleto${omieError ? `: ${omieError}` : "."}`);
        }
        pdfUrl = freshUrl;
        try {
          pdfRes = await fetchWithTimeout(pdfUrl, { timeoutMs: 15_000 });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          throw new Error(`Falha ao baixar o PDF mesmo após renovar URL: ${msg}`);
        }
        await supabaseAdmin.from("charges").update({ boleto_pdf_url: freshUrl }).eq("id", charge.id);
        console.log("[dispatch] URL renovada com sucesso.");
      }

      if (!pdfRes || !pdfRes.ok) {
        throw new Error(`Falha ao baixar o PDF do boleto (HTTP ${pdfRes?.status ?? "timeout"}).`);
      }
      const pdfBuffer = await pdfRes.arrayBuffer();
      const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));

      // Envia PDF do boleto + mensagem como legenda
      try {
        evolutionRes = await fetchWithTimeout(`${evolutionUrl}/message/sendMedia/${evolutionInstance}`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            number,
            mediatype: "document",
            mimetype: "application/pdf",
            caption: message,
            media: pdfBase64,
            fileName: `boleto-${charge.omie_receivable_id}.pdf`,
            delay: 1000,
          }),
          timeoutMs: 20_000,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new Error(`Evolution API não respondeu em 20s (sendMedia): ${msg}`);
      }
    } else {
      // Envia apenas texto
      try {
        evolutionRes = await fetchWithTimeout(`${evolutionUrl}/message/sendText/${evolutionInstance}`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            number,
            text: message,
            delay: 1000,
          }),
          timeoutMs: 20_000,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new Error(`Evolution API não respondeu em 20s (sendText): ${msg}`);
      }
    }

    const payload = await evolutionRes.json();
    const success = evolutionRes.ok;

    console.log("[dispatch]", charge.customer_name, "→", number, "| status:", evolutionRes.status, "| ok:", success);

    // ── Registrar dispatch ─────────────────────────────────────────────────────
    await supabaseAdmin.from("message_dispatches").insert({
      charge_id: charge.id,
      customer_name: charge.customer_name,
      message_sent: message,
      status: success ? "enviado" : "falha",
      channel: "whatsapp",
      error_message: success ? null : JSON.stringify(payload),
      provider_message_id: payload?.key?.id ?? payload?.messages?.[0]?.id ?? null,
    });

    // ── Atualizar status da cobrança ───────────────────────────────────────────
    await supabaseAdmin
      .from("charges")
      .update({ status: success ? "enviada" : "falha_envio" })
      .eq("id", charge.id);

    // ── Notificação em caso de falha ───────────────────────────────────────────
    if (!success) {
      await supabaseAdmin.from("notifications").insert({
        title: "Falha no envio",
        description: `A cobrança de ${charge.customer_name} falhou no disparo via WhatsApp.`,
        type: "falha_envio",
        read: false,
        created_at: new Date().toISOString(),
      });
      throw new Error(`Evolution API rejeitou o envio: ${JSON.stringify(payload)}`);
    }

    return new Response(JSON.stringify({ ok: true, payload }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    console.log("[dispatch] ERRO:", message);
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
