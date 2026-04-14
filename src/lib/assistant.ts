import type { NotaFiscal } from "@/data/types";
import { countActiveAlerts, formatCurrency, formatDate, formatMonthShort, getMetrics, getNotasByFornecedor, getNotaPrimaryLabel, groupNotasByCnpjAndMonth } from "@/lib/notas";

export const AI_STORAGE_KEY = "fiscal-ai-insights:assistant-config:v1";

export type AiProviderId = "groq" | "openai" | "gemini";

export interface AiConfig {
  provider: AiProviderId;
  apiKey: string;
  model: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AssistantReply {
  content: string;
  sources: string[];
  mode: "api" | "local";
}

export interface AssistantKnowledgePack {
  summary: string;
  selectedNotes: NotaFiscal[];
  sourceLabels: string[];
}

export const AI_PROVIDER_OPTIONS: Array<{
  value: AiProviderId;
  label: string;
  description: string;
  defaultModel: string;
}> = [
  {
    value: "groq",
    label: "Groq",
    description: "OpenAI-compatible, rápido e bom para o fluxo atual.",
    defaultModel: "llama-3.1-8b-instant",
  },
  {
    value: "openai",
    label: "OpenAI / GPT",
    description: "Compatível com o endpoint oficial da OpenAI.",
    defaultModel: "gpt-4o-mini",
  },
  {
    value: "gemini",
    label: "Gemini",
    description: "Usa a API do Google Gemini com a chave configurada.",
    defaultModel: "gemini-1.5-flash",
  },
];

const DEFAULT_SYSTEM_PROMPT = [
  "Você é um assistente fiscal especialista em notas fiscais e deve responder em português do Brasil.",
  "Use somente as informações fornecidas na base de conhecimento e na conversa recente.",
  "Se a resposta não puder ser comprovada pelas notas, diga explicitamente que não encontrou evidências suficientes e faça uma pergunta curta de esclarecimento.",
  "Quando citar fatos, mencione, sempre que possível, NF, emitente, CNPJ, mês e valor.",
  "Se o usuário pedir resumo, comparação ou análise, priorize as notas e métricas fornecidas no contexto.",
].join(" ");

const DEFAULT_STOPWORDS = new Set([
  "a",
  "as",
  "ao",
  "aos",
  "de",
  "da",
  "das",
  "do",
  "dos",
  "e",
  "em",
  "para",
  "por",
  "um",
  "uma",
  "o",
  "os",
  "que",
  "qual",
  "quais",
  "quanto",
  "quantas",
  "quantos",
  "sobre",
  "com",
  "sem",
  "tem",
  "têm",
  "ter",
  "nota",
  "notas",
  "nf",
  "nfe",
  "nfse",
  "fiscal",
  "assistente",
  "ia",
  "me",
  "mostre",
  "mostrar",
  "liste",
  "listar",
]);

export function getDefaultAiConfig(provider: AiProviderId = "groq"): AiConfig {
  return {
    provider,
    apiKey: "",
    model: getDefaultModel(provider),
  };
}

export function getDefaultModel(provider: AiProviderId) {
  return AI_PROVIDER_OPTIONS.find((option) => option.value === provider)?.defaultModel ?? "llama-3.1-8b-instant";
}

export function getProviderLabel(provider: AiProviderId) {
  return AI_PROVIDER_OPTIONS.find((option) => option.value === provider)?.label ?? provider;
}

export function normalizeAiConfig(config: Partial<AiConfig> | null | undefined): AiConfig {
  const provider = config?.provider && isAiProviderId(config.provider) ? config.provider : "groq";
  return {
    provider,
    apiKey: config?.apiKey?.trim() ?? "",
    model: config?.model?.trim() || getDefaultModel(provider),
  };
}

export function isAiProviderId(value: string): value is AiProviderId {
  return AI_PROVIDER_OPTIONS.some((option) => option.value === value);
}

export function getAiStorage(storage: Storage | null = getBrowserStorage()) {
  return storage;
}

export function loadAiConfig(storage: Storage | null = getBrowserStorage()): AiConfig {
  if (!storage) {
    return getDefaultAiConfig();
  }

  try {
    const raw = storage.getItem(AI_STORAGE_KEY);
    if (!raw) {
      return getDefaultAiConfig();
    }

    const parsed = JSON.parse(raw) as Partial<AiConfig>;
    return normalizeAiConfig(parsed);
  } catch {
    return getDefaultAiConfig();
  }
}

export function saveAiConfig(config: AiConfig, storage: Storage | null = getBrowserStorage()) {
  if (!storage) {
    return;
  }

  storage.setItem(AI_STORAGE_KEY, JSON.stringify(normalizeAiConfig(config)));
}

export function clearAiConfig(storage: Storage | null = getBrowserStorage()) {
  storage?.removeItem(AI_STORAGE_KEY);
}

export function getBrowserStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

export function hasConfiguredAi(config: AiConfig) {
  return Boolean(config.apiKey.trim() && config.model.trim());
}

export function buildKnowledgePack(notas: NotaFiscal[], question: string) {
  const metrics = getMetrics(notas);
  const selectedNotes = selectRelevantNotas(notas, question, 6);
  const supplierRows = getNotasByFornecedor(notas).slice(0, 5);
  const groupedRows = groupNotasByCnpjAndMonth(notas).slice(0, 5);

  const summaryParts = [
    `Total de notas registradas: ${metrics.totalNotas}`,
    `Valor total identificado: ${formatCurrency(metrics.valorTotal)}`,
    `Notas com alertas ativos: ${metrics.comAlertas}`,
    supplierRows.length > 0
      ? `Fornecedores com maior volume: ${supplierRows
          .map((supplier) => `${supplier.nome} (${formatCurrency(supplier.valor)})`)
          .join("; ")}`
      : undefined,
    groupedRows.length > 0
      ? `Resumo consolidado por CNPJ e mês: ${groupedRows
          .map((row) => `${row.nome_empresa} - ${row.cnpj} - ${row.year_month ? formatMonthShort(row.year_month) : "sem mês"} - ${row.quantidade} nota(s) - ${formatCurrency(row.valor_total)}`)
          .join("; ")}`
      : undefined,
    selectedNotes.length > 0 ? formatSelectedNotesBlock(selectedNotes) : "Nenhuma nota específica foi selecionada para esta pergunta.",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    summary: summaryParts,
    selectedNotes,
    sourceLabels: selectedNotes.map(formatSourceLabel),
  };
}

export function selectRelevantNotas(notas: NotaFiscal[], question: string, limit = 6) {
  const trimmedQuestion = question.trim();
  const normalizedQuestion = normalizeText(trimmedQuestion);
  const queryTokens = getQueryTokens(trimmedQuestion);

  const ranked = [...notas]
    .map((nota) => ({ nota, score: scoreNota(nota, normalizedQuestion, queryTokens) }))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return b.nota.created_at.localeCompare(a.nota.created_at);
    })
    .filter(({ score }) => score > 0);

  if (ranked.length > 0) {
    return ranked.slice(0, limit).map(({ nota }) => nota);
  }

  return [...notas]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit);
}

