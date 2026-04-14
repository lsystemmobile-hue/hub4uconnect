import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import UploadNotasPage from "@/pages/UploadNotasPage";
import NotasListPage from "@/pages/NotasListPage";
import NotaDetailPage from "@/pages/NotaDetailPage";
import { NotasProvider, useNotas } from "@/hooks/use-notas";
import { AssistantConfigProvider } from "@/hooks/use-assistant-config";
import {
  buildNotasCsv,
  buildNotasFromCsv,
  groupNotasByCnpjAndMonth,
  loadNotasState,
  NOTAS_STORAGE_KEY,
  resolveTipoArquivo,
} from "@/lib/notas";
import type { NotaFiscal } from "@/data/types";
import { readCsvFile } from "@/lib/csv-parser";

function makeCsv() {
  return [
    "Numero;Codigo de Verificacao;Emissao;UF;Valor NFSe;CPF/CNPJ Emitente;Razao Social Emitente;CPF/CNPJ Tomador;Razao Social Tomador",
    "400;;10/03/2026;SP;275.07;55.815.374/0001-57;4UCONNECT CONTABILIDADE E TECNOLOGIA LTDA;20.358.138/0001-74;RSF REPRESENTACOES LTDA",
    "401;ABC123;18/03/2026;SP;300.00;55.815.374/0001-57;4UCONNECT CONTABILIDADE E TECNOLOGIA LTDA;11.222.333/0001-44;CLIENTE TESTE LTDA",
  ].join("\n");
}

function makeCsvWithMissingFields() {
  return [
    "Numero;Emissao;Valor NFSe;CPF/CNPJ Emitente;Razao Social Emitente",
    "999;05/04/2026;100.00;55.815.374/0001-57;4UCONNECT CONTABILIDADE E TECNOLOGIA LTDA",
  ].join("\n");
}

