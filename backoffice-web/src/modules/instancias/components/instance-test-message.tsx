"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendInstanceTestMessage } from "@/modules/instancias/services/instances.service";

export function InstanceTestMessageModal({
  open,
  onOpenChange,
  instanceId,
  instanceName,
  channelType,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instanceId: string;
  instanceName: string;
  channelType: string;
}) {
  const [to, setTo] = React.useState("");
  const [text, setText] = React.useState("Olá! Teste de envio (Wolfgang).");
  const [error, setError] = React.useState<string | null>(null);
  const [sending, setSending] = React.useState(false);

  const reset = React.useCallback(() => {
    setTo("");
    setText("Olá! Teste de envio (Wolfgang).");
    setError(null);
    setSending(false);
  }, []);

  const onSend = React.useCallback(async () => {
    if (!to.trim() || !text.trim()) return;
    setSending(true);
    setError(null);
    try {
      await sendInstanceTestMessage(instanceId, { to: to.trim(), text: text.trim() });
      onOpenChange(false);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao enviar");
    } finally {
      setSending(false);
    }
  }, [instanceId, onOpenChange, reset, text, to]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Teste de envio</DialogTitle>
          <DialogDescription>
            Envia uma mensagem via instância {channelType} ({instanceName}).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="to">Destino</Label>
            <Input
              id="to"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder={channelType === "telegram" ? "telegram:<chat_id> ou <chat_id>" : "número/ID"}
            />
            <p className="text-xs text-muted-foreground">
              Para Telegram/Instagram, pode usar prefixos `telegram:` / `instagram:`.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="text">Mensagem</Label>
            <textarea
              id="text"
              className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={onSend} disabled={sending || !to.trim() || !text.trim()}>
              {sending ? "Enviando..." : "Enviar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