export function buildSystemPrompt(question: string, knowledgePack: AssistantKnowledgePack) {
  return [
    DEFAULT_SYSTEM_PROMPT,
    "",
    "Base de conhecimento atual:",
    knowledgePack.summary,
    "",
    `Pergunta do usuário: ${question}`,
  ].join("\n");
}

export async function generateAssistantReply(params: {
  config: AiConfig;
  notas: NotaFiscal[];
  history: ChatMessage[];
  question: string;
}) {
  const knowledgePack = buildKnowledgePack(params.notas, params.question);
  const messages = [
    { role: "system" as const, content: buildSystemPrompt(params.question, knowledgePack) },
    ...params.history.slice(-8).map((message) => ({ role: message.role, content: message.content })),
    { role: "user" as const, content: params.question },
  ];

  try {
    const content = await callProvider(params.config, messages);
    return {
      content,
      sources: knowledgePack.sourceLabels,
      mode: "api" as const,
    };
  } catch (error) {
    const local = buildLocalFallbackAnswer(params.question, params.notas, knowledgePack.selectedNotes);
    return {
      content: `${local}\n\nObs.: não consegui usar a API configurada agora, então respondi com uma alternativa local.`,
      sources: knowledgePack.sourceLabels,
      mode: "local" as const,
    };
  }
}

export function generateLocalReply(question: string, notas: NotaFiscal[]) {
  const knowledgePack = buildKnowledgePack(notas, question);
  return {
    content: buildLocalFallbackAnswer(question, notas, knowledgePack.selectedNotes),
    sources: knowledgePack.sourceLabels,
    mode: "local" as const,
  };
}

export async function testAiConnection(config: AiConfig, notas: NotaFiscal[] = []) {
  const prompt = "Responda apenas com OK e uma frase curta confirmando que a conexão está funcionando.";
  const knowledgePack = buildKnowledgePack(notas, prompt);
  const messages = [
    { role: "system" as const, content: buildSystemPrompt(prompt, knowledgePack) },
    { role: "user" as const, content: prompt },
  ];

  return callProvider(config, messages);
}

