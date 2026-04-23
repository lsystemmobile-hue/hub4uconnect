const OMIE_BASE = "https://app.omie.com.br/api/v1";

async function omieCall<T>(
  endpoint: string,
  call: string,
  appKey: string,
  appSecret: string,
  params: Record<string, unknown>,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);

  let res: Response;
  try {
    res = await fetch(`${OMIE_BASE}/${endpoint}/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ call, app_key: appKey, app_secret: appSecret, param: [params] }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OMIE HTTP ${res.status} em ${endpoint}/${call}: ${body}`);
  }

  const data = await res.json();

  // A API do OMIE retorna erros como faultstring no corpo com status 200
  if (data.faultstring) {
    throw new Error(`OMIE API error (${call}): ${data.faultstring}`);
  }

  return data as T;
}

// ─── Contas a Receber ────────────────────────────────────────────────────────

export interface OmieContaReceber {
  codigo_lancamento_omie: number;
  codigo_lancamento_integracao: string;
  codigo_cliente_fornecedor: number;
  data_vencimento: string; // DD/MM/YYYY
  valor_documento: number;
  status_titulo: string; // "ABERTO", "RECEBIDO", etc.
  codigo_categoria: string;
  numero_documento: string;
}

interface ListarContasReceberResponse {
  pagina: number;
  total_de_paginas: number;
  registros: number;
  total_de_registros: number;
  conta_receber_cadastro: OmieContaReceber[];
}

export async function listarContasReceber(
  appKey: string,
  appSecret: string,
  pagina: number,
): Promise<ListarContasReceberResponse> {
  return omieCall<ListarContasReceberResponse>(
    "financas/contareceber",
    "ListarContasReceber",
    appKey,
    appSecret,
    {
      pagina,
      registros_por_pagina: 50,
    },
  );
}

// ─── Clientes ────────────────────────────────────────────────────────────────

export interface OmieCliente {
  codigo_cliente_omie: number;
  codigo_cliente_integracao: string;
  razao_social: string;
  nome_fantasia: string;
  cnpj_cpf: string;
  email: string;
  telefone1_ddd: string;
  telefone1_numero: string;
  endereco: string;
  cidade: string;
  estado: string;
}

export async function consultarCliente(
  appKey: string,
  appSecret: string,
  codigoClienteOmie: number,
): Promise<OmieCliente> {
  return omieCall<OmieCliente>(
    "geral/clientes",
    "ConsultarCliente",
    appKey,
    appSecret,
    { codigo_cliente_omie: codigoClienteOmie },
  );
}

// ─── Boletos ─────────────────────────────────────────────────────────────────

export interface OmieBoletoResponse {
  cCodStatus: string;
  cDesStatus: string;
  cLinkBoleto: string;
  cGerado: string; // "S" | "N"
}

export async function gerarBoleto(
  appKey: string,
  appSecret: string,
  nCodTitulo: number,
): Promise<OmieBoletoResponse> {
  return omieCall<OmieBoletoResponse>(
    "financas/contareceberboleto",
    "GerarBoleto",
    appKey,
    appSecret,
    { nCodTitulo },
  );
}

export async function obterBoleto(
  appKey: string,
  appSecret: string,
  nCodTitulo: number,
): Promise<OmieBoletoResponse> {
  return omieCall<OmieBoletoResponse>(
    "financas/contareceberboleto",
    "ObterBoleto",
    appKey,
    appSecret,
    { nCodTitulo },
  );
}
