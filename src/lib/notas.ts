import {
  AlertaNota,
  ArquivoUpload,
  CsvImportedRowData,
  ItemNota,
  NormalizedNfseData,
  NotaFiscal,
  StatusAlerta,
  StatusAnalise,
  TipoAlerta,
  TipoArquivo,
  UploadedXmlParseResult,
  UploadedXmlParseSuccessResult,
} from "@/data/types";
import { ParsedCsvRow, parseUploadedCsv } from "@/lib/csv-parser";
import { parseUploadedXml, parseXml } from "@/lib/xml-parser";

export interface NotasState {
  notas: NotaFiscal[];
  uploads: ArquivoUpload[];
}

export interface ResumoIobRow {
  key: string;
  representative_nota_id: string;
  nome_empresa: string;
  cnpj: string;
  year_month?: string;
  quantidade: number;
  valor_total: number;
  nota_ids: string[];
  groupable: boolean;
}

export interface ParseCsvOptions {
  fileName: string;
  csvContent: string;
  existingNotas?: NotaFiscal[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ParseXmlOptions {
  fileName: string;
  xml: string;
  existingNotas?: NotaFiscal[];
  noteId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const NOTAS_STORAGE_KEY = "fiscal-ai-insights:notas-state:v1";

export const EMPTY_NOTAS_STATE: NotasState = {
  notas: [],
  uploads: [],
};

export function generateId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2, 10);
}

export function nowIso() {
  return new Date().toISOString();
}

export function loadNotasState(storage: Storage | null = getBrowserStorage()): NotasState {
  if (!storage) {
    return EMPTY_NOTAS_STATE;
  }

  try {
    const raw = storage.getItem(NOTAS_STORAGE_KEY);
    if (!raw) {
      return EMPTY_NOTAS_STATE;
    }

    const parsed = JSON.parse(raw) as Partial<NotasState>;

    return {
      notas: Array.isArray(parsed.notas) ? sortNotas(parsed.notas as NotaFiscal[]) : [],
      uploads: Array.isArray(parsed.uploads) ? sortUploads(parsed.uploads as ArquivoUpload[]) : [],
    };
  } catch {
    return EMPTY_NOTAS_STATE;
  }
}

export function saveNotasState(state: NotasState, storage: Storage | null = getBrowserStorage()) {
  if (!storage) {
    return;
  }

  storage.setItem(NOTAS_STORAGE_KEY, JSON.stringify(state));
}

export function getBrowserStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

export function sortNotas(notas: NotaFiscal[]) {
  return [...notas].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function sortUploads(uploads: ArquivoUpload[]) {
  return [...uploads].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function formatMonthShort(yearMonth?: string) {
  if (!yearMonth) {
    return "—";
  }

  const [year, month] = yearMonth.split("-");
  const monthIndex = Number(month);
  const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

  if (!year || !monthIndex || monthIndex < 1 || monthIndex > 12) {
    return yearMonth;
  }

  return `${months[monthIndex - 1]}/${year.slice(-2)}`;
}

export function upsertUpload(uploads: ArquivoUpload[], upload: ArquivoUpload) {
  const nextUploads = uploads.some((current) => current.id === upload.id)
    ? uploads.map((current) => (current.id === upload.id ? upload : current))
    : [upload, ...uploads];

  return sortUploads(nextUploads);
}

export function replaceNota(notas: NotaFiscal[], nota: NotaFiscal) {
  const nextNotas = notas.some((current) => current.id === nota.id)
    ? notas.map((current) => (current.id === nota.id ? nota : current))
    : [nota, ...notas];

  return sortNotas(nextNotas);
}

export function removeNotaAndUploads(state: NotasState, notaId: string): NotasState {
  const nextUploads = state.uploads.flatMap((upload) => {
    const noteIds = getUploadNoteIds(upload);
    if (!noteIds.includes(notaId)) {
      return [upload];
    }

    const remainingIds = noteIds.filter((currentId) => currentId !== notaId);
    if (remainingIds.length === 0) {
      return [];
    }

    return [{
      ...upload,
      nota_id: remainingIds[0],
      nota_ids: remainingIds,
      registros_processados: remainingIds.length,
    }];
  });

  return {
    notas: state.notas.filter((nota) => nota.id !== notaId),
    uploads: sortUploads(nextUploads),
  };
}

export function removeUpload(state: NotasState, uploadId: string): NotasState {
  const upload = state.uploads.find((current) => current.id === uploadId);
  if (!upload) {
    return state;
  }

  const noteIds = getUploadNoteIds(upload);
  if (noteIds.length > 0) {
    return {
      notas: state.notas.filter((nota) => !noteIds.includes(nota.id)),
      uploads: state.uploads.filter((current) => current.id !== uploadId),
    };
  }

  return {
    ...state,
    uploads: state.uploads.filter((current) => current.id !== uploadId),
  };
}

export function removeAllUploads(state: NotasState): NotasState {
  const noteIds = new Set<string>();

  state.uploads.forEach((upload) => {
    getUploadNoteIds(upload).forEach((noteId) => noteIds.add(noteId));
  });

  return {
    notas: state.notas.filter((nota) => !noteIds.has(nota.id)),
    uploads: [],
  };
}

export function resolveNotaAlertas(nota: NotaFiscal, updatedAt = nowIso()): NotaFiscal {
  const alertas = nota.alertas.map((alerta) => ({
    ...alerta,
    status: "resolvido" as StatusAlerta,
  }));

  return {
    ...nota,
    alertas,
    status_analise: "processado",
    updated_at: updatedAt,
    resumo_ia: buildResumoAutomatico({
      ...nota,
      alertas,
      status_analise: "processado",
    }),
  };
}

export function createPendingNota(fileName: string, tipoArquivo: TipoArquivo, createdAt = nowIso()): NotaFiscal {
  const nota: NotaFiscal = {
    id: generateId(),
    tipo_arquivo: tipoArquivo,
    nome_arquivo: fileName,
    status_analise: "pendente",
    created_at: createdAt,
    updated_at: createdAt,
    itens: [],
    alertas: [],
  };

  return {
    ...nota,
    resumo_ia: buildResumoAutomatico(nota),
  };
}

export function createUploadRecord(params: {
  id?: string;
  notaId?: string;
  noteIds?: string[];
  fileName: string;
  tipoArquivo: TipoArquivo;
  status: ArquivoUpload["status_processamento"];
  createdAt?: string;
  size?: number;
  originalContent?: string;
  errorMessage?: string;
  processedCount?: number;
}): ArquivoUpload {
  return {
    id: params.id ?? generateId(),
    nota_id: params.notaId,
    nota_ids: params.noteIds,
    nome_arquivo: params.fileName,
    tipo_arquivo: params.tipoArquivo,
    status_processamento: params.status,
    tamanho_bytes: params.size,
    registros_processados: params.processedCount,
    conteudo_original: params.originalContent,
    mensagem_erro: params.errorMessage,
    created_at: params.createdAt ?? nowIso(),
  };
}

export function resolveTipoArquivo(file: Pick<File, "name" | "type">): TipoArquivo | null {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (file.type === "text/csv" || file.type === "application/csv" || extension === "csv") {
    return "csv";
  }

  return null;
}

export function buildNotasFromCsv(options: ParseCsvOptions): NotaFiscal[] {
  const createdAt = options.createdAt ?? nowIso();
  const updatedAt = options.updatedAt ?? nowIso();
  const parsedRows = parseUploadedCsv({
    fileName: options.fileName,
    csvContent: options.csvContent,
  });

  return parsedRows.map((row) =>
    buildNotaFromCsvRow(row, {
      fileName: options.fileName,
      existingNotas: options.existingNotas ?? [],
      createdAt,
      updatedAt,
    })
  );
}

function buildNotaFromCsvRow(
  row: ParsedCsvRow,
  options: {
    fileName: string;
    existingNotas: NotaFiscal[];
    createdAt: string;
    updatedAt: string;
  },
): NotaFiscal {
  const noteId = generateId();
  const csvData: CsvImportedRowData = {
    linha_origem: row.linha_origem,
    numero: row.numero,
    codigo_verificacao: row.codigo_verificacao,
    emissao_original: row.emissao_original,
    uf: row.uf,
    valor_nfse: row.valor_nfse,
    emitente_cnpj: row.emitente_cnpj,
    emitente_nome: row.emitente_nome,
    tomador_cnpj: row.tomador_cnpj,
    tomador_nome: row.tomador_nome,
  };

  const notaBase: NotaFiscal = {
    id: noteId,
    numero_nota: row.numero ?? undefined,
    data_emissao: normalizeCsvDate(row.emissao_original),
    emitente_nome: row.emitente_nome ?? undefined,
    emitente_cnpj: row.emitente_cnpj ?? undefined,
    destinatario_nome: row.tomador_nome ?? undefined,
    destinatario_cnpj: row.tomador_cnpj ?? undefined,
    valor_total: toUndefined(row.valor_nfse),
    valor_produtos: toUndefined(row.valor_nfse),
    documento_tipo: "nfse",
    csv_data: csvData,
    status_analise: "processado",
    tipo_arquivo: "csv",
    nome_arquivo: options.fileName,
    informacoes_adicionais: buildCsvAdditionalInfo(csvData),
    created_at: options.createdAt,
    updated_at: options.updatedAt,
    itens: [],
    alertas: [],
  };

  const alertas = buildAlertasFromNota(notaBase, options.existingNotas, options.updatedAt);
  const nota: NotaFiscal = {
    ...notaBase,
    alertas,
    status_analise: (hasActiveAlerts(alertas) ? "inconsistente" : "processado") as StatusAnalise,
  };

  return {
    ...nota,
    resumo_ia: buildResumoAutomatico(nota),
  };
}

export function buildNotaFromXml(options: ParseXmlOptions): NotaFiscal {
  let document: Document;

  try {
    document = parseXml(options.xml).document;
  } catch {
    throw new Error("Falha em parse_xml: XML inválido.");
  }

  const infNFe = getElementsByLocalName(document, "infNFe")[0];
  if (!infNFe) {
    const resumoNfe = getElementsByLocalName(document, "resNFe")[0];
    if (resumoNfe) {
      return buildNotaFromResumoXml(options, resumoNfe);
    }

    const parseResult = parseUploadedXml({
      fileName: options.fileName,
      xmlContent: options.xml,
    });

    if (!parseResult.identified) {
      throw new Error(buildXmlFailureMessage(parseResult));
    }

    return buildNotaFromNfse(options, parseResult);
  }

  const ide = findFirstChildByLocalName(infNFe, "ide");
  const emit = findFirstChildByLocalName(infNFe, "emit");
  const dest = findFirstChildByLocalName(infNFe, "dest");
  const total = getElementsByLocalName(infNFe, "ICMSTot")[0];
  const noteId = options.noteId ?? generateId();
  const itens = getElementsByLocalName(infNFe, "det").map((det) => buildItemFromDet(det, noteId));

  const createdAt = options.createdAt ?? nowIso();
  const updatedAt = options.updatedAt ?? nowIso();

  const notaBase: NotaFiscal = {
    id: noteId,
    numero_nota: getText(ide, "nNF"),
    serie: getText(ide, "serie"),
    chave_acesso: extractChaveAcesso(infNFe, document),
    data_emissao: normalizeDate(getText(ide, "dhEmi") ?? getText(ide, "dEmi")),
    emitente_nome: getText(emit, "xNome"),
    emitente_cnpj: getText(emit, "CNPJ") ?? getText(emit, "CPF"),
    emitente_ie: getText(emit, "IE"),
    emitente_endereco: buildEndereco(emit, "enderEmit"),
    destinatario_nome: getText(dest, "xNome"),
    destinatario_cnpj: getText(dest, "CNPJ") ?? getText(dest, "CPF"),
    valor_total: parseNumber(getText(total, "vNF")),
    valor_produtos: parseNumber(getText(total, "vProd")),
    valor_impostos: parseNumber(getText(total, "vTotTrib")),
    valor_frete: parseNumber(getText(total, "vFrete")),
    valor_desconto: parseNumber(getText(total, "vDesc")),
    icms: parseNumber(getText(total, "vICMS")),
    ipi: parseNumber(getText(total, "vIPI")),
    pis: parseNumber(getText(total, "vPIS")),
    cofins: parseNumber(getText(total, "vCOFINS")),
    base_calculo_icms: parseNumber(getText(total, "vBC")),
    documento_tipo: "nfe",
    status_analise: "processado",
    tipo_arquivo: "xml",
    nome_arquivo: options.fileName,
    created_at: createdAt,
    updated_at: updatedAt,
    itens,
    alertas: [],
  };

  const valorImpostosCalculado = notaBase.valor_impostos ?? sumDefinedNumbers([
    notaBase.icms,
    notaBase.ipi,
    notaBase.pis,
    notaBase.cofins,
  ]);

  const notaComValores: NotaFiscal = {
    ...notaBase,
    valor_impostos: valorImpostosCalculado,
  };

  const alertas = buildAlertasFromNota(notaComValores, options.existingNotas ?? [], updatedAt);
  const nota: NotaFiscal = {
    ...notaComValores,
    alertas,
    status_analise: (hasActiveAlerts(alertas) ? "inconsistente" : "processado") as StatusAnalise,
  };

  return {
    ...nota,
    resumo_ia: buildResumoAutomatico(nota),
  };
}

function buildNotaFromNfse(
  options: ParseXmlOptions,
  parseResult: UploadedXmlParseSuccessResult,
): NotaFiscal {
  const noteId = options.noteId ?? generateId();
  const createdAt = options.createdAt ?? nowIso();
  const updatedAt = options.updatedAt ?? nowIso();
  const data = parseResult.data;
  const valorImpostos = sumDefinedNumbers([
    toUndefined(data.valores.issqn),
    toUndefined(data.valores.valor_total_retido),
  ]);
  const valorTotal = toUndefined(data.valores.valor_liquido) ?? toUndefined(data.valores.valor_servico);
  const valorServico = toUndefined(data.valores.valor_servico);
  const itens = buildServicoItemsFromNfse(data, noteId);

  const notaBase: NotaFiscal = {
    id: noteId,
    numero_nota: toUndefined(data.numero_nota),
    serie: undefined,
    chave_acesso: undefined,
    data_emissao: toUndefined(data.data_emissao),
    emitente_nome: toUndefined(data.prestador.nome),
    emitente_cnpj: toUndefined(data.prestador.cnpj),
    emitente_ie: toUndefined(data.prestador.inscricao_municipal),
    emitente_endereco: toUndefined(data.prestador.endereco_completo),
    destinatario_nome: toUndefined(data.tomador.nome),
    destinatario_cnpj: toUndefined(data.tomador.cpf_cnpj),
    valor_total: valorTotal,
    valor_produtos: valorServico,
    valor_impostos: valorImpostos,
    valor_desconto: undefined,
    icms: undefined,
    ipi: undefined,
    pis: undefined,
    cofins: undefined,
    base_calculo_icms: undefined,
    documento_tipo: "nfse",
    xml_parse_result: parseResult,
    nfse_data: parseResult.data,
    xml_diagnostics: parseResult.diagnostics,
    status_analise: "processado",
    tipo_arquivo: "xml",
    nome_arquivo: options.fileName,
    created_at: createdAt,
    updated_at: updatedAt,
    itens,
    alertas: [],
  };

  const alertas = buildAlertasFromNota(notaBase, options.existingNotas ?? [], updatedAt);
  const nota: NotaFiscal = {
    ...notaBase,
    alertas,
    status_analise: (hasActiveAlerts(alertas) ? "inconsistente" : "processado") as StatusAnalise,
  };

  return {
    ...nota,
    resumo_ia: buildResumoAutomatico(nota),
  };
}

function buildNotaFromResumoXml(options: ParseXmlOptions, resumoNfe: Element): NotaFiscal {
  const noteId = options.noteId ?? generateId();
  const createdAt = options.createdAt ?? nowIso();
  const updatedAt = options.updatedAt ?? nowIso();
  const chaveAcesso = getText(resumoNfe, "chNFe");

  const alertas: AlertaNota[] = [
    createAlerta(
      noteId,
      "estrutura_incompleta",
      "XML resumido importado sem itens, destinatário e tributos detalhados.",
      updatedAt,
    ),
  ];

  if (
    chaveAcesso &&
    (options.existingNotas ?? []).some(
      (existingNota) => existingNota.id !== noteId && existingNota.chave_acesso === chaveAcesso,
    )
  ) {
    alertas.push(
      createAlerta(
        noteId,
        "possivel_duplicidade",
        `Já existe uma nota com a mesma chave de acesso (${chaveAcesso}).`,
        updatedAt,
      ),
    );
  }

  const notaBase: NotaFiscal = {
    id: noteId,
    chave_acesso: chaveAcesso,
    data_emissao: normalizeDate(getText(resumoNfe, "dhEmi") ?? getText(resumoNfe, "dhRecbto")),
    emitente_nome: getText(resumoNfe, "xNome"),
    emitente_cnpj: getText(resumoNfe, "CNPJ") ?? getText(resumoNfe, "CPF"),
    emitente_ie: getText(resumoNfe, "IE"),
    valor_total: parseNumber(getText(resumoNfe, "vNF")),
    documento_tipo: "nfe",
    status_analise: alertas.some((alerta) => alerta.tipo_alerta === "possivel_duplicidade")
      ? "inconsistente"
      : "pendente",
    tipo_arquivo: "xml",
    nome_arquivo: options.fileName,
    created_at: createdAt,
    updated_at: updatedAt,
    itens: [],
    alertas,
  };

  return {
    ...notaBase,
    resumo_ia: buildResumoAutomatico(notaBase),
  };
}

function buildServicoItemsFromNfse(data: NormalizedNfseData, notaId: string): ItemNota[] {
  if (!data.servico.descricao) {
    return [];
  }

  const valorServico = toUndefined(data.valores.valor_servico) ?? toUndefined(data.valores.valor_liquido);

  return [
    {
      id: generateId(),
      nota_id: notaId,
      descricao: data.servico.descricao,
      codigo_produto:
        toUndefined(data.servico.codigo_tributario_municipal) ??
        toUndefined(data.servico.codigo_tributario_nacional),
      quantidade: 1,
      unidade: "SV",
      valor_unitario: valorServico,
      valor_total: valorServico,
    },
  ];
}

function buildXmlFailureMessage(parseResult: UploadedXmlParseResult) {
  const rootTag = parseResult.diagnostics.rootTag
    ? ` Raiz: ${parseResult.diagnostics.rootTag}.`
    : "";
  const foundTags = parseResult.diagnostics.foundTags.length > 0
    ? ` Tags encontradas: ${parseResult.diagnostics.foundTags.join(", ")}.`
    : "";
  const warnings = parseResult.diagnostics.warnings.length > 0
    ? ` Diagnóstico: ${parseResult.diagnostics.warnings.join(" | ")}.`
    : "";

  const message = !parseResult.identified ? (parseResult as any).message : "Identificado com sucesso";
  return `Falha em ${parseResult.diagnostics.stage}: ${message}.${rootTag}${foundTags}${warnings}`.trim();
}

function toUndefined<T>(value: T | null | undefined) {
  return value === null ? undefined : value;
}

export function buildAlertasFromNota(nota: NotaFiscal, existingNotas: NotaFiscal[], createdAt = nowIso()) {
  const alertas: AlertaNota[] = [];
  const camposAusentes = getCamposEssenciaisAusentes(nota);

  if (camposAusentes.length > 0) {
    alertas.push(
      createAlerta(
        nota.id,
        "campo_ausente",
        `Campos essenciais não identificados: ${camposAusentes.join(", ")}.`,
        createdAt,
      ),
    );
  }

  const somaItens = nota.itens.reduce((sum, item) => sum + (item.valor_total ?? 0), 0);
  if (nota.itens.length > 0 && nota.valor_produtos !== undefined && Math.abs(somaItens - nota.valor_produtos) > 0.01) {
    alertas.push(
      createAlerta(
        nota.id,
        "inconsistencia_valor",
        `Diferença de ${formatCurrency(Math.abs(somaItens - nota.valor_produtos))} entre a soma dos itens e o valor de produtos informado.`,
        createdAt,
      ),
    );
  }

  if (
    nota.chave_acesso &&
    existingNotas.some(
      (existingNota) => existingNota.id !== nota.id && existingNota.chave_acesso === nota.chave_acesso,
    )
  ) {
    alertas.push(
      createAlerta(
        nota.id,
        "possivel_duplicidade",
        `Já existe uma nota com a mesma chave de acesso (${nota.chave_acesso}).`,
        createdAt,
      ),
    );
  }

  return alertas;
}

export function countActiveAlerts(nota: NotaFiscal) {
  return nota.alertas.filter((alerta) => alerta.status === "ativo").length;
}

export function hasActiveAlerts(alertas: AlertaNota[]) {
  return alertas.some((alerta) => alerta.status === "ativo");
}

export function getMetrics(notas: NotaFiscal[]) {
  const identificadas = notas.filter((nota) => nota.valor_total !== undefined);
  const fornecedores = new Set(
    notas
      .map((nota) => nota.emitente_cnpj ?? nota.emitente_nome)
      .filter((fornecedor): fornecedor is string => Boolean(fornecedor)),
  );

  return {
    totalNotas: notas.length,
    valorTotal: identificadas.reduce((sum, nota) => sum + (nota.valor_total ?? 0), 0),
    fornecedores: fornecedores.size,
    comAlertas: notas.filter((nota) => countActiveAlerts(nota) > 0).length,
  };
}

export function getNotasByMonth(notas: NotaFiscal[]) {
  const months: Record<string, number> = {};

  notas.forEach((nota) => {
    if (!nota.data_emissao) {
      return;
    }

    const month = nota.data_emissao.slice(0, 7);
    if (!month) {
      return;
    }

    months[month] = (months[month] ?? 0) + 1;
  });

  return Object.entries(months)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, total]) => ({ mes, total }));
}

