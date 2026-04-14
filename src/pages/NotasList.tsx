import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Filter, Download, Eye, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, TipoBadge } from "@/components/StatusBadge";
import { mockNotas } from "@/data/mockData";

const PAGE_SIZE = 8;

export default function NotasList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [tipoFilter, setTipoFilter] = useState("todos");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return mockNotas.filter((n) => {
      const matchSearch = !search || n.numero_nota.includes(search) || n.emitente_nome.toLowerCase().includes(search.toLowerCase()) || n.emitente_cnpj.includes(search);
      const matchStatus = statusFilter === "todos" || n.status_analise === statusFilter;
      const matchTipo = tipoFilter === "todos" || n.tipo_arquivo === tipoFilter;
      return matchSearch && matchStatus && matchTipo;
    });
  }, [search, statusFilter, tipoFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Notas Fiscais</h1>
          <p className="text-muted-foreground">{filtered.length} notas encontradas</p>
        </div>
        <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Exportar</Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por número, emitente ou CNPJ..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9 h-9" />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-[160px] h-9"><Filter className="h-3 w-3 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos Status</SelectItem>
                <SelectItem value="processado">Processado</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="erro">Erro</SelectItem>
                <SelectItem value="inconsistente">Inconsistente</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tipoFilter} onValueChange={(v) => { setTipoFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-[140px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos Tipos</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="imagem">Imagem</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead className="hidden md:table-cell">Emitente</TableHead>
                <TableHead className="hidden lg:table-cell">CNPJ</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Tipo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((n) => (
                <TableRow key={n.id} className="cursor-pointer" onClick={() => navigate(`/notas/${n.id}`)}>
                  <TableCell className="font-medium">{n.numero_nota}</TableCell>
                  <TableCell className="hidden md:table-cell max-w-[200px] truncate">{n.emitente_nome}</TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground text-xs">{n.emitente_cnpj}</TableCell>
                  <TableCell className="text-sm">{new Date(n.data_emissao).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell className="text-right font-medium">R$ {n.valor_total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell><StatusBadge status={n.status_analise} /></TableCell>
                  <TableCell className="hidden sm:table-cell"><TipoBadge tipo={n.tipo_arquivo} /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/notas/${n.id}`)}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-sm text-muted-foreground">Página {page} de {totalPages}</p>
              <div className="flex gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === totalPages} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
