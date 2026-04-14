import {
  type NormalizedNfseData,
  type NormalizedNfseParty,
  type UploadedXmlParseResult,
  type UploadedXmlParseSuccessResult,
  type XmlParseDiagnostics,
} from "@/data/types";

const NFE_STRONG_TAGS = ["infnfe", "resnfe", "nfeproc", "nfe"];
const NFSE_STRONG_TAGS = [
  "nfse", "infnfse", "compnfse", "dps", "infdps",
  // variações de municípios e sistemas
  "notafiscaleletronicaservico", "notafiscalservico", "nfseeletronica",
  "rps", "infrps", "lote", "lotes",
  "consultarnfseresposta", "consultarnfseporrvresponse",
  "listadenfs", "listanfse", "listanfs",
  "tcgws", "notafiscal",
];
const NFSE_COMPLEMENTARY_TAGS = [
  "emit",
  "toma",
  "valores",
  "xdescserv",
  "vserv",
  "servico",
  "prestadorservico",
  "tomadorservico",
  "prestador",
  "tomador",
  // campos de valor comuns a NFSe
  "valorservicos",
  "valoriss",
  "valorliquidonfse",
  "discriminacao",
  "itemlistaservico",
  "aliquota",
  "issretido",
];
const TRACKED_TAGS = [
  "NFSe",
  "infNFSe",
  "InfNfse",
  "CompNfse",
  "Nfse",
  "DPS",
  "infDPS",
  "InfDPS",
  "Rps",
  "InfRps",
  "emit",
  "toma",
  "valores",
  "xDescServ",
  "vServ",
  "Servico",
  "PrestadorServico",
  "TomadorServico",
  "infNFe",
  "resNFe",
  "nfeProc",
  "NFe",
];

type DetectedXmlType = "nfe" | "nfse" | "unknown_xml";

interface ParseUploadedXmlOptions {
  fileName: string;
  xmlContent: string;
}

interface ParsedXmlDocument {
  document: Document;
  rootTag: string | null;
  namespaceSanitized: boolean;
  signatureIgnored: boolean;
}

interface DetectXmlTypeResult {
  type: DetectedXmlType;
  foundTags: string[];
}

export async function readXmlFile(file: Pick<File, "name" | "text">) {
  if (!file.name.toLowerCase().endsWith(".xml")) {
    throw new Error("Falha em read_file: apenas arquivos .xml sao aceitos.");
  }

  try {
    const xmlContent = await file.text();
    return xmlContent.replace(/^\uFEFF/, "");
  } catch {
    throw new Error("Falha em read_file: nao foi possivel ler o arquivo XML.");
  }
}

export function sanitizeXmlNamespaces(xmlString: string) {
  return xmlString
    .replace(/\sxmlns(?::[\w-]+)?="[^"]*"/g, "")
    .replace(/(<\/?)([\w-]+:)/g, "$1");
}

export function parseXml(xmlString: string): ParsedXmlDocument {
  const document = parseXmlString(xmlString);

  if (hasParserError(document)) {
    const sanitizedXml = sanitizeXmlNamespaces(xmlString);
    if (sanitizedXml !== xmlString) {
      const sanitizedDocument = parseXmlString(sanitizedXml);
      if (!hasParserError(sanitizedDocument)) {
        return finalizeParsedDocument(sanitizedDocument, true);
      }
    }

    throw new Error("XML invalido");
  }

  return finalizeParsedDocument(document, false);
}

export function detectXmlType(document: Document): DetectXmlTypeResult {
  const availableTags = collectAvailableTags(document);
  const foundTags = collectTrackedTags(document);

  // Diagnóstico: mostra no console as tags do XML para ajudar a identificar o formato
  const rootTag = getNormalizedRootTag(document);
  const allTags = Array.from(availableTags).slice(0, 30);
  // eslint-disable-next-line no-console
  console.log("[xml-parser] rootTag:", rootTag, "| foundTags:", foundTags, "| allTags (30):", allTags);

  if (hasAnyTag(availableTags, NFE_STRONG_TAGS)) {
    return { type: "nfe", foundTags };
  }

  const nfseStrongMatches = countMatches(availableTags, NFSE_STRONG_TAGS);
  const nfseComplementaryMatches = countMatches(availableTags, NFSE_COMPLEMENTARY_TAGS);

  // eslint-disable-next-line no-console
  console.log("[xml-parser] nfseStrongMatches:", nfseStrongMatches, "| nfseComplementaryMatches:", nfseComplementaryMatches);

  if (nfseStrongMatches > 0 || nfseComplementaryMatches >= 2) {
    return { type: "nfse", foundTags };
  }

  return { type: "unknown_xml", foundTags };
}

