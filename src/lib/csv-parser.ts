export interface ParsedCsvRow {
  linha_origem: number;
  numero: string | null;
  codigo_verificacao: string | null;
  emissao_original: string | null;
  uf: string | null;
  valor_nfse: number | null;
  emitente_cnpj: string | null;
  emitente_nome: string | null;
  tomador_cnpj: string | null;
  tomador_nome: string | null;
}

interface ParseUploadedCsvOptions {
  fileName: string;
  csvContent: string;
}

const CSV_ALIASES = {
  numero: ["numero", "numero nfse"],
  codigoVerificacao: ["codigo de verificacao", "codigo verificacao"],
  emissao: ["emissao", "data emissao", "data de emissao"],
  uf: ["uf"],
  valorNfse: ["valor nfse", "valor", "valor nota"],
  emitenteCnpj: ["cpf cnpj emitente", "cnpj emitente", "cpf/cnpj emitente"],
  emitenteNome: ["razao social emitente", "emitente", "nome emitente"],
  tomadorCnpj: ["cpf cnpj tomador", "cnpj tomador", "cpf/cnpj tomador"],
  tomadorNome: ["razao social tomador", "tomador", "nome tomador"],
} as const;

export async function readCsvFile(file: Pick<File, "name" | "text" | "arrayBuffer">) {
  if (!file.name.toLowerCase().endsWith(".csv")) {
    throw new Error("Falha em read_file: apenas arquivos .csv sao aceitos.");
  }

  try {
    if (typeof TextDecoder !== "undefined" && typeof file.arrayBuffer === "function") {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const utf8 = new TextDecoder("utf-8").decode(bytes).replace(/^\uFEFF/, "");

      if (containsReplacementCharacter(utf8)) {
        return new TextDecoder("windows-1252").decode(bytes).replace(/^\uFEFF/, "");
      }

      return utf8;
    }

    const csvContent = await file.text();
    return csvContent.replace(/^\uFEFF/, "");
  } catch {
    throw new Error("Falha em read_file: nao foi possivel ler o arquivo CSV.");
  }
}

export function parseUploadedCsv(options: ParseUploadedCsvOptions) {
  const rows = parseDelimitedRows(options.csvContent);
  const nonEmptyRows = rows.filter((row) => row.some((cell) => cell.trim() !== ""));

  if (nonEmptyRows.length === 0) {
    throw new Error("Falha em parse_csv: arquivo CSV vazio.");
  }

  const [headerRow, ...dataRows] = nonEmptyRows;
  const normalizedHeaders = headerRow.map(normalizeHeader);

  if (!looksLikeNotaCsv(normalizedHeaders)) {
    throw new Error(
      `Falha em parse_csv: cabecalho nao compativel. Colunas encontradas: ${headerRow.join(", ")}.`,
    );
  }

  const parsedRows = dataRows
    .map((cells, index) => buildParsedRow(normalizedHeaders, cells, index + 2))
    .filter((row) => hasMeaningfulData(row));

  if (parsedRows.length === 0) {
    throw new Error("Falha em parse_csv: nenhuma linha de dados encontrada.");
  }

  return parsedRows;
}

function looksLikeNotaCsv(headers: string[]) {
  return (
    hasAnyHeader(headers, CSV_ALIASES.numero) &&
    hasAnyHeader(headers, CSV_ALIASES.emissao) &&
    hasAnyHeader(headers, CSV_ALIASES.valorNfse) &&
    hasAnyHeader(headers, CSV_ALIASES.emitenteCnpj)
  );
}

function hasAnyHeader(headers: string[], aliases: readonly string[]) {
  return aliases.some((alias) => headers.includes(alias));
}

function buildParsedRow(headers: string[], cells: string[], linhaOrigem: number): ParsedCsvRow {
  const record = new Map<string, string>();

  headers.forEach((header, index) => {
    record.set(header, cells[index]?.trim() ?? "");
  });

  return {
    linha_origem: linhaOrigem,
    numero: getCsvField(record, CSV_ALIASES.numero),
    codigo_verificacao: getCsvField(record, CSV_ALIASES.codigoVerificacao),
    emissao_original: getCsvField(record, CSV_ALIASES.emissao),
    uf: getCsvField(record, CSV_ALIASES.uf),
    valor_nfse: parseCsvNumber(getCsvField(record, CSV_ALIASES.valorNfse)),
    emitente_cnpj: normalizeDocument(getCsvField(record, CSV_ALIASES.emitenteCnpj)),
    emitente_nome: getCsvField(record, CSV_ALIASES.emitenteNome),
    tomador_cnpj: normalizeDocument(getCsvField(record, CSV_ALIASES.tomadorCnpj)),
    tomador_nome: getCsvField(record, CSV_ALIASES.tomadorNome),
  };
}

function hasMeaningfulData(row: ParsedCsvRow) {
  return Boolean(
    row.numero ||
    row.valor_nfse !== null ||
    row.emitente_cnpj ||
    row.emitente_nome ||
    row.tomador_nome,
  );
}

function getCsvField(record: Map<string, string>, aliases: readonly string[]) {
  for (const alias of aliases) {
    const value = record.get(alias)?.trim();
    if (value) {
      return value;
    }
  }

  return null;
}

function normalizeHeader(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s/]/g, " ")
    .replace(/\//g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeDocument(value: string | null) {
  if (!value) {
    return null;
  }

  const digits = value.replace(/\D/g, "");
  return digits || null;
}

function parseCsvNumber(value: string | null) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const hasComma = trimmed.includes(",");
  const hasDot = trimmed.includes(".");

  let normalized = trimmed;

  if (hasComma && hasDot) {
    const lastComma = trimmed.lastIndexOf(",");
    const lastDot = trimmed.lastIndexOf(".");
    normalized = lastComma > lastDot
      ? trimmed.replace(/\./g, "").replace(",", ".")
      : trimmed.replace(/,/g, "");
  } else if (hasComma) {
    normalized = trimmed.replace(/\./g, "").replace(",", ".");
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDelimitedRows(content: string) {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let insideQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const nextChar = content[index + 1];

    if (char === "\"") {
      if (insideQuotes && nextChar === "\"") {
        currentCell += "\"";
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }

      continue;
    }

    if (!insideQuotes && char === ";") {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if (!insideQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = "";
      continue;
    }

    currentCell += char;
  }

  if (currentCell !== "" || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  return rows;
}

function containsReplacementCharacter(value: string) {
  return value.includes("\uFFFD");
}
