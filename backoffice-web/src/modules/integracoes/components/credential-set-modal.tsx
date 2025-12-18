"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CredentialSet, IntegrationProvider } from "@/modules/integracoes/services/integrations.service";

const providers: { value: IntegrationProvider; label: string }[] = [
  { value: "autentique", label: "Autentique" },
  { value: "evolution", label: "Evolution" },
  { value: "openai", label: "OpenAI" },
];

function readString(obj: Record<string, unknown> | undefined, key: string): string {
  const v = obj?.[key];
  return typeof v === "string" ? v : "";
}

export function CredentialSetModal({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: CredentialSet | null;
  onSubmit: (payload: {
    provider: IntegrationProvider;
    name: string;
    is_default: boolean;
    config: Record<string, unknown>;
    secrets?: Record<string, unknown>;
  }) => Promise<void>;
}) {
  const isEdit = !!initial;

  const [provider, setProvider] = React.useState<IntegrationProvider>(initial?.provider ?? "openai");
  const [name, setName] = React.useState(initial?.name ?? "");
  const [isDefault, setIsDefault] = React.useState(initial?.is_default ?? false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Config fields (provider-dependent)
  const [baseUrl, setBaseUrl] = React.useState("");
  const [webhookSecret, setWebhookSecret] = React.useState("");
  const [apiUrl, setApiUrl] = React.useState("");
  const [apiKey, setApiKey] = React.useState("");
  const [chatModel, setChatModel] = React.useState("");
  const [visionModel, setVisionModel] = React.useState("");
  const [sttModel, setSttModel] = React.useState("");
  const [embeddingModel, setEmbeddingModel] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setProvider(initial?.provider ?? "openai");
    setName(initial?.name ?? "");
    setIsDefault(initial?.is_default ?? false);
    setError(null);
    setSaving(false);

    const cfg = initial?.config ?? {};
    setBaseUrl(readString(cfg, "base_url") || readString(cfg, "api_base_url"));
    setApiUrl(readString(cfg, "api_url"));
    setChatModel(readString(cfg, "chat_model"));
    setVisionModel(readString(cfg, "vision_model"));
    setSttModel(readString(cfg, "stt_model"));
    setEmbeddingModel(readString(cfg, "embedding_model"));

    setApiKey("");
    setWebhookSecret("");
  }, [initial, open]);

  const submit = React.useCallback(async () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    setSaving(true);
    setError(null);

    try {
      const config: Record<string, unknown> = {};
      const secrets: Record<string, unknown> = {};

      if (provider === "autentique") {
        if (baseUrl.trim()) config.base_url = baseUrl.trim();
        if (apiKey.trim()) secrets.api_key = apiKey.trim();
        if (webhookSecret.trim()) secrets.webhook_secret = webhookSecret.trim();
      }

      if (provider === "evolution") {
        if (apiUrl.trim()) config.api_url = apiUrl.trim();
        if (apiKey.trim()) secrets.api_key = apiKey.trim();
      }

      if (provider === "openai") {
        if (baseUrl.trim()) config.base_url = baseUrl.trim();
        if (chatModel.trim()) config.chat_model = chatModel.trim();
        if (visionModel.trim()) config.vision_model = visionModel.trim();
        if (sttModel.trim()) config.stt_model = sttModel.trim();
        if (embeddingModel.trim()) config.embedding_model = embeddingModel.trim();
        if (apiKey.trim()) secrets.api_key = apiKey.trim();
      }

      await onSubmit({
        provider,
        name: trimmedName,
        is_default: isDefault,
        config,
        secrets: Object.keys(secrets).length ? secrets : undefined,
      });

      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar credencial");
    } finally {
      setSaving(false);
    }
  }, [apiKey, apiUrl, baseUrl, chatModel, embeddingModel, isDefault, name, onOpenChange, onSubmit, provider, sttModel, visionModel, webhookSecret]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar credencial global" : "Nova credencial global"}</DialogTitle>
          <DialogDescription>Segredos não são exibidos após salvos; re-informe para atualizar.</DialogDescription>
        </DialogHeader>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="provider">Provider</Label>
            <select
              id="provider"
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={provider}
              onChange={(e) => setProvider(e.target.value as IntegrationProvider)}
              disabled={isEdit}
            >
              {providers.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Default / Account A" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="isDefault"
            type="checkbox"
            className="h-4 w-4"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
          />
          <Label htmlFor="isDefault">Marcar como default (por provider)</Label>
        </div>

        {provider === "autentique" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="baseUrl">Base URL (opcional)</Label>
              <Input
                id="baseUrl"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.autentique.com.br"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input id="apiKey" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="autentique_api_key" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="webhookSecret">Webhook Secret</Label>
              <Input
                id="webhookSecret"
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                placeholder="autentique_webhook_secret"
              />
            </div>
          </div>
        ) : null}

        {provider === "evolution" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="apiUrl">API URL</Label>
              <Input id="apiUrl" value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} placeholder="https://evolution.example" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input id="apiKey" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="evolution_api_key" />
            </div>
          </div>
        ) : null}

        {provider === "openai" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="baseUrl">Base URL (opcional)</Label>
              <Input id="baseUrl" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.openai.com/v1" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chatModel">Chat model (opcional)</Label>
              <Input id="chatModel" value={chatModel} onChange={(e) => setChatModel(e.target.value)} placeholder="gpt-4o-mini" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="visionModel">Vision model (opcional)</Label>
              <Input id="visionModel" value={visionModel} onChange={(e) => setVisionModel(e.target.value)} placeholder="gpt-4o-mini" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sttModel">STT model (opcional)</Label>
              <Input id="sttModel" value={sttModel} onChange={(e) => setSttModel(e.target.value)} placeholder="whisper-1" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="embeddingModel">Embedding model (opcional)</Label>
              <Input
                id="embeddingModel"
                value={embeddingModel}
                onChange={(e) => setEmbeddingModel(e.target.value)}
                placeholder="text-embedding-3-small"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input id="apiKey" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." />
            </div>
          </div>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving || !name.trim()}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