export function extractNFSe(document: Document, diagnostics: XmlParseDiagnostics): NormalizedNfseData {
  const infNfse = getFirstElementByLocalName(document, ["InfNfse", "infNFSe", "Nfse", "NFSe", "CompNfse"]);
  const dps = getFirstElementByLocalName(document, ["InfDPS", "infDPS", "DPS", "InfRps", "Rps"]);
  const notaRoot = infNfse ?? dps ?? document.documentElement;

  if (!infNfse && !dps) {
    diagnostics.warnings.push("Bloco principal de NFSe nao encontrado; extraindo a partir da raiz.");
  }

  const prestadorEl =
    getFirstElementByLocalName(notaRoot, ["PrestadorServico", "Prestador", "emit"]) ??
    getFirstElementByLocalName(document, ["PrestadorServico", "Prestador", "emit"]);
  const tomadorEl =
    getFirstElementByLocalName(notaRoot, ["TomadorServico", "Tomador", "toma"]) ??
    getFirstElementByLocalName(document, ["TomadorServico", "Tomador", "toma"]);
  const servicoEl =
    getFirstElementByLocalName(notaRoot, ["Servico", "Servicos"]) ??
    getFirstElementByLocalName(document, ["Servico", "Servicos"]);
  const valoresEl =
    getFirstElementByLocalName(servicoEl ?? notaRoot, ["Valores", "valores"]) ??
    getFirstElementByLocalName(document, ["Valores", "valores"]);

  if (!prestadorEl) {
    diagnostics.warnings.push("Prestador nao encontrado no XML.");
  }

  if (!tomadorEl) {
    diagnostics.warnings.push("Tomador nao encontrado no XML.");
  }

  if (!servicoEl) {
    diagnostics.warnings.push("Servico nao encontrado no XML.");
  }

  if (!valoresEl) {
    diagnostics.warnings.push("Valores do servico nao encontrados no XML.");
  }

  const prestador = buildParty(
    prestadorEl,
    getFirstElementByLocalName(document, ["PrestadorServico", "Prestador", "emit"]),
  );
  const tomador = buildParty(
    tomadorEl,
    getFirstElementByLocalName(document, ["TomadorServico", "Tomador", "toma"]),
  );

  const valorTotalRetido =
    parseNullableNumber(getTagText(valoresEl, ["ValorTotalRetencoes", "ValorTotalRetido"])) ??
    sumNullableNumbers([
      parseNullableNumber(getTagText(valoresEl, ["ValorPis"])),
      parseNullableNumber(getTagText(valoresEl, ["ValorCofins"])),
      parseNullableNumber(getTagText(valoresEl, ["ValorInss"])),
      parseNullableNumber(getTagText(valoresEl, ["ValorIr"])),
      parseNullableNumber(getTagText(valoresEl, ["ValorCsll"])),
      parseNullableNumber(getTagText(valoresEl, ["OutrasRetencoes"])),
      parseNullableNumber(getTagText(valoresEl, ["ValorIssRetido"])),
    ]);

  const valorServico =
    parseNullableNumber(
      getTagText(valoresEl, ["ValorServicos", "ValorServico", "vServ", "vServPrest", "ValorOperacao"]) ??
        getTagText(servicoEl, ["ValorServicos", "ValorServico", "vServ", "vServPrest", "ValorOperacao"]),
    ) ??
    parseNullableNumber(getTagText(valoresEl, ["BaseCalculo", "ValorBaseCalculo", "vBC"]));

  const baseCalculo = parseNullableNumber(
    getTagText(valoresEl, ["BaseCalculo", "ValorBaseCalculo", "vBC", "vBCServ"]),
  );

  const valorLiquido =
    parseNullableNumber(
      getTagText(valoresEl, ["ValorLiquidoNfse", "ValorLiquido", "ValorNfse", "ValorTotalLiquido", "vLiq"]) ??
        getTagText(notaRoot, ["ValorLiquidoNfse", "ValorLiquido", "vLiq"]),
    ) ??
    deriveValorLiquido(valorServico, valorTotalRetido);

  if (valorServico === null && baseCalculo !== null) {
    diagnostics.warnings.push("Valor do servico nao encontrado; usando base de calculo como fallback.");
  }

  if (valorLiquido === null && valorServico !== null) {
    diagnostics.warnings.push("Valor liquido nao encontrado explicitamente no XML.");
  }

  return {
    numero_nota:
      getDirectTagText(notaRoot, ["Numero", "NumeroNfse", "nNFSe"]) ??
      getTagText(notaRoot, ["NumeroNfse", "nNFSe"]) ??
      getTagText(document, ["NumeroRps", "NumeroDps"]),
    data_emissao: normalizeDate(
      getTagText(notaRoot, ["DataEmissao", "DataHoraEmissao", "dhEmi", "DataProcessamento"]) ??
        getTagText(document, ["DataEmissaoRps", "DataEmissao"]),
    ),
    competencia: normalizeDate(
      getTagText(notaRoot, ["Competencia", "DataCompetencia", "dCompet", "Compet", "PeriodoCompetencia"]) ??
        getTagText(document, ["Competencia", "DataCompetencia", "dCompet", "PeriodoCompetencia"]) ??
        getTagText(servicoEl, ["Competencia", "PeriodoCompetencia"]),
    ),
    municipio_emissao:
      getTagText(notaRoot, ["MunicipioGerador", "MunicipioEmissao", "xMunGer", "xMunFG", "CidadePrestador"]) ??
      getTagText(document, ["MunicipioGerador", "MunicipioEmissao", "xMunGer", "xMunFG", "CidadePrestador"]) ??
      extractAddressCity(prestadorEl),
    municipio_prestacao:
      getTagText(notaRoot, [
        "MunicipioPrestacaoServico",
        "MunicipioIncidencia",
        "xMunPrestacao",
        "xLocPrestacao",
        "CidadeTomador",
      ]) ??
      getTagText(servicoEl, [
        "MunicipioPrestacaoServico",
        "MunicipioIncidencia",
        "xMunPrestacao",
        "xLocPrestacao",
      ]) ??
      getTagText(document, [
        "MunicipioPrestacaoServico",
        "MunicipioIncidencia",
        "xMunPrestacao",
        "xLocPrestacao",
        "CidadeTomador",
      ]) ??
      extractAddressCity(tomadorEl),
    status:
      getTagText(notaRoot, ["Situacao", "Status", "StatusNfse", "SituacaoNfse", "stNFSe", "cStat"]) ??
      getTagText(document, ["Situacao", "Status", "StatusNfse", "SituacaoNfse", "stNFSe", "cStat", "xMotivo"]),
    prestador: {
      ...prestador,
      cnpj: prestador.cpf_cnpj,
    },
    tomador,
    servico: {
      descricao:
        getTagText(servicoEl, ["Discriminacao", "xDescServ", "DescricaoServico", "Descricao"]) ??
        getTagText(notaRoot, ["Discriminacao", "xDescServ"]),
      codigo_tributario_nacional: getTagText(servicoEl, [
        "ItemListaServico",
        "CodigoTributacaoNacional",
        "CodigoTributarioNacional",
      ]),
      codigo_tributario_municipal: getTagText(servicoEl, [
        "CodigoTributacaoMunicipio",
        "CodigoTributarioMunicipal",
      ]),
      nbs: getTagText(servicoEl, ["Nbs", "NBS"]),
      descricao_atividade: getTagText(servicoEl, [
        "DescricaoAtividade",
        "DescricaoServicoTomado",
        "DescricaoAtividadeEconomica",
      ]),
    },
    valores: {
      valor_servico: valorServico,
      base_calculo: baseCalculo,
      issqn: parseNullableNumber(
        getTagText(valoresEl, ["ValorIss", "ValorIssqn", "ValorISSQN", "vISSQN", "Issqn", "vIss"]),
      ),
      valor_total_retido: valorTotalRetido,
      valor_liquido: valorLiquido,
    },
  };
}