async function callProvider(config: AiConfig, messages: Array<{ role: "system" | "user" | "assistant"; content: string }>) {
  if (config.provider === "gemini") {
    return callGemini(config, messages);
  }

  return callOpenAiCompatible(config, messages);
}

async function callOpenAiCompatible(
  config: AiConfig,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
) {
  const baseUrl = config.provider === "groq" ? "https://api.groq.com/openai/v1" : "https://api.openai.com/v1";
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    throw new Error(await buildHttpError(response, config.provider));
  }

  const data = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string | Array<{ text?: string; type?: string }>;
      };
    }>;
  };

  return extractMessageContent(data?.choices?.[0]?.message?.content, config.provider);
}

async function callGemini(
  config: AiConfig,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
) {
  const systemMessage = messages.find((message) => message.role === "system");
  const conversation = messages.filter((message) => message.role !== "system");
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": config.apiKey,
      },
      body: JSON.stringify({
        system_instruction: systemMessage
          ? {
              parts: [{ text: systemMessage.content }],
            }
          : undefined,
        contents: conversation.map((message) => ({
          role: message.role === "assistant" ? "model" : "user",
          parts: [{ text: message.content }],
        })),
        generationConfig: {
          temperature: 0.2,
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(await buildHttpError(response, config.provider));
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };

  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const text = parts.map((part) => part.text ?? "").join("").trim();

  if (!text) {
    throw new Error("Gemini não retornou texto na resposta.");
  }

  return text;
}

function buildLocalFallbackAnswer(question: string, notas: NotaFiscal[], selectedNotas: NotaFiscal[]) {
  const normalizedQuestion = normalizeText(question);
  const hasAlerts = notas.filter((nota) => countActiveAlerts(nota) > 0);

  if (/(valor total|total identificado|quanto|soma)/.test(normalizedQuestion)) {
    const totalNotas = notas.filter((nota) => nota.valor_total !== undefined);
    const total = totalNotas.reduce((sum, nota) => sum + (nota.valor_total ?? 0), 0);
    return `O valor total identificado nas notas é ${formatCurrency(total)} em ${totalNotas.length} nota(s).`;
  }

  if (/(alerta|inconsist|erro)/.test(normalizedQuestion)) {
    if (hasAlerts.length === 0) {
      return "Não encontrei alertas ativos nas notas registradas.";
    }

    return `Encontrei ${hasAlerts.length} nota(s) com alertas ativos: ${hasAlerts
      .slice(0, 5)
      .map((nota) => `${getNotaPrimaryLabel(nota)} (${nota.emitente_nome ?? "não identificado"})`)
      .join("; ")}.`;
  }

  if (/(fornecedor|emitente|empresa|cnpj)/.test(normalizedQuestion)) {
    const fornecedores = getNotasByFornecedor(notas);
    const top = fornecedores[0];

    if (!top) {
      return "Ainda não existe fornecedor suficiente para comparação.";
    }

    return `O fornecedor com maior volume identificado é ${top.nome}, com ${formatCurrency(top.valor)} em notas.`;
  }

  if (/(quantas notas|total de notas|quantidade de notas)/.test(normalizedQuestion)) {
    return `Existem ${notas.length} nota(s) registradas no sistema.`;
  }

  if (selectedNotas.length > 0) {
    return `Encontrei ${selectedNotas.length} nota(s) possivelmente relacionadas à sua pergunta: ${selectedNotas
      .slice(0, 3)
      .map((nota) => getNotaPrimaryLabel(nota))
      .join("; ")}.`;
  }

  return "Não consegui identificar uma resposta objetiva com as notas disponíveis. Tente perguntar sobre valor total, alertas, fornecedor ou uma NF específica.";
}

function extractMessageContent(
  content?: string | Array<{ text?: string; type?: string }>,
  provider?: AiProviderId,
) {
  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    const text = content
      .map((part) => (typeof part.text === "string" ? part.text : ""))
      .join("")
      .trim();

    if (text) {
      return text;
    }
  }

  throw new Error(`O provedor ${provider ?? "selecionado"} não retornou conteúdo textual.`);
}

function formatSelectedNotesBlock(notes: NotaFiscal[]) {
  return [
    "Notas relevantes selecionadas:",
    ...notes.map((nota, index) => `  ${index + 1}. ${formatSourceLabel(nota)}\n     ${formatPromptNote(nota)}`),
  ].join("\n");
}

function formatSourceLabel(nota: NotaFiscal) {
  const primary = getNotaPrimaryLabel(nota);
  const emitter = nota.emitente_nome ?? "emitente não identificado";
  return `${primary} - ${emitter}`;
}

