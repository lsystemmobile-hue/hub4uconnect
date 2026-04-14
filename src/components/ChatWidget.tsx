import { useState } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { mockNotas } from "@/data/mockData";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const defaultSuggestions = [
  "Qual o valor total de todas as notas?",
  "Quais notas têm inconsistências?",
  "Qual fornecedor teve maior volume?",
];

function generateResponse(input: string): string {
  const lower = input.toLowerCase();
  const totalValor = mockNotas.reduce((s, n) => s + n.valor_total, 0);
  if (lower.includes("valor total") && (lower.includes("todas") || lower.includes("notas")))
    return `O valor total de todas as ${mockNotas.length} notas importadas é de **R$ ${totalValor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}**.`;
  if (lower.includes("inconsistência") || lower.includes("inconsistencia") || lower.includes("alerta")) {
    const alertas = mockNotas.filter((n) => n.alertas.length > 0);
    return `Foram encontradas **${alertas.length} notas com alertas**:\n${alertas.map((n) => `- NF ${n.numero_nota} (${n.emitente_nome}): ${n.alertas.map((a) => a.descricao).join("; ")}`).join("\n")}`;
  }
  if (lower.includes("fornecedor") && lower.includes("maior")) {
    const f: Record<string, { nome: string; valor: number }> = {};
    mockNotas.forEach((n) => {
      if (!f[n.emitente_cnpj]) f[n.emitente_cnpj] = { nome: n.emitente_nome, valor: 0 };
      f[n.emitente_cnpj].valor += n.valor_total;
    });
    const top = Object.values(f).sort((a, b) => b.valor - a.valor)[0];
    return `O fornecedor com maior volume é **${top.nome}** com R$ ${top.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} em notas.`;
  }
  if (lower.includes("quantas notas") || lower.includes("total de notas"))
    return `Existem **${mockNotas.length} notas fiscais** importadas no sistema.`;
  return "Não consegui identificar sua pergunta com precisão. Tente perguntar sobre valores totais, inconsistências, fornecedores ou detalhes de notas específicas.";
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Olá! Sou o assistente fiscal inteligente. Posso responder perguntas sobre suas notas fiscais. Como posso ajudar?" },
  ]);
  const [input, setInput] = useState("");

  const send = () => {
    if (!input.trim()) return;
    const userMsg: Message = { role: "user", content: input };
    const response = generateResponse(input);
    setMessages((prev) => [...prev, userMsg, { role: "assistant", content: response }]);
    setInput("");
  };

  return (
    <>
      <Button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        size="icon"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </Button>

      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[380px] rounded-xl border bg-card shadow-2xl flex flex-col max-h-[500px]">
          <div className="p-4 border-b bg-primary rounded-t-xl">
            <h3 className="font-semibold text-primary-foreground">Assistente Fiscal IA</h3>
            <p className="text-xs text-primary-foreground/70">Pergunte sobre suas notas fiscais</p>
          </div>

          <ScrollArea className="flex-1 p-4 max-h-[340px]">
            <div className="space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                    m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                  )}>
                    {m.content}
                  </div>
                </div>
              ))}
              {messages.length === 1 && (
                <div className="space-y-2 mt-2">
                  <p className="text-xs text-muted-foreground">Sugestões:</p>
                  {defaultSuggestions.map((s) => (
                    <button key={s} onClick={() => { setInput(s); }} className="block w-full text-left text-xs p-2 rounded bg-muted/50 hover:bg-muted transition-colors">
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-3 border-t flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Digite sua pergunta..."
              className="h-9 text-sm"
            />
            <Button size="icon" className="h-9 w-9 shrink-0" onClick={send}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