export function buildNormalizedResponse(
  data: NormalizedNfseData,
  diagnostics: XmlParseDiagnostics,
): UploadedXmlParseSuccessResult {
  return {
    identified: true,
    type: "nfse",
    data,
    diagnostics,
  };
}

export function parseUploadedXml(options: ParseUploadedXmlOptions): UploadedXmlParseResult {
  let parsedDocument: ParsedXmlDocument;

  try {
    parsedDocument = parseXml(options.xmlContent);
  } catch {
    return {
      identified: false,
      type: "invalid_xml",
      message: "XML inválido",
      diagnostics: {
        stage: "parse_xml",
        rootTag: null,
        foundTags: [],
        signatureIgnored: false,
        warnings: [`Falha ao analisar o arquivo ${options.fileName}.`],
      },
    };
  }

  const detected = detectXmlType(parsedDocument.document);
  const baseWarnings = parsedDocument.namespaceSanitized
    ? ["Namespaces foram sanitizados em um fallback tecnico."]
    : [];

  if (detected.type !== "nfse") {
    return {
      identified: false,
      type: "unknown_xml",
      message: "XML não identificado como NFSe",
      diagnostics: {
        stage: "detect_xml_type",
        rootTag: parsedDocument.rootTag,
        foundTags: detected.foundTags,
        signatureIgnored: parsedDocument.signatureIgnored,
        warnings: baseWarnings,
      },
    };
  }

  const diagnostics: XmlParseDiagnostics = {
    stage: "extract_nfse",
    rootTag: parsedDocument.rootTag,
    foundTags: detected.foundTags,
    signatureIgnored: parsedDocument.signatureIgnored,
    warnings: [...baseWarnings],
  };

  const data = extractNFSe(parsedDocument.document, diagnostics);
  return buildNormalizedResponse(data, diagnostics);
}

