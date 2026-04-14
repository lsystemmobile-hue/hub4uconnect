

# Analisador de Notas Fiscais com IA

## Visão Geral
Plataforma SaaS profissional para upload, leitura, organização e análise inteligente de notas fiscais (XML, PDF, imagem), com dashboard visual, assistente IA e painel administrativo.

## Design
- Visual clean, claro, profissional estilo SaaS premium
- Sidebar lateral com navegação principal
- Topbar com busca global
- Cards com sombra sutil, boa hierarquia tipográfica
- Cores: fundo neutro claro, acentos em azul profissional
- Totalmente responsivo (desktop e mobile)

## Estrutura de Telas

### 1. Dashboard Principal
- Cards de métricas: total de notas, valor total, fornecedores únicos, notas com alertas
- Gráfico de notas por período (últimos 6 meses)
- Gráfico de distribuição por fornecedor
- Lista das últimas notas processadas
- Indicadores de inconsistências

### 2. Upload de Notas
- Área de drag & drop com suporte a múltiplos arquivos
- Aceita XML, PDF, imagens (JPG, PNG)
- Barra de progresso por arquivo
- Status de processamento em tempo real
- Feedback visual de sucesso/erro

### 3. Lista de Notas
- Tabela avançada com colunas: número, emitente, CNPJ, data, valor, status, tipo de arquivo
- Filtros por: data, fornecedor, valor, status
- Busca textual
- Ordenação por qualquer coluna
- Paginação
- Ações rápidas (ver detalhes, exportar, excluir)

### 4. Detalhes da Nota
Tela organizada em blocos:
- **Dados principais**: número, série, chave, datas, emitente, destinatário, CNPJ, valor total
- **Produtos/Itens**: tabela com descrição, quantidade, unidade, valores, NCM/CFOP/CST
- **Tributos**: ICMS, IPI, PIS, COFINS com valores e bases de cálculo
- **Resumo IA**: texto em linguagem natural gerado pela IA
- **Alertas**: badges visuais para inconsistências, campos ausentes, duplicidades

### 5. Assistente Inteligente (Chat)
- Chat lateral/modal acessível de qualquer tela
- Responde perguntas sobre notas individuais ou conjunto de notas
- Exemplos: "Qual o valor total desta nota?", "Quais notas do fornecedor X?"
- Respostas objetivas baseadas apenas nos dados do sistema
- Integrado com Lovable AI via edge function

### 6. Painel Administrativo
- Visualização de todas as notas com filtros avançados
- Edição manual de dados extraídos
- Ações: reprocessar, excluir, marcar alertas como resolvidos
- Histórico de uploads
- Exportação em massa

### 7. Exportação
- Exportar nota individual ou lista filtrada
- Formatos: PDF, Excel (XLSX), CSV
- Relatório consolidado com resumo

## Banco de Dados (Supabase)
4 tabelas principais:
- **notas_fiscais**: dados gerais da nota (número, série, chave, emitente, destinatário, valores, status, resumo IA)
- **itens_nota**: produtos/serviços de cada nota (descrição, quantidade, valores, códigos fiscais)
- **alertas_nota**: inconsistências e avisos por nota (tipo, descrição, status)
- **arquivos_upload**: arquivos enviados (nome, tipo, URL no storage, status de processamento)

RLS habilitado em todas as tabelas. Storage bucket para arquivos enviados.

## Dados Mockados
- ~15 notas fiscais realistas com fornecedores brasileiros
- Itens variados por nota (materiais, serviços, insumos)
- Alertas simulados (inconsistência de valor, campo ausente, duplicidade)
- Métricas calculadas a partir dos dados mock

## Navegação (Sidebar)
- 📊 Dashboard
- 📤 Upload
- 📋 Notas Fiscais
- ⚙️ Administração
- 💬 Assistente IA (botão flutuante ou sidebar)

## Implementação Técnica
- Componentes reutilizáveis (NoteCard, MetricCard, FilterBar, DataTable, ChatWidget)
- React Router para navegação entre telas
- Lovable Cloud + Supabase para banco de dados e storage
- Lovable AI para assistente inteligente e resumos
- Estrutura preparada para integração futura com parser XML real e OCR