function makeResumoNota(params: {
  id: string;
  nome: string;
  cnpj: string;
  dataEmissao: string;
  valorTotal: number;
  createdAt: string;
}): NotaFiscal {
  return {
    id: params.id,
    emitente_nome: params.nome,
    emitente_cnpj: params.cnpj,
    data_emissao: params.dataEmissao,
    valor_total: params.valorTotal,
    status_analise: "processado",
    tipo_arquivo: "csv",
    nome_arquivo: `${params.id}.csv`,
    created_at: params.createdAt,
    updated_at: params.createdAt,
    itens: [],
    alertas: [],
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

function renderNotasListPage() {
  return render(
    <NotasProvider>
      <AssistantConfigProvider>
        <MemoryRouter initialEntries={["/nf-analyzer/notas"]}>
          <Routes>
            <Route path="/nf-analyzer/notas" element={<NotasListPage />} />
          </Routes>
        </MemoryRouter>
      </AssistantConfigProvider>
    </NotasProvider>,
  );
}

let contextValue: ReturnType<typeof useNotas> | undefined;

function ContextHarness() {
  contextValue = useNotas();
  return null;
}

beforeEach(() => {
  localStorage.clear();
  contextValue = undefined;
  vi.restoreAllMocks();
});

describe("csv parser", () => {
  it("gera notas a partir das linhas do CSV", () => {
    const notas = buildNotasFromCsv({
      fileName: "iob.csv",
      csvContent: makeCsv(),
    });

    expect(notas).toHaveLength(2);
    expect(notas[0]?.numero_nota).toBe("400");
    expect(notas[0]?.data_emissao).toBe("2026-03-10");
    expect(notas[0]?.valor_total).toBe(275.07);
    expect(notas[0]?.emitente_cnpj).toBe("55815374000157");
    expect(notas[0]?.destinatario_cnpj).toBe("20358138000174");
    expect(notas[0]?.documento_tipo).toBe("nfse");
    expect(notas[0]?.tipo_arquivo).toBe("csv");
    expect(notas[0]?.csv_data?.uf).toBe("SP");
  });

  it("cria alerta quando faltam campos essenciais no CSV", () => {
    const notas = buildNotasFromCsv({
      fileName: "faltando.csv",
      csvContent: makeCsvWithMissingFields(),
    });

    expect(notas).toHaveLength(1);
    expect(notas[0]?.status_analise).toBe("inconsistente");
    expect(notas[0]?.alertas[0]?.tipo_alerta).toBe("campo_ausente");
  });

  it("resolve CSV como tipo de arquivo suportado", () => {
    const file = new File([makeCsv()], "notas.csv", { type: "text/csv" });
    expect(resolveTipoArquivo(file)).toBe("csv");
  });

  it("le arquivo CSV em windows-1252 sem quebrar o cabecalho", async () => {
    const bytes = new Uint8Array([
      0x4e, 0xfa, 0x6d, 0x65, 0x72, 0x6f, 0x3b, 0x43, 0xf3, 0x64, 0x69, 0x67, 0x6f, 0x20, 0x64, 0x65,
      0x20, 0x56, 0x65, 0x72, 0x69, 0x66, 0x69, 0x63, 0x61, 0xe7, 0xe3, 0x6f, 0x3b, 0x45, 0x6d, 0x69,
      0x73, 0x73, 0xe3, 0x6f, 0x3b, 0x55, 0x46, 0x3b, 0x56, 0x61, 0x6c, 0x6f, 0x72, 0x20, 0x4e, 0x46,
      0x53, 0x65, 0x3b, 0x43, 0x50, 0x46, 0x2f, 0x43, 0x4e, 0x50, 0x4a, 0x20, 0x45, 0x6d, 0x69, 0x74,
      0x65, 0x6e, 0x74, 0x65, 0x0d, 0x0a,
    ]);

    const file = new File([bytes], "iob.csv", { type: "text/csv" });
    const content = await readCsvFile(file);

    expect(content).toContain("Número;Código de Verificação;Emissão;UF;Valor NFSe;CPF/CNPJ Emitente");
  });
});

describe("notas store", () => {
  it("hidrata o estado a partir do localStorage", () => {
    const notas = buildNotasFromCsv({
      fileName: "iob.csv",
      csvContent: makeCsv(),
    });

    localStorage.setItem(
      NOTAS_STORAGE_KEY,
      JSON.stringify({
        notas,
        uploads: [],
      }),
    );

    const state = loadNotasState(localStorage);
    expect(state.notas).toHaveLength(2);
    expect(state.notas[0]?.nome_arquivo).toBe("iob.csv");
  });

  it("processa upload CSV, exporta resumo e remove o upload com todas as notas", async () => {
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    Object.defineProperty(URL, "createObjectURL", {
      writable: true,
      value: vi.fn(() => "blob:test"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      writable: true,
      value: vi.fn(),
    });

    render(
      <NotasProvider>
        <ContextHarness />
      </NotasProvider>,
    );

    const csvFile = new File([makeCsv()], "iob.csv", { type: "text/csv" });

    await act(async () => {
      await contextValue?.addFiles([csvFile]);
    });

    await waitFor(() => expect(contextValue?.notas).toHaveLength(2));
    expect(contextValue?.uploads).toHaveLength(1);
    expect(contextValue?.uploads[0]?.registros_processados).toBe(2);

    const csv = contextValue?.exportCsv(contextValue?.notas.map((nota) => nota.id));
    expect(csv).toContain("CNPJ;qtde;Valor;");
    expect(csv).toContain("55815374000157;2;575,07;mar/26");

    await act(async () => {
      await contextValue?.reprocessNota(contextValue?.notas[0]!.id);
    });

    expect(contextValue?.uploads[0]?.status_processamento).toBe("concluido");
    expect(contextValue?.notas).toHaveLength(2);

    act(() => {
      contextValue?.deleteUpload(contextValue?.uploads[0]!.id);
    });

    expect(contextValue?.notas).toHaveLength(0);
    expect(contextValue?.uploads).toHaveLength(0);
  });
});

describe("upload page", () => {
  it("aceita upload de CSV e mostra o historico", async () => {
    const { container } = render(
      <NotasProvider>
        <UploadNotasPage />
      </NotasProvider>,
    );

    const input = container.querySelector("#file-input") as HTMLInputElement;
    const csvFile = new File([makeCsv()], "iob.csv", { type: "text/csv" });

    await act(async () => {
      fireEvent.change(input, { target: { files: [csvFile] } });
    });

    await waitFor(() => expect(screen.getByText("Historico de uploads (1)")).toBeInTheDocument());
    expect(screen.getByText("Arquivo processado com sucesso")).toBeInTheDocument();
    expect(screen.getByText("2 notas importadas deste CSV")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Limpar todos" })).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Limpar todos" }));
    });

    await waitFor(() => expect(screen.queryByText("Historico de uploads (1)")).not.toBeInTheDocument());
    expect(screen.getByText("Nenhum upload registrado ainda. Os arquivos enviados aparecerao aqui e continuarao disponiveis neste navegador.")).toBeInTheDocument();
    expect(input.accept).toContain(".csv");
  });
});

describe("nota detail page", () => {
  it("mostra os dados importados do CSV", async () => {
    const nota = buildNotasFromCsv({
      fileName: "iob.csv",
      csvContent: makeCsv(),
    })[0]!;

    localStorage.setItem(
      NOTAS_STORAGE_KEY,
      JSON.stringify({
        notas: [nota],
        uploads: [],
      }),
    );

    render(
      <NotasProvider>
        <MemoryRouter initialEntries={[`/notas/${nota.id}`]}>
          <Routes>
            <Route path="/notas/:id" element={<NotaDetailPage />} />
          </Routes>
        </MemoryRouter>
      </NotasProvider>,
    );

    expect(screen.getByText("Dados do CSV")).toBeInTheDocument();
    expect(screen.getAllByText("4UCONNECT CONTABILIDADE E TECNOLOGIA LTDA").length).toBeGreaterThan(0);
  });
});