function parseXmlString(xmlString: string) {
  const parser = new DOMParser();
  return parser.parseFromString(xmlString, "application/xml");
}

function finalizeParsedDocument(document: Document, namespaceSanitized: boolean): ParsedXmlDocument {
  const clone = document.cloneNode(true) as Document;
  const signatureIgnored = removeSignatureNodes(clone) > 0;

  return {
    document: clone,
    rootTag: getNormalizedRootTag(clone),
    namespaceSanitized,
    signatureIgnored,
  };
}

function hasParserError(document: Document) {
  return getElementsByLocalName(document, "parsererror").length > 0;
}

function removeSignatureNodes(document: Document) {
  const signatures = getElementsByLocalName(document, "Signature");
  signatures.forEach((signature) => signature.parentNode?.removeChild(signature));
  return signatures.length;
}

function buildParty(primary: Element | null | undefined, fallback: Element | null | undefined): NormalizedNfseParty {
  const party = primary ?? fallback;
  const documentoContainer =
    getFirstElementByLocalName(party, ["CpfCnpj", "IdentificacaoTomador", "IdentificacaoPrestador"]) ?? party;
  const cpfCnpj =
    getTagText(documentoContainer, ["Cnpj", "Cpf", "CNPJ", "CPF"]) ??
    getTagText(party, ["Cnpj", "Cpf", "CNPJ", "CPF"]);
  const contato = getFirstElementByLocalName(party, ["Contato"]);

  return {
    nome: getTagText(party, ["RazaoSocial", "Nome", "xNome"]),
    nome_fantasia: getTagText(party, ["NomeFantasia", "Fantasia"]),
    cnpj: getTagText(documentoContainer, ["Cnpj", "CNPJ"]) ?? getTagText(party, ["Cnpj", "CNPJ"]),
    cpf_cnpj: cpfCnpj,
    inscricao_municipal: getTagText(party, ["InscricaoMunicipal", "IM"]),
    email: getTagText(contato ?? party, ["Email", "email"]),
    endereco_completo: buildAddress(party),
  };
}

function buildAddress(root: Element | null | undefined) {
  const endereco =
    getFirstElementByLocalName(root, ["Endereco", "EnderecoPrestador", "EnderecoTomador"]) ??
    root;

  if (!endereco) {
    return null;
  }

  const parts = [
    getTagText(endereco, ["Logradouro", "xLgr"]),
    getTagText(endereco, ["Numero", "nro"]),
    getTagText(endereco, ["Complemento", "xCpl"]),
    getTagText(endereco, ["Bairro", "xBairro"]),
    getTagText(endereco, ["Municipio", "xMun", "Cidade"]),
    getTagText(endereco, ["Uf", "UF"]),
    getTagText(endereco, ["Cep", "CEP", "xCEP"]),
  ].filter((value): value is string => Boolean(value));

  return parts.length > 0 ? parts.join(", ") : null;
}

