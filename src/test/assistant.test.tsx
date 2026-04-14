import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AdminNotesPage from "@/pages/AdminNotesPage";
import { NotasProvider } from "@/hooks/use-notas";
import { AssistantConfigProvider } from "@/hooks/use-assistant-config";
import { ChatNotasWidget } from "@/components/ChatNotasWidget";
import {
  generateAssistantReply,
  generateLocalReply,
  getDefaultAiConfig,
  loadAiConfig,
  saveAiConfig,
  selectRelevantNotas,
  type AiConfig,
} from "@/lib/assistant";
import { NOTAS_STORAGE_KEY } from "@/lib/notas";
import type { NotaFiscal } from "@/data/types";

function makeNota(params: {
  id: string;
  numero: string;
  nome: string;
  cnpj: string;
  createdAt: string;
  valor: number;
  alertas?: number;
}): NotaFiscal {
  return {
    id: params.id,
    numero_nota: params.numero,
    emitente_nome: params.nome,
    emitente_cnpj: params.cnpj,
    data_emissao: "2026-03-10",
    valor_total: params.valor,
    status_analise: params.alertas && params.alertas > 0 ? "inconsistente" : "processado",
    tipo_arquivo: "csv",
    nome_arquivo: `${params.id}.csv`,
    created_at: params.createdAt,
    updated_at: params.createdAt,
    itens: [],
    alertas: Array.from({ length: params.alertas ?? 0 }, (_, index) => ({
      id: `${params.id}-alert-${index}`,
      nota_id: params.id,
      tipo_alerta: "campo_ausente",
      descricao: `Alerta ${index + 1}`,
      status: "ativo",
      created_at: params.createdAt,
    })),
  };
}

function seedNotas(notas: NotaFiscal[]) {
  localStorage.setItem(
    NOTAS_STORAGE_KEY,
    JSON.stringify({
      notas,
      uploads: [],
    }),
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("assistant helpers", () => {
  it("seleciona a nota mais relevante para a pergunta", () => {
    const notas = [
      makeNota({ id: "1", numero: "400", nome: "4UCONNECT CONTABILIDADE E TECNOLOGIA LTDA", cnpj: "55815374000157", createdAt: "2026-03-18T10:00:00Z", valor: 275.07 }),
      makeNota({ id: "2", numero: "401", nome: "Outra Empresa", cnpj: "11222333000144", createdAt: "2026-03-19T10:00:00Z", valor: 100 }),
    ];

    const selected = selectRelevantNotas(notas, "Qual o valor da nota 400 da 4UCONNECT?", 2);
    expect(selected[0]?.id).toBe("1");
  });

  it("gera fallback local quando não há API", () => {
    const notas = [makeNota({ id: "1", numero: "400", nome: "Empresa A", cnpj: "11111111000111", createdAt: "2026-03-18T10:00:00Z", valor: 275.07 })];
    const reply = generateLocalReply("Qual o valor total?", notas);

    expect(reply.mode).toBe("local");
    expect(reply.content).toContain("valor total identificado");
  });

  it("monta o payload do Groq com contexto das notas", async () => {
    const notas = [makeNota({ id: "1", numero: "400", nome: "Empresa A", cnpj: "11111111000111", createdAt: "2026-03-18T10:00:00Z", valor: 275.07 })];
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "Resposta da API" } }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const config: AiConfig = {
      provider: "groq",
      apiKey: "test-key",
      model: "llama-3.1-8b-instant",
    };

    const reply = await generateAssistantReply({
      config,
      notas,
      history: [],
      question: "Qual o valor da nota 400?",
    });

    expect(reply.mode).toBe("api");
    expect(reply.content).toBe("Resposta da API");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect(init?.headers).toEqual(
      expect.objectContaining({
        Authorization: "Bearer test-key",
      }),
    );

    const body = JSON.parse(String(init?.body));
    expect(body.model).toBe("llama-3.1-8b-instant");
    expect(JSON.stringify(body.messages)).toContain("NF 400");
    expect(JSON.stringify(body.messages)).toContain("Empresa A");
  });

  it("monta o payload do Gemini com system instruction", async () => {
    const notas = [makeNota({ id: "1", numero: "400", nome: "Empresa A", cnpj: "11111111000111", createdAt: "2026-03-18T10:00:00Z", valor: 275.07 })];
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: "Resposta Gemini" }] } }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const config: AiConfig = {
      provider: "gemini",
      apiKey: "gemini-key",
      model: "gemini-1.5-flash",
    };

    const reply = await generateAssistantReply({
      config,
      notas,
      history: [],
      question: "Qual o valor da nota 400?",
    });

    expect(reply.mode).toBe("api");
    expect(reply.content).toBe("Resposta Gemini");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent");
    expect(init?.headers).toEqual(
      expect.objectContaining({
        "x-goog-api-key": "gemini-key",
      }),
    );

    const body = JSON.parse(String(init?.body));
    expect(JSON.stringify(body.system_instruction)).toContain("assistente fiscal");
    expect(JSON.stringify(body.contents)).toContain("Qual o valor da nota 400?");
  });
});

