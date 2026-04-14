export type StatusAnalise = "processado" | "pendente" | "erro" | "inconsistente";
export type TipoArquivo = "xml" | "csv" | "pdf" | "imagem";
export type DocumentoTipo = "nfe" | "nfse";
export type TipoAlerta = "inconsistencia_valor" | "campo_ausente" | "possivel_duplicidade" | "baixa_qualidade" | "estrutura_incompleta";
export type StatusAlerta = "ativo" | "resolvido";
export type XmlParseStage = "read_file" | "parse_xml" | "detect_xml_type" | "extract_nfse";

export interface NormalizedNfseParty {
  nome: string | null;
  nome_fantasia: string | null;
  cnpj: string | null;
  cpf_cnpj: string | null;
  inscricao_municipal: string | null;
  email: string | null;
  endereco_completo: string | null;
}

export interface NormalizedNfseService {
  descricao: string | null;
  codigo_tributario_nacional: string | null;
  codigo_tributario_municipal: string | null;
  nbs: string | null;
  descricao_atividade: string | null;
}

export interface NormalizedNfseValues {
  valor_servico: number | null;
  base_calculo: number | null;
  issqn: number | null;
  valor_total_retido: number | null;
  valor_liquido: number | null;
}

export interface NormalizedNfseData {
  numero_nota: string | null;
  data_emissao: string | null;
  competencia: string | null;
  municipio_emissao: string | null;
  municipio_prestacao: string | null;
  status: string | null;
  prestador: NormalizedNfseParty;
  tomador: NormalizedNfseParty;
  servico: NormalizedNfseService;
  valores: NormalizedNfseValues;
}

export interface CsvImportedRowData {
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

export interface XmlParseDiagnostics {
  stage: XmlParseStage;
  rootTag: string | null;
  foundTags: string[];
  signatureIgnored: boolean;
  warnings: string[];
}

export interface UploadedXmlParseSuccessResult {
  identified: true;
  type: "nfse";
  data: NormalizedNfseData;
  diagnostics: XmlParseDiagnostics;
}

export interface UploadedXmlUnknownResult {
  identified: false;
  type: "unknown_xml";
  message: "XML não identificado como NFSe";
  diagnostics: XmlParseDiagnostics;
}

export interface UploadedXmlInvalidResult {
  identified: false;
  type: "invalid_xml";
  message: "XML inválido";
  diagnostics: XmlParseDiagnostics;
}

export type UploadedXmlParseResult =
  | UploadedXmlParseSuccessResult
  | UploadedXmlUnknownResult
  | UploadedXmlInvalidResult;

export interface NotaFiscal {
  id: string;
  numero_nota?: string;
  serie?: string;
  chave_acesso?: string;
  data_emissao?: string;
  data_saida?: string;
  emitente_nome?: string;
  emitente_cnpj?: string;
  emitente_ie?: string;
  emitente_endereco?: string;
  destinatario_nome?: string;
  destinatario_cnpj?: string;
  valor_total?: number;
  valor_produtos?: number;
  valor_impostos?: number;
  valor_frete?: number;
  valor_desconto?: number;
  icms?: number;
  ipi?: number;
  pis?: number;
  cofins?: number;
  base_calculo_icms?: number;
  documento_tipo?: DocumentoTipo;
  csv_data?: CsvImportedRowData;
  xml_parse_result?: UploadedXmlParseResult;
  nfse_data?: NormalizedNfseData;
  xml_diagnostics?: XmlParseDiagnostics;
  status_analise: StatusAnalise;
  tipo_arquivo: TipoArquivo;
  nome_arquivo: string;
  resumo_ia?: string;
  observacoes?: string;
  informacoes_adicionais?: string;
  created_at: string;
  updated_at: string;
  itens: ItemNota[];
  alertas: AlertaNota[];
}

export interface ItemNota {
  id: string;
  nota_id: string;
  descricao?: string;
  codigo_produto?: string;
  ncm?: string;
  cfop?: string;
  cst?: string;
  quantidade?: number;
  unidade?: string;
  valor_unitario?: number;
  valor_total?: number;
}

export interface AlertaNota {
  id: string;
  nota_id: string;
  tipo_alerta: TipoAlerta;
  descricao: string;
  status: StatusAlerta;
  created_at: string;
}

export interface ArquivoUpload {
  id: string;
  nota_id?: string;
  nota_ids?: string[];
  nome_arquivo: string;
  tipo_arquivo: TipoArquivo;
  url_arquivo?: string;
  status_processamento: "aguardando" | "processando" | "concluido" | "erro";
  tamanho_bytes?: number;
  registros_processados?: number;
  conteudo_original?: string;
  mensagem_erro?: string;
  created_at: string;
}
