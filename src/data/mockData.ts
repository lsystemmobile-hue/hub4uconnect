import { NotaFiscal } from "./types";

export const mockNotas: NotaFiscal[] = [
  {
    id: "1", numero_nota: "001234", serie: "1", chave_acesso: "3523 0108 7654 3210 0001 5500 1000 0012 3410 0012 3456",
    data_emissao: "2025-03-15", emitente_nome: "Distribuidora ABC Ltda", emitente_cnpj: "08.765.432/0001-55",
    emitente_ie: "123.456.789.000", emitente_endereco: "Rua das Indústrias, 450 - São Paulo/SP",
    destinatario_nome: "Comércio Beta ME", destinatario_cnpj: "12.345.678/0001-90",
    valor_total: 15750.00, valor_produtos: 14500.00, valor_impostos: 1250.00, valor_frete: 350.00, valor_desconto: 0,
    icms: 870.00, ipi: 290.00, pis: 47.85, cofins: 220.50, base_calculo_icms: 14500.00,
    status_analise: "processado", tipo_arquivo: "xml", nome_arquivo: "nfe_001234.xml",
    resumo_ia: "Nota fiscal emitida por Distribuidora ABC Ltda para Comércio Beta ME, contendo 5 itens de materiais de escritório e informática. Valor total de R$ 15.750,00 com impostos destacados (ICMS, IPI, PIS, COFINS). Nenhuma inconsistência identificada.",
    created_at: "2025-03-15T10:30:00Z", updated_at: "2025-03-15T10:35:00Z",
    itens: [
      { id: "i1", nota_id: "1", descricao: "Resma de Papel A4 75g", codigo_produto: "PAP001", ncm: "4802.56.10", cfop: "5102", cst: "000", quantidade: 50, unidade: "UN", valor_unitario: 22.90, valor_total: 1145.00 },
      { id: "i2", nota_id: "1", descricao: "Toner HP CF226A", codigo_produto: "TON002", ncm: "3707.90.29", cfop: "5102", cst: "000", quantidade: 10, unidade: "UN", valor_unitario: 189.90, valor_total: 1899.00 },
      { id: "i3", nota_id: "1", descricao: "Monitor LED 24\" Full HD", codigo_produto: "MON003", ncm: "8528.52.20", cfop: "5102", cst: "000", quantidade: 5, unidade: "UN", valor_unitario: 1290.00, valor_total: 6450.00 },
      { id: "i4", nota_id: "1", descricao: "Teclado USB ABNT2", codigo_produto: "TEC004", ncm: "8471.60.52", cfop: "5102", cst: "000", quantidade: 20, unidade: "UN", valor_unitario: 45.00, valor_total: 900.00 },
      { id: "i5", nota_id: "1", descricao: "Mouse Óptico USB", codigo_produto: "MOU005", ncm: "8471.60.53", cfop: "5102", cst: "000", quantidade: 20, unidade: "UN", valor_unitario: 210.30, valor_total: 4106.00 },
    ],
    alertas: [],
  },
  {
    id: "2", numero_nota: "005678", serie: "1", chave_acesso: "3523 0212 3456 7890 0001 5500 1000 0056 7810 0056 7890",
    data_emissao: "2025-03-10", emitente_nome: "Metalúrgica São Jorge S/A", emitente_cnpj: "23.456.789/0001-00",
    destinatario_nome: "Construtora Delta Ltda", destinatario_cnpj: "34.567.890/0001-12",
    valor_total: 48320.50, valor_produtos: 44500.00, valor_impostos: 3820.50, valor_frete: 1200.00, valor_desconto: 500.00,
    icms: 2670.00, ipi: 890.00, pis: 133.50, cofins: 615.00, base_calculo_icms: 44500.00,
    status_analise: "inconsistente", tipo_arquivo: "xml", nome_arquivo: "nfe_005678.xml",
    resumo_ia: "Nota emitida por Metalúrgica São Jorge para Construtora Delta. 4 itens de materiais metálicos. Alerta: diferença de R$ 12,00 entre soma dos itens e valor de produtos declarado. Possível erro de arredondamento.",
    created_at: "2025-03-10T14:20:00Z", updated_at: "2025-03-10T14:25:00Z",
    itens: [
      { id: "i6", nota_id: "2", descricao: "Vergalhão CA-50 10mm", ncm: "7214.20.00", cfop: "5101", cst: "000", quantidade: 200, unidade: "BR", valor_unitario: 85.00, valor_total: 17000.00 },
      { id: "i7", nota_id: "2", descricao: "Chapa de Aço 3mm", ncm: "7208.51.00", cfop: "5101", cst: "000", quantidade: 50, unidade: "UN", valor_unitario: 320.00, valor_total: 16000.00 },
      { id: "i8", nota_id: "2", descricao: "Perfil U 100x50mm", ncm: "7216.31.00", cfop: "5101", cst: "000", quantidade: 30, unidade: "BR", valor_unitario: 250.00, valor_total: 7500.00 },
      { id: "i9", nota_id: "2", descricao: "Tubo Galvanizado 2\"", ncm: "7306.30.00", cfop: "5101", cst: "000", quantidade: 40, unidade: "UN", valor_unitario: 100.00, valor_total: 4000.00 },
    ],
    alertas: [
      { id: "a1", nota_id: "2", tipo_alerta: "inconsistencia_valor", descricao: "Diferença de R$ 12,00 entre soma dos itens (R$ 44.500,00) e valor de produtos declarado.", status: "ativo", created_at: "2025-03-10T14:25:00Z" },
    ],
  },
  {
    id: "3", numero_nota: "009012", serie: "1", chave_acesso: "3523 0334 5678 9012 0001 5500 1000 0090 1210 0090 1234",
    data_emissao: "2025-02-28", emitente_nome: "Farmácia Popular Ltda", emitente_cnpj: "45.678.901/0001-23",
    destinatario_nome: "Hospital Regional Norte", destinatario_cnpj: "56.789.012/0001-34",
    valor_total: 8950.00, valor_produtos: 8200.00, valor_impostos: 750.00, valor_frete: 0, valor_desconto: 150.00,
    icms: 492.00, ipi: 0, pis: 134.48, cofins: 123.52, base_calculo_icms: 8200.00,
    status_analise: "processado", tipo_arquivo: "pdf", nome_arquivo: "danfe_009012.pdf",
    resumo_ia: "Nota de medicamentos e insumos hospitalares emitida por Farmácia Popular para Hospital Regional Norte. 3 itens farmacêuticos com isenção de IPI. Valor total R$ 8.950,00.",
    created_at: "2025-02-28T09:00:00Z", updated_at: "2025-02-28T09:10:00Z",
    itens: [
      { id: "i10", nota_id: "3", descricao: "Dipirona Sódica 500mg cx/100", ncm: "3004.90.69", cfop: "5102", cst: "040", quantidade: 100, unidade: "CX", valor_unitario: 32.00, valor_total: 3200.00 },
      { id: "i11", nota_id: "3", descricao: "Soro Fisiológico 500ml", ncm: "3004.90.99", cfop: "5102", cst: "040", quantidade: 200, unidade: "UN", valor_unitario: 8.50, valor_total: 1700.00 },
      { id: "i12", nota_id: "3", descricao: "Luva Procedimento M cx/100", ncm: "4015.19.00", cfop: "5102", cst: "000", quantidade: 50, unidade: "CX", valor_unitario: 66.00, valor_total: 3300.00 },
    ],
    alertas: [],
  },
  {
    id: "4", numero_nota: "012345", serie: "2", chave_acesso: "3523 0456 7890 1234 0001 5500 2000 0123 4510 0123 4567",
    data_emissao: "2025-02-20", emitente_nome: "Auto Peças Central Ltda", emitente_cnpj: "67.890.123/0001-45",
    destinatario_nome: "Transportadora Veloz S/A", destinatario_cnpj: "78.901.234/0001-56",
    valor_total: 22400.00, valor_produtos: 20000.00, valor_impostos: 2400.00, valor_frete: 0, valor_desconto: 0,
    icms: 1440.00, ipi: 600.00, pis: 180.00, cofins: 180.00, base_calculo_icms: 20000.00,
    status_analise: "processado", tipo_arquivo: "xml", nome_arquivo: "nfe_012345.xml",
    resumo_ia: "Nota de autopeças emitida por Auto Peças Central para Transportadora Veloz. 3 itens com impostos regulares. Sem inconsistências.",
    created_at: "2025-02-20T16:45:00Z", updated_at: "2025-02-20T16:50:00Z",
    itens: [
      { id: "i13", nota_id: "4", descricao: "Pneu 295/80 R22.5", ncm: "4011.20.90", cfop: "5102", cst: "000", quantidade: 8, unidade: "UN", valor_unitario: 1800.00, valor_total: 14400.00 },
      { id: "i14", nota_id: "4", descricao: "Pastilha de Freio Traseira", ncm: "6813.81.90", cfop: "5102", cst: "000", quantidade: 10, unidade: "JG", valor_unitario: 320.00, valor_total: 3200.00 },
      { id: "i15", nota_id: "4", descricao: "Filtro de Óleo Motor", ncm: "8421.23.00", cfop: "5102", cst: "000", quantidade: 12, unidade: "UN", valor_unitario: 200.00, valor_total: 2400.00 },
    ],
    alertas: [],
  },
  {
    id: "5", numero_nota: "018900", serie: "1", chave_acesso: "3523 0578 9012 3456 0001 5500 1000 0189 0010 0189 0012",
    data_emissao: "2025-03-01", emitente_nome: "Alimentos Naturais Ltda", emitente_cnpj: "89.012.345/0001-67",
    destinatario_nome: "Restaurante Sabor & Arte ME", destinatario_cnpj: "90.123.456/0001-78",
    valor_total: 6780.00, valor_produtos: 6200.00, valor_impostos: 580.00, valor_frete: 180.00, valor_desconto: 0,
    icms: 372.00, ipi: 0, pis: 108.16, cofins: 99.84, base_calculo_icms: 6200.00,
    status_analise: "processado", tipo_arquivo: "imagem", nome_arquivo: "foto_nota_018900.jpg",
    resumo_ia: "Nota de alimentos naturais para restaurante. 4 itens alimentícios com isenção de IPI. Processada via OCR de imagem. Valor total R$ 6.780,00.",
    created_at: "2025-03-01T11:00:00Z", updated_at: "2025-03-01T11:15:00Z",
    itens: [
      { id: "i16", nota_id: "5", descricao: "Arroz Integral 5kg", ncm: "1006.30.21", cfop: "5102", cst: "040", quantidade: 40, unidade: "PCT", valor_unitario: 28.00, valor_total: 1120.00 },
      { id: "i17", nota_id: "5", descricao: "Feijão Carioca 1kg", ncm: "0713.33.19", cfop: "5102", cst: "040", quantidade: 60, unidade: "PCT", valor_unitario: 12.00, valor_total: 720.00 },
      { id: "i18", nota_id: "5", descricao: "Azeite Extra Virgem 500ml", ncm: "1509.10.00", cfop: "5102", cst: "000", quantidade: 30, unidade: "UN", valor_unitario: 45.00, valor_total: 1350.00 },
      { id: "i19", nota_id: "5", descricao: "Quinoa em Grãos 500g", ncm: "1008.50.90", cfop: "5102", cst: "040", quantidade: 50, unidade: "PCT", valor_unitario: 60.20, valor_total: 3010.00 },
    ],
    alertas: [],
  },
  {
    id: "6", numero_nota: "021567", serie: "1", chave_acesso: "3523 0601 2345 6789 0001 5500 1000 0215 6710 0215 6789",
    data_emissao: "2025-01-18", emitente_nome: "Papelaria Criativa Ltda", emitente_cnpj: "01.234.567/0001-89",
    destinatario_nome: "Escola Futuro Brilhante", destinatario_cnpj: "11.222.333/0001-44",
    valor_total: 3250.00, valor_produtos: 3000.00, valor_impostos: 250.00, valor_frete: 0, valor_desconto: 0,
    icms: 180.00, ipi: 30.00, pis: 19.50, cofins: 20.50, base_calculo_icms: 3000.00,
    status_analise: "pendente", tipo_arquivo: "pdf", nome_arquivo: "danfe_021567.pdf",
    resumo_ia: "Nota em processamento. Dados parciais extraídos do PDF.",
    created_at: "2025-01-18T08:30:00Z", updated_at: "2025-01-18T08:30:00Z",
    itens: [
      { id: "i20", nota_id: "6", descricao: "Caderno Universitário 200fls", ncm: "4820.20.00", cfop: "5102", cst: "000", quantidade: 100, unidade: "UN", valor_unitario: 18.00, valor_total: 1800.00 },
      { id: "i21", nota_id: "6", descricao: "Caneta Esferográfica Azul cx/50", ncm: "9608.10.00", cfop: "5102", cst: "000", quantidade: 20, unidade: "CX", valor_unitario: 60.00, valor_total: 1200.00 },
    ],
    alertas: [
      { id: "a2", nota_id: "6", tipo_alerta: "campo_ausente", descricao: "Inscrição estadual do emitente não identificada no documento.", status: "ativo", created_at: "2025-01-18T08:35:00Z" },
    ],
  },
  {
    id: "7", numero_nota: "034567", serie: "1", chave_acesso: "3523 0712 3456 7890 0001 5500 1000 0345 6710 0345 6789",
    data_emissao: "2025-03-05", emitente_nome: "TechSoft Sistemas Ltda", emitente_cnpj: "22.333.444/0001-55",
    destinatario_nome: "Banco Nacional S/A", destinatario_cnpj: "33.444.555/0001-66",
    valor_total: 95000.00, valor_produtos: 95000.00, valor_impostos: 0, valor_frete: 0, valor_desconto: 0,
    icms: 0, ipi: 0, pis: 1567.50, cofins: 7220.00, base_calculo_icms: 0,
    status_analise: "processado", tipo_arquivo: "xml", nome_arquivo: "nfe_034567.xml",
    resumo_ia: "Nota de serviço de licenciamento de software emitida por TechSoft para Banco Nacional. Item único de R$ 95.000,00 com PIS e COFINS retidos. Sem ICMS/IPI por se tratar de serviço.",
    created_at: "2025-03-05T13:00:00Z", updated_at: "2025-03-05T13:05:00Z",
    itens: [
      { id: "i22", nota_id: "7", descricao: "Licença Software ERP - 12 meses", codigo_produto: "LIC001", ncm: "9999.99.99", cfop: "5933", cst: "041", quantidade: 1, unidade: "UN", valor_unitario: 95000.00, valor_total: 95000.00 },
    ],
    alertas: [],
  },
  {
    id: "8", numero_nota: "045678", serie: "1", chave_acesso: "3523 0834 5678 9012 0001 5500 1000 0456 7810 0456 7890",
    data_emissao: "2025-02-12", emitente_nome: "Distribuidora ABC Ltda", emitente_cnpj: "08.765.432/0001-55",
    destinatario_nome: "Comércio Beta ME", destinatario_cnpj: "12.345.678/0001-90",
    valor_total: 7890.00, valor_produtos: 7200.00, valor_impostos: 690.00, valor_frete: 0, valor_desconto: 0,
    icms: 432.00, ipi: 144.00, pis: 59.40, cofins: 54.60, base_calculo_icms: 7200.00,
    status_analise: "processado", tipo_arquivo: "xml", nome_arquivo: "nfe_045678.xml",
    resumo_ia: "Segunda nota do mesmo emitente (Distribuidora ABC) para Comércio Beta. 2 itens de informática. Sem inconsistências.",
    created_at: "2025-02-12T09:45:00Z", updated_at: "2025-02-12T09:50:00Z",
    itens: [
      { id: "i23", nota_id: "8", descricao: "Notebook 15.6\" i5 8GB", ncm: "8471.30.12", cfop: "5102", cst: "000", quantidade: 3, unidade: "UN", valor_unitario: 1900.00, valor_total: 5700.00 },
      { id: "i24", nota_id: "8", descricao: "Webcam HD 1080p", ncm: "8525.80.19", cfop: "5102", cst: "000", quantidade: 10, unidade: "UN", valor_unitario: 150.00, valor_total: 1500.00 },
    ],
    alertas: [],
  },
  {
    id: "9", numero_nota: "056789", serie: "1", chave_acesso: "3523 0945 6789 0123 0001 5500 1000 0567 8910 0567 8901",
    data_emissao: "2025-01-05", emitente_nome: "Elétrica Luz e Cia", emitente_cnpj: "44.555.666/0001-77",
    destinatario_nome: "Construtora Delta Ltda", destinatario_cnpj: "34.567.890/0001-12",
    valor_total: 12340.00, valor_produtos: 11000.00, valor_impostos: 1340.00, valor_frete: 500.00, valor_desconto: 200.00,
    icms: 792.00, ipi: 330.00, pis: 113.30, cofins: 104.70, base_calculo_icms: 11000.00,
    status_analise: "erro", tipo_arquivo: "imagem", nome_arquivo: "foto_nota_056789.png",
    resumo_ia: "Nota parcialmente processada. Imagem com baixa qualidade dificultou a leitura de alguns campos. Dados principais extraídos com possíveis erros.",
    created_at: "2025-01-05T15:20:00Z", updated_at: "2025-01-05T15:30:00Z",
    itens: [
      { id: "i25", nota_id: "9", descricao: "Fio Elétrico 2.5mm 100m", ncm: "8544.49.00", cfop: "5102", cst: "000", quantidade: 20, unidade: "RL", valor_unitario: 180.00, valor_total: 3600.00 },
      { id: "i26", nota_id: "9", descricao: "Disjuntor Bipolar 32A", ncm: "8536.20.00", cfop: "5102", cst: "000", quantidade: 50, unidade: "UN", valor_unitario: 45.00, valor_total: 2250.00 },
      { id: "i27", nota_id: "9", descricao: "Quadro de Distribuição 24 posições", ncm: "8537.10.20", cfop: "5102", cst: "000", quantidade: 5, unidade: "UN", valor_unitario: 430.00, valor_total: 2150.00 },
      { id: "i28", nota_id: "9", descricao: "Tomada 2P+T 20A", ncm: "8536.69.90", cfop: "5102", cst: "000", quantidade: 100, unidade: "UN", valor_unitario: 30.00, valor_total: 3000.00 },
    ],
    alertas: [
      { id: "a3", nota_id: "9", tipo_alerta: "baixa_qualidade", descricao: "Imagem com resolução baixa. Alguns campos podem conter erros de leitura.", status: "ativo", created_at: "2025-01-05T15:30:00Z" },
      { id: "a4", nota_id: "9", tipo_alerta: "campo_ausente", descricao: "CFOP não identificado no item 'Quadro de Distribuição'.", status: "ativo", created_at: "2025-01-05T15:30:00Z" },
    ],
  },
  {
    id: "10", numero_nota: "067890", serie: "1", chave_acesso: "3523 1056 7890 1234 0001 5500 1000 0678 9010 0678 9012",
    data_emissao: "2025-03-18", emitente_nome: "Gráfica Express Ltda", emitente_cnpj: "55.666.777/0001-88",
    destinatario_nome: "Agência Criativa ME", destinatario_cnpj: "66.777.888/0001-99",
    valor_total: 4500.00, valor_produtos: 4200.00, valor_impostos: 300.00, valor_frete: 0, valor_desconto: 0,
    icms: 252.00, ipi: 0, pis: 27.30, cofins: 20.70, base_calculo_icms: 4200.00,
    status_analise: "processado", tipo_arquivo: "pdf", nome_arquivo: "danfe_067890.pdf",
    resumo_ia: "Nota de serviços gráficos emitida por Gráfica Express para Agência Criativa. 2 itens gráficos. Sem inconsistências.",
    created_at: "2025-03-18T10:00:00Z", updated_at: "2025-03-18T10:05:00Z",
    itens: [
      { id: "i29", nota_id: "10", descricao: "Impressão Folder A4 4x4 cores - 5000 un", ncm: "4911.10.90", cfop: "5102", cst: "000", quantidade: 5000, unidade: "UN", valor_unitario: 0.54, valor_total: 2700.00 },
      { id: "i30", nota_id: "10", descricao: "Cartão de Visita 9x5cm 4x4 - 2000 un", ncm: "4911.10.90", cfop: "5102", cst: "000", quantidade: 2000, unidade: "UN", valor_unitario: 0.75, valor_total: 1500.00 },
    ],
    alertas: [],
  },
  {
    id: "11", numero_nota: "078901", serie: "1", chave_acesso: "3523 1167 8901 2345 0001 5500 1000 0789 0110 0789 0123",
    data_emissao: "2025-01-25", emitente_nome: "Metalúrgica São Jorge S/A", emitente_cnpj: "23.456.789/0001-00",
    destinatario_nome: "Comércio Beta ME", destinatario_cnpj: "12.345.678/0001-90",
    valor_total: 31200.00, valor_produtos: 28500.00, valor_impostos: 2700.00, valor_frete: 800.00, valor_desconto: 0,
    icms: 1710.00, ipi: 570.00, pis: 218.70, cofins: 201.30, base_calculo_icms: 28500.00,
    status_analise: "inconsistente", tipo_arquivo: "xml", nome_arquivo: "nfe_078901.xml",
    resumo_ia: "Nota da Metalúrgica São Jorge para Comércio Beta. 2 itens metálicos. Alerta de possível duplicidade com nota 005678 do mesmo fornecedor.",
    created_at: "2025-01-25T14:00:00Z", updated_at: "2025-01-25T14:10:00Z",
    itens: [
      { id: "i31", nota_id: "11", descricao: "Vergalhão CA-50 10mm", ncm: "7214.20.00", cfop: "5101", cst: "000", quantidade: 150, unidade: "BR", valor_unitario: 85.00, valor_total: 12750.00 },
      { id: "i32", nota_id: "11", descricao: "Chapa de Aço 3mm", ncm: "7208.51.00", cfop: "5101", cst: "000", quantidade: 50, unidade: "UN", valor_unitario: 315.00, valor_total: 15750.00 },
    ],
    alertas: [
      { id: "a5", nota_id: "11", tipo_alerta: "possivel_duplicidade", descricao: "Itens similares à NF 005678 do mesmo fornecedor (Metalúrgica São Jorge). Verificar se não é duplicidade.", status: "ativo", created_at: "2025-01-25T14:10:00Z" },
    ],
  },
  {
    id: "12", numero_nota: "089012", serie: "3", chave_acesso: "3523 1278 9012 3456 0001 5500 3000 0890 1210 0890 1234",
    data_emissao: "2025-03-20", emitente_nome: "Química Industrial S/A", emitente_cnpj: "77.888.999/0001-00",
    destinatario_nome: "Fábrica de Tintas Colorida", destinatario_cnpj: "88.999.000/0001-11",
    valor_total: 67500.00, valor_produtos: 62000.00, valor_impostos: 5500.00, valor_frete: 2000.00, valor_desconto: 0,
    icms: 3720.00, ipi: 930.00, pis: 443.10, cofins: 406.90, base_calculo_icms: 62000.00,
    status_analise: "processado", tipo_arquivo: "xml", nome_arquivo: "nfe_089012.xml",
    resumo_ia: "Nota de produtos químicos industriais emitida por Química Industrial para Fábrica de Tintas. 3 itens de alta valor. Impostos regulares destacados.",
    created_at: "2025-03-20T08:15:00Z", updated_at: "2025-03-20T08:20:00Z",
    itens: [
      { id: "i33", nota_id: "12", descricao: "Dióxido de Titânio 25kg", ncm: "2823.00.10", cfop: "5101", cst: "000", quantidade: 40, unidade: "SC", valor_unitario: 850.00, valor_total: 34000.00 },
      { id: "i34", nota_id: "12", descricao: "Resina Acrílica 200L", ncm: "3906.90.19", cfop: "5101", cst: "000", quantidade: 10, unidade: "TB", valor_unitario: 1800.00, valor_total: 18000.00 },
      { id: "i35", nota_id: "12", descricao: "Solvente Industrial 200L", ncm: "2710.12.59", cfop: "5101", cst: "000", quantidade: 5, unidade: "TB", valor_unitario: 2000.00, valor_total: 10000.00 },
    ],
    alertas: [],
  },
];

export function getMetrics() {
  const totalNotas = mockNotas.length;
  const valorTotal = mockNotas.reduce((s, n) => s + n.valor_total, 0);
  const fornecedores = new Set(mockNotas.map((n) => n.emitente_cnpj)).size;
  const comAlertas = mockNotas.filter((n) => n.alertas.length > 0).length;
  return { totalNotas, valorTotal, fornecedores, comAlertas };
}

export function getNotasByMonth() {
  const months: Record<string, number> = {};
  mockNotas.forEach((n) => {
    const m = n.data_emissao.substring(0, 7);
    months[m] = (months[m] || 0) + 1;
  });
  return Object.entries(months).sort().map(([mes, total]) => ({ mes, total }));
}

export function getNotasByFornecedor() {
  const f: Record<string, { nome: string; total: number; valor: number }> = {};
  mockNotas.forEach((n) => {
    if (!f[n.emitente_cnpj]) f[n.emitente_cnpj] = { nome: n.emitente_nome, total: 0, valor: 0 };
    f[n.emitente_cnpj].total++;
    f[n.emitente_cnpj].valor += n.valor_total;
  });
  return Object.values(f).sort((a, b) => b.valor - a.valor);
}