export function getNotasByFornecedor(notas: NotaFiscal[]) {
  const fornecedores: Record<string, { nome: string; total: number; valor: number }> = {};

  notas.forEach((nota) => {
    const id = nota.emitente_cnpj ?? nota.emitente_nome;
    const nome = nota.emitente_nome ?? nota.emitente_cnpj;

    if (!id || !nome || nota.valor_total === undefined) {
      return;
    }

    if (!fornecedores[id]) {
      fornecedores[id] = {
        nome,
        total: 0,
        valor: 0,
      };
    }

    fornecedores[id].total += 1;
    fornecedores[id].valor += nota.valor_total;
  });

  return Object.values(fornecedores).sort((a, b) => b.valor - a.valor);
}

export function groupNotasByCnpjAndMonth(notas: NotaFiscal[]): ResumoIobRow[] {
  const grouped = new Map<string, ResumoIobRow & { created_at: string }>();

  notas.forEach((nota) => {
    const cnpj = nota.emitente_cnpj ?? "—";
    const nomeEmpresa = nota.emitente_nome ?? nota.nome_arquivo;
    const yearMonth = extractYearMonth(nota.data_emissao);
    const groupable = Boolean(nota.emitente_cnpj && yearMonth);
    const key = groupable ? `${nota.emitente_cnpj}__${yearMonth}` : `single:${nota.id}`;
    const valorNota = nota.valor_total ?? 0;
    const existing = grouped.get(key);

    if (existing) {
      existing.quantidade += 1;
      existing.valor_total += valorNota;
      existing.nota_ids.push(nota.id);
      if (!existing.year_month && yearMonth) {
        existing.year_month = yearMonth;
      }
      return;
    }

    grouped.set(key, {
      key,
      representative_nota_id: nota.id,
      nome_empresa: nomeEmpresa,
      cnpj,
      year_month: yearMonth ?? undefined,
      quantidade: 1,
      valor_total: valorNota,
      nota_ids: [nota.id],
      groupable,
      created_at: nota.created_at,
    });
  });

  return [...grouped.values()]
    .sort((a, b) => {
      if (a.groupable && b.groupable) {
        if ((a.year_month ?? "") !== (b.year_month ?? "")) {
          return (b.year_month ?? "").localeCompare(a.year_month ?? "");
        }

        if (a.valor_total !== b.valor_total) {
          return b.valor_total - a.valor_total;
        }

        if (a.cnpj !== b.cnpj) {
          return a.cnpj.localeCompare(b.cnpj);
        }

        return a.nome_empresa.localeCompare(b.nome_empresa);
      }

      if (a.groupable !== b.groupable) {
        return a.groupable ? -1 : 1;
      }

      return b.created_at.localeCompare(a.created_at);
    })
    .map(({ created_at: _createdAt, ...row }) => row);
}