function formatPromptNote(nota: NotaFiscal) {
  const parts = [
    `Emitente: ${nota.emitente_nome ?? "não identificado"}${nota.emitente_cnpj ? ` (${nota.emitente_cnpj})` : ""}`,
    `Destinatário: ${nota.destinatario_nome ?? "não identificado"}${nota.destinatario_cnpj ? ` (${nota.destinatario_cnpj})` : ""}`,
    `Emissão: ${formatDate(nota.data_emissao)} | Mês: ${nota.data_emissao ? formatMonthShort(nota.data_emissao.slice(0, 7)) : "—"}`,
    `Valor total: ${formatCurrency(nota.valor_total)}`,
    `Status: ${nota.status_analise} | Alertas ativos: ${countActiveAlerts(nota)}/${nota.alertas.length}`,
  ];

  if (nota.itens.length > 0) {
    const itemPreview = nota.itens
      .slice(0, 3)
      .map((item) => item.descricao ?? item.codigo_produto ?? "item")
      .join("; ");
    parts.push(`Itens: ${itemPreview}`);
  }

  if (nota.resumo_ia) {
    parts.push(`Resumo: ${truncateText(nota.resumo_ia, 260)}`);
  }

  if (nota.informacoes_adicionais) {
    parts.push(`Informações adicionais: ${truncateText(nota.informacoes_adicionais, 180)}`);
  }

  return parts.join(" | ");
}

function scoreNota(nota: NotaFiscal, normalizedQuestion: string, queryTokens: string[]) {
  const searchableParts = [
    nota.numero_nota,
    nota.emitente_nome,
    nota.emitente_cnpj,
    nota.destinatario_nome,
    nota.destinatario_cnpj,
    nota.nome_arquivo,
    nota.resumo_ia,
    nota.informacoes_adicionais,
    nota.itens.map((item) => item.descricao).filter(Boolean).join(" "),
    nota.alertas.map((alerta) => alerta.descricao).join(" "),
  ]
    .filter(Boolean)
    .join(" ");

  const normalizedSearchable = normalizeText(searchableParts);
  let score = 0;

  if (normalizedQuestion.length === 0) {
    return scoreForRecency(nota);
  }

  if (nota.numero_nota && normalizedQuestion.includes(normalizeText(nota.numero_nota))) {
    score += 40;
  }

  if (nota.emitente_cnpj && normalizedQuestion.includes(normalizeText(nota.emitente_cnpj))) {
    score += 35;
  }

  if (nota.destinatario_cnpj && normalizedQuestion.includes(normalizeText(nota.destinatario_cnpj))) {
    score += 20;
  }

  if (nota.emitente_nome && normalizedQuestion.includes(normalizeText(nota.emitente_nome))) {
    score += 25;
  }

  if (nota.destinatario_nome && normalizedQuestion.includes(normalizeText(nota.destinatario_nome))) {
    score += 10;
  }

  queryTokens.forEach((token) => {
    if (normalizedSearchable.includes(token)) {
      score += 4;
    }

    if (nota.resumo_ia && normalizeText(nota.resumo_ia).includes(token)) {
      score += 2;
    }
  });

  if (/(alerta|inconsist|erro)/.test(normalizedQuestion) && countActiveAlerts(nota) > 0) {
    score += 18;
  }

  if (/(valor|total|soma)/.test(normalizedQuestion) && nota.valor_total !== undefined) {
    score += 8;
  }

  if (/(fornecedor|emitente|empresa)/.test(normalizedQuestion) && nota.emitente_nome) {
    score += 6;
  }

  return score;
}

function scoreForRecency(nota: NotaFiscal) {
  const time = Date.parse(nota.created_at);
  if (Number.isNaN(time)) {
    return 0;
  }

  return time;
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function getQueryTokens(question: string) {
  return normalizeText(question)
    .split(" ")
    .filter((token) => token.length > 2 && !DEFAULT_STOPWORDS.has(token));
}

async function buildHttpError(response: Response, provider: AiProviderId) {
  const rawText = await response.text();

  if (!rawText) {
    return `O provedor ${provider} retornou HTTP ${response.status}.`;
  }

  try {
    const parsed = JSON.parse(rawText) as { error?: { message?: string } };
    const providerMessage = parsed.error?.message?.trim();
    if (providerMessage) {
      return `O provedor ${provider} retornou HTTP ${response.status}: ${providerMessage}`;
    }
  } catch {
    // Keep the raw text fallback below.
  }

  return `O provedor ${provider} retornou HTTP ${response.status}: ${truncateText(rawText.replace(/\s+/g, " ").trim(), 220)}`;
}

function truncateText(value: string, limit: number) {
  if (value.length <= limit) {
    return value;
  }

  return `${value.slice(0, limit - 1).trimEnd()}…`;
}
