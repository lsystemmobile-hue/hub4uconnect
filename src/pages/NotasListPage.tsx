import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Download, ChevronLeft, ChevronRight, Calendar, Building2, DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useNotas } from "@/hooks/use-notas";
import { formatCurrency, formatDate, formatMonthShort, groupNotasByCnpjAndMonth } from "@/lib/notas";
import { ChatNotasWidget } from "@/components/ChatNotasWidget";

const PAGE_SIZE = 8;

export default function NotasListPage() {
  const navigate = useNavigate();
  const { notas, exportCsv } = useNotas();
  const [search, setSearch] = useState("");
  const [periodFilter, setPeriodFilter] = useState("todos");
  const [emitterFilter, setEmitterFilter] = useState("todos");
  const [minValue, setMinValue] = useState("");
  const [maxValue, setMaxValue] = useState("");
  const [page, setPage] = useState(1);
  const [showAll, setShowAll] = useState(false);

  const availablePeriods = useMemo(() => {
    const periods = new Set<string>();

    notas.forEach((nota) => {
      if (!nota.data_emissao) {
        return;
      }

      const [, month, year] = formatDate(nota.data_emissao).split("/");
      if (month && year) {
        periods.add(`${month}/${year.slice(2)}`);
      }
    });

    return Array.from(periods).sort((a, b) => {
      const [monthA, yearA] = a.split("/").map(Number);
      const [monthB, yearB] = b.split("/").map(Number);
      return yearA !== yearB ? yearB - yearA : monthB - monthA;
    });
  }, [notas]);

  const availableEmitters = useMemo(() => {
    const emitters = new Set<string>();

    notas.forEach((nota) => {
      if (nota.emitente_nome) {
        emitters.add(nota.emitente_nome);
      }
    });

    return Array.from(emitters).sort();
  }, [notas]);

  const filtered = useMemo(() => {
    const normalizedSearch = search.toLowerCase();

    return notas.filter((nota) => {
      const matchSearch =
        !search ||
        nota.nome_arquivo.toLowerCase().includes(normalizedSearch) ||
        (nota.numero_nota?.includes(search) ?? false) ||
        (nota.emitente_nome?.toLowerCase().includes(normalizedSearch) ?? false) ||
        (nota.emitente_cnpj?.includes(search) ?? false);

      let matchPeriod = periodFilter === "todos";
      if (!matchPeriod && nota.data_emissao) {
        const [, month, year] = formatDate(nota.data_emissao).split("/");
        if (month && year) {
          matchPeriod = `${month}/${year.slice(2)}` === periodFilter;
        }
      }

      const matchEmitter = emitterFilter === "todos" || nota.emitente_nome === emitterFilter;

      const value = nota.valor_total ?? 0;
      const min = minValue ? Number.parseFloat(minValue) : -Infinity;
      const max = maxValue ? Number.parseFloat(maxValue) : Infinity;
      const matchValue = value >= min && value <= max;

      return matchSearch && matchPeriod && matchEmitter && matchValue;
    });
  }, [notas, search, periodFilter, emitterFilter, minValue, maxValue]);

  const resumoRows = useMemo(() => groupNotasByCnpjAndMonth(filtered), [filtered]);
  const totalPages = Math.ceil(resumoRows.length / PAGE_SIZE);
  const currentPage = totalPages === 0 ? 1 : Math.min(page, totalPages);
  const visibleRows = showAll ? resumoRows : resumoRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const totalQuantidade = resumoRows.reduce((sum, row) => sum + row.quantidade, 0);
  const totalValor = filtered.reduce((sum, nota) => sum + (nota.valor_total ?? 0), 0);

  const handleExport = () => {
    exportCsv(filtered.map((nota) => nota.id), "resumo-iob-filtrado.csv");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notas Fiscais</h1>
          <p className="text-muted-foreground">{filtered.length} notas encontradas</p>
        </div>
        <div className="flex items-center gap-2">
          <ChatNotasWidget mode="inline" />
          <Button variant="outline" size="sm" disabled={filtered.length === 0} onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Exportar Resumo IOB
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="px-6 pb-3">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por arquivo, numero, emitente ou CNPJ..."
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  className="h-10 w-full pl-10"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex w-full items-center sm:w-[180px]">
                  <Calendar className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Select
                    value={periodFilter}
                    onValueChange={(value) => {
                      setPeriodFilter(value);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="h-10 w-full bg-background pl-9">
                      <SelectValue placeholder="Periodo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos Periodos</SelectItem>
                      {availablePeriods.map((period) => (
                        <SelectItem key={period} value={period}>
                          {period}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="relative flex w-full items-center sm:w-[260px]">
                  <Building2 className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Select
                    value={emitterFilter}
                    onValueChange={(value) => {
                      setEmitterFilter(value);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="h-10 w-full bg-background pl-9">
                      <SelectValue placeholder="Fornecedor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos Fornecedores</SelectItem>
                      {availableEmitters.map((emitter) => (
                        <SelectItem key={emitter} value={emitter}>
                          {emitter}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex h-10 items-center gap-2 rounded-md border bg-muted/30 p-1.5 px-3">
                  <DollarSign className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="mr-1 hidden text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:inline">
                    Valores
                  </span>
                  <Input
                    type="number"
                    placeholder="Min"
                    value={minValue}
                    onChange={(event) => {
                      setMinValue(event.target.value);
                      setPage(1);
                    }}
                    className="h-7 w-24 bg-background px-2 text-xs"
                  />
                  <span className="text-xs text-muted-foreground">ate</span>
                  <Input
                    type="number"
                    placeholder="Max"
                    value={maxValue}
                    onChange={(event) => {
                      setMaxValue(event.target.value);
                      setPage(1);
                    }}
                    className="h-7 w-24 bg-background px-2 text-xs"
                  />
                </div>

                {(search || periodFilter !== "todos" || emitterFilter !== "todos" || minValue || maxValue) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearch("");
                      setPeriodFilter("todos");
                      setEmitterFilter("todos");
                      setMinValue("");
                      setMaxValue("");
                      setPage(1);
                    }}
                    className="flex h-10 items-center gap-1 text-xs text-primary hover:bg-primary/5 hover:text-primary/90"
                  >
                    Limpar
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table className="border-collapse border border-slate-300 dark:border-slate-700">
            <TableHeader>
              <TableRow className="bg-slate-100 dark:bg-slate-800">
                <TableHead className="border border-slate-300 font-bold text-slate-900 dark:border-slate-700 dark:text-slate-100">
                  Nome da empresa
                </TableHead>
                <TableHead className="border border-slate-300 font-bold text-slate-900 dark:border-slate-700 dark:text-slate-100">
                  CNPJ
                </TableHead>
                <TableHead className="border border-slate-300 text-center font-bold text-slate-900 dark:border-slate-700 dark:text-slate-100">
                  Quantidade
                </TableHead>
                <TableHead className="border border-slate-300 text-right font-bold text-slate-900 dark:border-slate-700 dark:text-slate-100">
                  Valor
                </TableHead>
                <TableHead className="border border-slate-300 text-center font-bold text-slate-900 dark:border-slate-700 dark:text-slate-100">
                  Mes
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRows.length > 0 ? (
                visibleRows.map((row) => (
                  <TableRow
                    key={row.key}
                    className="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-900"
                    onClick={() => navigate(`/nf-analyzer/notas/${row.representative_nota_id}`)}
                  >
                    <TableCell className="border border-slate-300 font-medium dark:border-slate-700">
                      {row.nome_empresa}
                    </TableCell>
                    <TableCell className="border border-slate-300 text-xs text-muted-foreground dark:border-slate-700">
                      {row.cnpj}
                    </TableCell>
                    <TableCell className="border border-slate-300 text-center dark:border-slate-700">
                      {row.quantidade}
                    </TableCell>
                    <TableCell className="border border-slate-300 text-right font-medium dark:border-slate-700">
                      {formatCurrency(row.valor_total)}
                    </TableCell>
                    <TableCell className="border border-slate-300 text-center text-sm dark:border-slate-700">
                      {formatMonthShort(row.year_month)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="border border-slate-300 py-10 text-center text-muted-foreground dark:border-slate-700">
                    Nenhuma nota encontrada para os filtros selecionados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>

            {filtered.length > 0 && (
              <TableFooter>
                <TableRow className="bg-slate-50 font-bold dark:bg-slate-900">
                  <TableCell colSpan={2} className="border border-slate-300 text-slate-900 dark:border-slate-700 dark:text-slate-100">
                    TOTAL GERAL ({filtered.length} notas)
                  </TableCell>
                  <TableCell className="border border-slate-300 text-center text-slate-900 dark:border-slate-700 dark:text-slate-100">
                    {totalQuantidade}
                  </TableCell>
                  <TableCell className="border border-slate-300 text-right text-slate-900 dark:border-slate-700 dark:text-slate-100">
                    {formatCurrency(totalValor)}
                  </TableCell>
                  <TableCell className="border border-slate-300 dark:border-slate-700" />
                </TableRow>
              </TableFooter>
            )}
          </Table>

          {resumoRows.length > 0 ? (
            <div className="flex items-center justify-between border-t p-4">
              <p className="text-sm text-muted-foreground">
                {showAll ? `Ver todos (${resumoRows.length} linhas)` : `Pagina ${currentPage} de ${totalPages}`}
              </p>
              <div className="flex items-center gap-2">
                {showAll ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowAll(false);
                      setPage(1);
                    }}
                    aria-label="Voltar à paginação"
                  >
                    Voltar à paginação
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAll(true)}
                    aria-label="Ver todos"
                  >
                    Ver todos
                  </Button>
                )}
                {!showAll ? (
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={currentPage === 1}
                      onClick={() => setPage(currentPage - 1)}
                      aria-label="Pagina anterior"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={currentPage === totalPages}
                      onClick={() => setPage(currentPage + 1)}
                      aria-label="Proxima pagina"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