describe("csv helper", () => {
  it("gera resumo IOB agrupado por CNPJ e mes", () => {
    const notas = buildNotasFromCsv({
      fileName: "iob.csv",
      csvContent: makeCsv(),
    });
    const abril = {
      ...notas[0],
      id: "abril",
      data_emissao: "2026-04-02",
      valor_total: 100,
      valor_produtos: 100,
    };
    const incompleta = {
      ...notas[0],
      id: "ignorar",
      emitente_cnpj: undefined,
    };

    const csv = buildNotasCsv([notas[0], notas[1], abril, incompleta]);
    const lines = csv.split("\n");

    expect(lines[0]).toContain("CNPJ;qtde;Valor;");
    expect(lines[1]).toBe("55815374000157;1;100,00;abr/26");
    expect(lines[2]).toBe("55815374000157;2;575,07;mar/26");
  });
});

describe("resumo consolidado", () => {
  it("agrupa a mesma empresa no mesmo mes e soma quantidade e valor", () => {
    const rows = groupNotasByCnpjAndMonth([
      makeResumoNota({
        id: "1",
        nome: "4UCONNECT CONTABILIDADE E TECNOLOGIA LTDA",
        cnpj: "55.815.374/0001-57",
        dataEmissao: "2026-03-10",
        valorTotal: 275.07,
        createdAt: "2026-03-10T10:00:00Z",
      }),
      makeResumoNota({
        id: "2",
        nome: "4UCONNECT CONTABILIDADE E TECNOLOGIA LTDA",
        cnpj: "55.815.374/0001-57",
        dataEmissao: "2026-03-18",
        valorTotal: 300,
        createdAt: "2026-03-18T10:00:00Z",
      }),
      makeResumoNota({
        id: "3",
        nome: "4UCONNECT CONTABILIDADE E TECNOLOGIA LTDA",
        cnpj: "55.815.374/0001-57",
        dataEmissao: "2026-04-02",
        valorTotal: 100,
        createdAt: "2026-04-02T10:00:00Z",
      }),
      makeResumoNota({
        id: "4",
        nome: "Outra Empresa Ltda",
        cnpj: "11.222.333/0001-44",
        dataEmissao: "2026-03-07",
        valorTotal: 50,
        createdAt: "2026-03-07T10:00:00Z",
      }),
    ]);

    expect(rows).toHaveLength(3);
    expect(rows[0]?.year_month).toBe("2026-04");
    expect(rows[0]?.quantidade).toBe(1);
    expect(rows[0]?.valor_total).toBe(100);
    expect(rows[1]?.year_month).toBe("2026-03");
    expect(rows[1]?.quantidade).toBe(2);
    expect(rows[1]?.valor_total).toBeCloseTo(575.07, 2);
    expect(rows[2]?.cnpj).toBe("11.222.333/0001-44");
  });

  it("mantem a paginação sobre as linhas consolidadas", async () => {
    const notas = Array.from({ length: 9 }, (_, index) =>
      makeResumoNota({
        id: String(index + 1),
        nome: `Empresa ${index + 1}`,
        cnpj: `00.000.000/000${index + 1}-${String(index + 1).padStart(2, "0")}`,
        dataEmissao: "2026-03-15",
        valorTotal: 100,
        createdAt: `2026-03-${String(index + 1).padStart(2, "0")}T10:00:00Z`,
      }),
    );

    seedNotas(notas);
    renderNotasListPage();

    await waitFor(() => expect(screen.getByText("Pagina 1 de 2")).toBeInTheDocument());
    expect(screen.getByText("Empresa 1")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Proxima pagina" }));
    });

    await waitFor(() => expect(screen.getByText("Pagina 2 de 2")).toBeInTheDocument());
  });

  it("permite ver todas as linhas e voltar para a paginação", async () => {
    const notas = Array.from({ length: 9 }, (_, index) =>
      makeResumoNota({
        id: String(index + 1),
        nome: `Empresa ${index + 1}`,
        cnpj: `00.000.000/000${index + 1}-${String(index + 1).padStart(2, "0")}`,
        dataEmissao: "2026-03-15",
        valorTotal: 100,
        createdAt: `2026-03-${String(index + 1).padStart(2, "0")}T10:00:00Z`,
      }),
    );

    seedNotas(notas);
    renderNotasListPage();

    await waitFor(() => expect(screen.getByText("Pagina 1 de 2")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Ver todos" }));
    });

    await waitFor(() => expect(screen.getByText("Ver todos (9 linhas)")).toBeInTheDocument());
    expect(screen.getByText("Empresa 9")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pagina anterior" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Proxima pagina" })).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Voltar à paginação" }));
    });

    await waitFor(() => expect(screen.getByText("Pagina 1 de 2")).toBeInTheDocument());
    expect(screen.queryByText("Ver todos (9 linhas)")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Proxima pagina" })).toBeInTheDocument();
  });
});

