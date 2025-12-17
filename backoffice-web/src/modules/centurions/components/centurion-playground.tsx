"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { testCenturion } from "@/modules/centurions/services/centurions.service";

type ChatMessage = { role: "user" | "assistant"; content: string; ts: number };

export function CenturionPlayground({ companyId, centurionId }: { companyId: string; centurionId: string }) {
  const [input, setInput] = React.useState("");
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const send = React.useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setError(null);
    setSending(true);
    setInput("");

    const ts = Date.now();
    setMessages((prev) => [...prev, { role: "user", content: text, ts }]);

    try {
      const res = await testCenturion(companyId, centurionId, text);
      setMessages((prev) => [...prev, { role: "assistant", content: res.response ?? "", ts: Date.now() }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao testar centurion");
    } finally {
      setSending(false);
    }
  }, [centurionId, companyId, input, sending]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Playground</CardTitle>
        <CardDescription>Teste o prompt sem persistir conversa (endpoint /centurions/:id/test).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">{messages.length ? `${messages.length} mensagem(ns)` : "Envie uma mensagem para começar."}</p>
          <Button variant="outline" onClick={() => setMessages([])} disabled={sending || !messages.length}>
            Reset
          </Button>
        </div>

        <Separator />

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="max-h-96 space-y-3 overflow-auto rounded-md border bg-muted/10 p-3">
          {!messages.length ? (
            <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda.</p>
          ) : (
            messages.map((m, idx) => (
              <div key={`${m.ts}-${idx}`} className={m.role === "user" ? "text-right" : "text-left"}>
                <div className="inline-block max-w-[85%] rounded-md border bg-background px-3 py-2 text-sm shadow-sm">
                  <div className="mb-1 text-xs text-muted-foreground">{m.role === "user" ? "Você" : "Centurion"}</div>
                  <div className="whitespace-pre-wrap">{m.content}</div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite uma mensagem para testar..."
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void send();
              }
            }}
            disabled={sending}
          />
          <Button onClick={() => send()} disabled={sending || !input.trim()}>
            {sending ? "Enviando..." : "Enviar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

