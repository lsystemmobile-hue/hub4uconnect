import { useMemo, useState } from "react";
import { Bot, Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useNotas } from "@/hooks/use-notas";
import { useAssistantConfig } from "@/hooks/use-assistant-config";
import { generateAssistantReply, generateLocalReply, hasConfiguredAi, type ChatMessage } from "@/lib/assistant";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Message extends ChatMessage {
  id: string;
  mode?: "api" | "local";
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createInitialMessage(configReady: boolean) {
  return {
    id: makeId(),
    role: "assistant" as const,
    content: configReady
      ? "Olá! Eu consigo responder perguntas sobre as notas fiscais já importadas. Faça uma pergunta sobre valores, alertas, fornecedores ou uma NF específica."
      : "Olá! Configure a API no Admin para ativar respostas com IA. Enquanto isso, posso usar um resumo local das notas já registradas.",
  };
}

export function ChatNotasWidget({ mode = "floating" }: { mode?: "floating" | "inline" }) {
  const { notas } = useNotas();
  const { config } = useAssistantConfig();
  const configReady = hasConfiguredAi(config);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => [createInitialMessage(configReady)]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    const question = input.trim();
    if (!question || isLoading) {
      return;
    }

    setError(null);
    const userMessage: Message = {
      id: makeId(),
      role: "user",
      content: question,
    };

    setMessages((currentMessages) => [...currentMessages, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const reply = configReady
        ? await generateAssistantReply({
            config,
            notas,
            history: messages.map((message) => ({ role: message.role, content: message.content })),
            question,
          })
        : generateLocalReply(question, notas);

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: makeId(),
          role: "assistant",
          content: reply.content,
          mode: reply.mode,
        },
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Não foi possível responder agora.";
      setError(message);
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: makeId(),
          role: "assistant",
          content: "Não consegui responder agora. Verifique a configuração da API no Admin e tente novamente.",
          mode: "local",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const chatContent = (
    <div className="flex h-[520px] min-h-0 w-full flex-col overflow-hidden bg-card">
      <div className={cn("shrink-0 border-b bg-primary p-4", mode === "inline" && "rounded-none")}>
        <div>
          <h3 className="font-semibold text-primary-foreground">Pergunte com IA</h3>
          <p className="text-xs text-primary-foreground/70">Baseado nas notas fiscais importadas neste navegador.</p>
        </div>
      </div>

      {error ? (
        <div className="shrink-0 border-b border-destructive/20 bg-destructive/5 px-4 py-3 text-xs text-destructive">
          {error}
        </div>
      ) : null}

      <ScrollArea className="min-h-0 flex-1 overflow-hidden px-4 py-4">
        <div className="space-y-3 pr-2">
          {messages.map((message) => (
            <div key={message.id} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[88%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap shadow-sm",
                  message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                )}
              >
                <p>{message.content}</p>
              </div>
            </div>
          ))}

          {isLoading ? (
            <div className="flex justify-start">
              <div className="max-w-[88%] rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 animate-pulse" />
                  Pensando com base nas notas...
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </ScrollArea>

      <div className="shrink-0 flex gap-2 border-t p-3">
        <Input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void send();
            }
          }}
          placeholder={configReady ? "Digite sua pergunta..." : "Configure a API no Admin para usar IA"}
          className="h-10 text-sm"
          disabled={isLoading}
        />
        <Button
          size="icon"
          className="h-10 w-10 shrink-0"
          onClick={() => void send()}
          disabled={isLoading || !input.trim()}
          aria-label="Enviar pergunta"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  if (mode === "inline") {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-9">
            <Bot className="mr-2 h-4 w-4" />
            Pergunte com IA
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[380px] p-0" align="end">
          {chatContent}
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <>
      <Button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg"
        size="icon"
        aria-label={open ? "Fechar assistente" : "Abrir assistente"}
      >
        {open ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
      </Button>

      {open ? (
        <div className="fixed bottom-24 right-6 z-50 flex h-[520px] w-[380px] flex-col overflow-hidden rounded-xl border bg-card shadow-2xl">
          {chatContent}
        </div>
      ) : null}
    </>
  );
}
