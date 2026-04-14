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
    const { chargeId, messageOverride } = await req.json();

    const { data: charge, error: chargeError } = await supabaseAdmin
      .from("charges")
      .select("*")
      .eq("id", chargeId)
      .single();

    if (chargeError || !charge) {
      throw new Error("Cobrança não encontrada.");
    }

    const message =
      messageOverride ||
      String(charge.message_preview)
        .replace("{{nome}}", charge.customer_name)
        .replace("{{valor}}", `R$ ${(charge.amount_cents / 100).toFixed(2).replace(".", ",")}`)
        .replace("{{data}}", new Date(charge.due_date).toLocaleDateString("pt-BR"));

    const metaPhoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
    const metaToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");

    if (!metaPhoneNumberId || !metaToken) {
      throw new Error("Secrets do WhatsApp não configurados.");
    }

    const whatsappResponse = await fetch(`https://graph.facebook.com/v22.0/${metaPhoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${metaToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: charge.whatsapp_phone,
        type: "template",
        template: {
          name: "cobranca_utilitaria",
          language: { code: "pt_BR" },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: charge.customer_name },
                { type: "text", text: `R$ ${(charge.amount_cents / 100).toFixed(2).replace(".", ",")}` },
                { type: "text", text: new Date(charge.due_date).toLocaleDateString("pt-BR") },
              ],
            },
            {
              type: "header",
              parameters: [{ type: "document", document: { link: charge.boleto_pdf_url, filename: `boleto-${charge.omie_receivable_id}.pdf` } }],
            },
          ],
        },
      }),
    });

    const payload = await whatsappResponse.json();

    await supabaseAdmin.from("message_dispatches").insert({
      charge_id: charge.id,
      customer_name: charge.customer_name,
      message_sent: message,
      status: whatsappResponse.ok ? "enviado" : "falha",
      channel: "whatsapp",
      error_message: whatsappResponse.ok ? null : JSON.stringify(payload),
      provider_message_id: payload?.messages?.[0]?.id ?? null,
    });

    await supabaseAdmin
      .from("charges")
      .update({ status: whatsappResponse.ok ? "enviada" : "falha_envio", updated_at: new Date().toISOString() })
      .eq("id", charge.id);

    if (!whatsappResponse.ok) {
      await supabaseAdmin.from("notifications").insert({
        title: "Falha em envio",
        description: `A cobrança ${charge.customer_name} falhou no disparo do WhatsApp.`,
        type: "falha_envio",
      });
      throw new Error("A API do WhatsApp rejeitou o envio.");
    }

    return new Response(JSON.stringify({ ok: true, payload }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "Erro inesperado." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