function extractAddressCity(root: Element | null | undefined) {
  const endereco =
    getFirstElementByLocalName(root, ["Endereco", "EnderecoPrestador", "EnderecoTomador"]) ??
    root;

  return getTagText(endereco, ["Municipio", "xMun", "Cidade"]);
}

function collectAvailableTags(root: Document | Element | null | undefined) {
  return new Set(getElementsByLocalName(root, "*").map((element) => getNormalizedElementName(element)));
}

function collectTrackedTags(document: Document) {
  const names = new Set(
    getElementsByLocalName(document, "*")
      .map((element) => element.localName ?? element.nodeName.split(":").pop() ?? "")
      .filter(Boolean),
  );

  const tracked = TRACKED_TAGS.filter((tagName) =>
    Array.from(names).some((name) => name.toLowerCase() === tagName.toLowerCase()),
  );

  const rootTag = getNormalizedRootTag(document);
  if (rootTag && !tracked.some((tagName) => tagName.toLowerCase() === rootTag.toLowerCase())) {
    tracked.unshift(rootTag);
  }

  return tracked;
}

function countMatches(availableTags: Set<string>, tagNames: readonly string[]) {
  return tagNames.reduce((total, tagName) => total + (availableTags.has(tagName.toLowerCase()) ? 1 : 0), 0);
}

function hasAnyTag(availableTags: Set<string>, tagNames: readonly string[]) {
  return tagNames.some((tagName) => availableTags.has(tagName.toLowerCase()));
}

function getElementsByLocalName(
  root: Document | Element | null | undefined,
  localName: string,
) {
  if (!root) {
    return [];
  }

  const normalizedLocalName = localName.toLowerCase();
  const elements = root instanceof Document
    ? [root.documentElement, ...Array.from(root.getElementsByTagName("*"))]
    : [root, ...Array.from(root.getElementsByTagName("*"))];

  return elements.filter(
    (element): element is Element =>
      Boolean(element) &&
      (normalizedLocalName === "*" || getNormalizedElementName(element) === normalizedLocalName),
  );
}

function getFirstElementByLocalName(
  root: Document | Element | null | undefined,
  localNames: string[],
) {
  for (const localName of localNames) {
    const match = getElementsByLocalName(root, localName)[0];
    if (match) {
      return match;
    }
  }

  return null;
}

function getTagText(
  root: Document | Element | null | undefined,
  localNames: string[],
) {
  const element = getFirstElementByLocalName(root, localNames);
  const text = element?.textContent?.trim();
  return text ? text.replace(/\s+/g, " ") : null;
}

function getDirectTagText(
  root: Element | null | undefined,
  localNames: string[],
) {
  if (!root) {
    return null;
  }

  for (const localName of localNames) {
    const normalizedLocalName = localName.toLowerCase();
    const match = Array.from(root.children).find(
      (child) => getNormalizedElementName(child) === normalizedLocalName,
    );
    const text = match?.textContent?.trim();
    if (text) {
      return text.replace(/\s+/g, " ");
    }
  }

  return null;
}

function getNormalizedElementName(element: Element) {
  const elementName = element.localName ?? element.nodeName.split(":").pop() ?? "";
  return elementName.toLowerCase();
}

function getNormalizedRootTag(document: Document) {
  const root = document.documentElement;
  if (!root) {
    return null;
  }

  return root.localName ?? root.nodeName.split(":").pop() ?? null;
}

function normalizeDate(value: string | null) {
  if (!value) {
    return null;
  }

  const match = value.match(/\d{4}-\d{2}-\d{2}/);
  return match?.[0] ?? null;
}

function parseNullableNumber(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function deriveValorLiquido(valorServico: number | null, valorTotalRetido: number | null) {
  if (valorServico === null) {
    return null;
  }

  if (valorTotalRetido === null) {
    return valorServico;
  }

  return Math.max(valorServico - valorTotalRetido, 0);
}

function sumNullableNumbers(values: Array<number | null>) {
  const definedValues = values.filter((value): value is number => value !== null);
  if (definedValues.length === 0) {
    return null;
  }

  return definedValues.reduce((sum, value) => sum + value, 0);
}