export function buildNotasCsv(notas: NotaFiscal[]) {
  const headers = ["CNPJ", "qtde", "Valor", "mês"];
  const rows = groupNotasByCnpjAndMonth(notas)
    .filter((row) => row.groupable && row.year_month)
    .sort((a, b) => {
      if ((a.year_month ?? "") !== (b.year_month ?? "")) {
        return (b.year_month ?? "").localeCompare(a.year_month ?? "");
      }

      if (a.valor_total !== b.valor_total) {
        return b.valor_total - a.valor_total;
      }

      return a.cnpj.localeCompare(b.cnpj);
    })
    .map((group) => [
      group.cnpj,
      String(group.quantidade),
      formatCsvDecimal(group.valor_total),
      formatMonthShort(group.year_month),
    ]);

  return [headers, ...rows].map((row) => row.map(escapeCsvValue).join(";")).join("\n");
}

export function downloadCsv(csvContent: string, fileName = "resumo-iob.csv") {
  if (typeof window === "undefined" || typeof URL === "undefined") {
    return;
  }

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.click();

  URL.revokeObjectURL(url);
}

export function formatCurrency(value?: number) {
  if (value === undefined) {
    return "Não identificado";
  }

  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

export function formatDate(value?: string) {
  if (!value) {
    return "Não identificado";
  }

  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year || !month || !day) {
    return value;
  }

  return `${day}/${month}/${year}`;
}

