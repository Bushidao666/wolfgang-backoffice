"use client";

import * as React from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type CapabilitiesDraft = {
  can_send_audio: boolean;
  can_send_image: boolean;
  can_send_video: boolean;
  can_process_audio: boolean;
  can_process_image: boolean;
  message_chunking_enabled: boolean;
  chunk_delay_ms: number;
  debounce_wait_ms: number;
  max_retries: number;
};

function Toggle({
  id,
  label,
  checked,
  onChange,
  helper,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  helper?: string;
}) {
  return (
    <label className="flex items-start gap-3 rounded-md border bg-muted/20 p-3" htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        className="mt-1 h-4 w-4"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="space-y-1">
        <span className="block text-sm font-medium">{label}</span>
        {helper ? <span className="block text-xs text-muted-foreground">{helper}</span> : null}
      </span>
    </label>
  );
}

export function CapabilitiesConfig({
  value,
  onChange,
}: {
  value: CapabilitiesDraft;
  onChange: (next: CapabilitiesDraft) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Capacidades & humanização</CardTitle>
        <CardDescription>Controle de mídia, chunking e parâmetros operacionais do Centurion.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-medium">Mídia (envio)</p>
          <div className="grid gap-3 md:grid-cols-3">
            <Toggle
              id="can_send_audio"
              label="Pode enviar áudio"
              checked={value.can_send_audio}
              onChange={(v) => onChange({ ...value, can_send_audio: v })}
            />
            <Toggle
              id="can_send_image"
              label="Pode enviar imagem"
              checked={value.can_send_image}
              onChange={(v) => onChange({ ...value, can_send_image: v })}
            />
            <Toggle
              id="can_send_video"
              label="Pode enviar vídeo"
              checked={value.can_send_video}
              onChange={(v) => onChange({ ...value, can_send_video: v })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Mídia (processamento)</p>
          <div className="grid gap-3 md:grid-cols-2">
            <Toggle
              id="can_process_audio"
              label="Pode transcrever áudio"
              checked={value.can_process_audio}
              onChange={(v) => onChange({ ...value, can_process_audio: v })}
              helper="Se desativado, o bot ignora transcrição (fallback para texto)."
            />
            <Toggle
              id="can_process_image"
              label="Pode descrever imagem"
              checked={value.can_process_image}
              onChange={(v) => onChange({ ...value, can_process_image: v })}
              helper="Se desativado, o bot ignora descrição (fallback para texto)."
            />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Humanização</p>
          <div className="grid gap-3 md:grid-cols-2">
            <Toggle
              id="message_chunking_enabled"
              label="Chunking de mensagens"
              checked={value.message_chunking_enabled}
              onChange={(v) => onChange({ ...value, message_chunking_enabled: v })}
              helper="Quebra respostas longas em partes para parecer mais natural."
            />

            <div className="grid gap-3 rounded-md border bg-muted/20 p-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="chunk_delay_ms">Delay entre chunks (ms)</Label>
                <Input
                  id="chunk_delay_ms"
                  type="number"
                  min="0"
                  max="60000"
                  value={String(value.chunk_delay_ms)}
                  onChange={(e) => onChange({ ...value, chunk_delay_ms: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="debounce_wait_ms">Debounce (ms)</Label>
                <Input
                  id="debounce_wait_ms"
                  type="number"
                  min="0"
                  max="60000"
                  value={String(value.debounce_wait_ms)}
                  onChange={(e) => onChange({ ...value, debounce_wait_ms: Number(e.target.value) })}
                />
              </div>
              <p className="col-span-2 text-xs text-muted-foreground">
                Debounce agrupa mensagens do lead antes de responder. Delay controla o ritmo do envio em múltiplas partes.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="max_retries">Max retries</Label>
            <Input
              id="max_retries"
              type="number"
              min="0"
              max="20"
              value={String(value.max_retries)}
              onChange={(e) => onChange({ ...value, max_retries: Number(e.target.value) })}
            />
            <p className="text-xs text-muted-foreground">Número máximo de tentativas para processar/reentregar mensagens.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