describe("assistant config", () => {
  it("salva e recarrega a configuração da API no navegador", () => {
    const config = {
      provider: "openai",
      apiKey: "openai-key",
      model: "gpt-4o-mini",
    } satisfies AiConfig;

    saveAiConfig(config, localStorage);
    expect(loadAiConfig(localStorage)).toEqual(config);
  });
});

describe("assistant ui", () => {
  it("envia pergunta no chat e mostra a resposta da API", async () => {
    seedNotas([
      makeNota({ id: "1", numero: "400", nome: "Empresa A", cnpj: "11111111000111", createdAt: "2026-03-18T10:00:00Z", valor: 275.07 }),
      makeNota({ id: "2", numero: "401", nome: "Empresa B", cnpj: "22222222000122", createdAt: "2026-03-19T10:00:00Z", valor: 100 }),
    ]);
    localStorage.setItem(
      "fiscal-ai-insights:assistant-config:v1",
      JSON.stringify({
        provider: "groq",
        apiKey: "test-key",
        model: "llama-3.1-8b-instant",
      }),
    );

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "A nota 400 soma R$ 275,07." } }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <NotasProvider>
        <AssistantConfigProvider>
          <MemoryRouter>
            <ChatNotasWidget mode="inline" />
          </MemoryRouter>
        </AssistantConfigProvider>
      </NotasProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Pergunte com IA" }));

    const input = await screen.findByPlaceholderText("Digite sua pergunta...");
    fireEvent.change(input, { target: { value: "Qual o valor da nota 400?" } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Enviar pergunta" }));
    });

    await waitFor(() => expect(screen.getByText("A nota 400 soma R$ 275,07.")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("carrega a configuração salva no admin", async () => {
    localStorage.setItem(
      "fiscal-ai-insights:assistant-config:v1",
      JSON.stringify({
        provider: "gemini",
        apiKey: "gemini-key",
        model: "gemini-1.5-flash",
      }),
    );

    render(
      <NotasProvider>
        <AssistantConfigProvider>
          <MemoryRouter initialEntries={["/nf-analyzer/admin"]}>
            <Routes>
              <Route path="/nf-analyzer/admin" element={<AdminNotesPage />} />
            </Routes>
          </MemoryRouter>
        </AssistantConfigProvider>
      </NotasProvider>,
    );

    expect(screen.queryByText("Configuração da IA")).not.toBeInTheDocument();

    fireEvent.click(await screen.findByRole("button", { name: "Configurar IA" }));

    expect(await screen.findByText("Configuração da IA")).toBeInTheDocument();
    expect(screen.getByText("Gemini")).toBeInTheDocument();
    expect(screen.getByLabelText("Modelo")).toHaveValue("gemini-1.5-flash");
  });
});