function extractYearMonth(value: string) {
  const [year, month] = value.slice(0, 7).split("-");
  if (!year || !month || year.length !== 4 || month.length !== 2) {
    return null;
  }

  return `${year}-${month}`;
}

function formatCsvDecimal(value: number) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function normalizeCsvDate(value?: string | null) {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const [datePart] = trimmed.split(" ");
  const [day, month, year] = datePart.split("/");
  if (!day || !month || !year) {
    return undefined;
  }

  return `${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function buildCsvAdditionalInfo(csvData: CsvImportedRowData) {
  const parts = [
    csvData.codigo_verificacao ? `Codigo de verificacao: ${csvData.codigo_verificacao}` : undefined,
    csvData.uf ? `UF: ${csvData.uf}` : undefined,
    `Linha do CSV: ${csvData.linha_origem}`,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" | ") : undefined;
}

function getUploadNoteIds(upload: ArquivoUpload) {
  const noteIds = upload.nota_ids?.filter(Boolean) ?? [];
  if (noteIds.length > 0) {
    return noteIds;
  }

  return upload.nota_id ? [upload.nota_id] : [];
}

export function getNotaPrimaryLabel(nota: NotaFiscal) {
  if (nota.numero_nota) {
    return `NF ${nota.numero_nota}`;
  }

  return nota.nome_arquivo;
}

export function buildResumoAutomatico(nota: NotaFiscal) {
  const documentoTipoLabel =
    nota.documento_tipo === "nfse"
      ? "NFS-e"
      : nota.documento_tipo === "nfe"
        ? "NFe"
        : undefined;

  const primeiraParte = [
    documentoTipoLabel,
    getNotaPrimaryLabel(nota),
    nota.emitente_nome ? `emitida por ${nota.emitente_nome}` : undefined,
    nota.destinatario_nome ? `para ${nota.destinatario_nome}` : undefined,
    nota.data_emissao ? `em ${formatDate(nota.data_emissao)}` : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  const detalhes = [
    nota.itens.length > 0
      ? `${nota.itens.length} item(ns) identificado(s)`
      : "nenhum item identificado",
    nota.valor_total !== undefined ? `valor total identificado de ${formatCurrency(nota.valor_total)}` : undefined,
    countActiveAlerts(nota) > 0 ? `${countActiveAlerts(nota)} alerta(s) ativo(s)` : "sem alertas ativos",
  ]
    .filter(Boolean)
    .join(", ");

  return `${primeiraParte || nota.nome_arquivo}. ${detalhes}.`;
}

function buildItemFromDet(det: Element, notaId: string): ItemNota {
  const prod = findFirstChildByLocalName(det, "prod");

  return {
    id: generateId(),
    nota_id: notaId,
    descricao: getText(prod, "xProd"),
    codigo_produto: getText(prod, "cProd"),
    ncm: getText(prod, "NCM"),
    cfop: getText(prod, "CFOP"),
    cst: getItemCst(det),
    quantidade: parseNumber(getText(prod, "qCom")),
    unidade: getText(prod, "uCom"),
    valor_unitario: parseNumber(getText(prod, "vUnCom")),
    valor_total: parseNumber(getText(prod, "vProd")),
  };
}

function getItemCst(det: Element) {
  return getText(det, "CST") ?? getText(det, "CSOSN");
}

function extractChaveAcesso(infNFe: Element, document: Document) {
  const id = infNFe.getAttribute("Id");
  if (id) {
    return id.replace(/^NFe/, "");
  }

  return getText(document, "chNFe");
}

function buildEndereco(root: Element | undefined, addressTag: string) {
  const endereco = getElementsByLocalName(root, addressTag)[0];
  if (!endereco) {
    return undefined;
  }

  const parts = [
    getText(endereco, "xLgr"),
    getText(endereco, "nro"),
    getText(endereco, "xBairro"),
    getText(endereco, "xMun"),
    getText(endereco, "UF"),
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : undefined;
}

function getCamposEssenciaisAusentes(nota: NotaFiscal) {
  const candidates: Array<[string, string | number | undefined]> = [
    ["número da nota", nota.numero_nota],
    ["data de emissão", nota.data_emissao],
    ["emitente", nota.emitente_nome],
    ["CNPJ do emitente", nota.emitente_cnpj],
    ["destinatário", nota.destinatario_nome],
    ["CNPJ do destinatário", nota.destinatario_cnpj],
    ["valor total", nota.valor_total],
  ];

  return candidates
    .filter(([, value]) => value === undefined || value === "")
    .map(([label]) => label);
}

function createAlerta(notaId: string, tipo: TipoAlerta, descricao: string, createdAt: string): AlertaNota {
  return {
    id: generateId(),
    nota_id: notaId,
    tipo_alerta: tipo,
    descricao,
    status: "ativo",
    created_at: createdAt,
  };
}

function getElementsByLocalName(root: Document | Element | undefined, localName: string) {
  if (!root) {
    return [];
  }

  const normalizedLocalName = localName.toLowerCase();
  const elements = root instanceof Document
    ? [root.documentElement, ...Array.from(root.getElementsByTagName("*"))]
    : [root, ...Array.from(root.getElementsByTagName("*"))];

  return elements.filter(
    (element): element is Element =>
      Boolean(element) && getNormalizedElementName(element) === normalizedLocalName,
  );
}

function findFirstChildByLocalName(root: Element | undefined, localName: string) {
  if (!root) {
    return undefined;
  }

  const normalizedLocalName = localName.toLowerCase();
  return Array.from(root.children).find((child) => getNormalizedElementName(child) === normalizedLocalName);
}

function getNormalizedElementName(element: Element) {
  const elementName = element.localName ?? element.nodeName.split(":").pop() ?? "";
  return elementName.toLowerCase();
}

function getText(root: Document | Element | undefined, localName: string) {
  const element = getElementsByLocalName(root, localName)[0];
  const text = element?.textContent?.trim();
  return text ? text.replace(/\s+/g, " ") : undefined;
}

function normalizeDate(value?: string) {
  if (!value) {
    return undefined;
  }

  const match = value.match(/\d{4}-\d{2}-\d{2}/);
  return match?.[0];
}

function parseNumber(value?: string) {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function sumDefinedNumbers(values: Array<number | undefined>) {
  const definedValues = values.filter((value): value is number => value !== undefined);
  if (definedValues.length === 0) {
    return undefined;
  }

  return definedValues.reduce((sum, value) => sum + value, 0);
}

function escapeCsvValue(value: string) {
  if (value.includes(";") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}
