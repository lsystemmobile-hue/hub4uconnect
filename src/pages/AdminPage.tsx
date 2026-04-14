import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, Trash2, CheckCircle, Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge, TipoBadge } from "@/components/StatusBadge";
import { mockNotas } from "@/data/mockData";
import { toast } from "@/hooks/use-toast";

export default function AdminPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState("todos");
  const notas = statusFilter === "todos" ? mockNotas : mockNotas.filter((n) => n.status_analise === statusFilter);

  const handleAction = (action: string, numero: string) => {
    toast({ title: `${action}`, description: `Ação aplicada à NF ${numero}` });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Administração</h1>
          <p className="text-muted-foreground">Gerencie notas fiscais e processamentos</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Exportar Tudo</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Processadas", value: mockNotas.filter((n) => n.status_analise === "processado").length, color: "text-success" },
          { label: "Pendentes", value: mockNotas.filter((n) => n.status_analise === "pendente").length, color: "text-warning" },
          { label: "Com Erro", value: mockNotas.filter((n) => n.status_analise === "erro").length, color: "text-destructive" },
          { label: "Inconsistentes", value: mockNotas.filter((n) => n.status_analise === "inconsistente").length, color: "text-warning" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center">
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Todas as Notas</CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="processado">Processado</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="erro">Erro</SelectItem>
                <SelectItem value="inconsistente">Inconsistente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NF</TableHead>
                <TableHead>Emitente</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Alertas</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notas.map((n) => (
                <TableRow key={n.id}>
                  <TableCell className="font-medium">{n.numero_nota}</TableCell>
                  <TableCell className="max-w-[180px] truncate">{n.emitente_nome}</TableCell>
                  <TableCell className="text-sm">{new Date(n.data_emissao).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell><StatusBadge status={n.status_analise} /></TableCell>
                  <TableCell><TipoBadge tipo={n.tipo_arquivo} /></TableCell>
                  <TableCell>{n.alertas.length > 0 ? <span className="text-destructive font-medium">{n.alertas.length}</span> : <span className="text-muted-foreground">0</span>}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/notas/${n.id}`)}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleAction("Reprocessar", n.numero_nota)}><RefreshCw className="h-4 w-4" /></Button>
                      {n.alertas.length > 0 && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-success" onClick={() => handleAction("Alertas resolvidos", n.numero_nota)}><CheckCircle className="h-4 w-4" /></Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleAction("Excluir", n.numero_nota)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
