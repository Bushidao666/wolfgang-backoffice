"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Company } from "@/modules/empresas/services/companies.service";
import {
  listCompanyIntegrationBindings,
  listCredentialSets,
  testCompanyIntegration,
  upsertCompanyIntegrationBinding,
  type CompanyIntegrationBinding,
  type CredentialSet,
  type IntegrationMode,
  type IntegrationProvider,
} from "@/modules/integracoes/services/integrations.service";

const providers: { value: IntegrationProvider; label: string }[] = [
  { value: "autentique", label: "Autentique" },
  { value: "evolution", label: "Evolution" },
  { value: "openai", label: "OpenAI" },
];

function safeString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readConfig(binding: CompanyIntegrationBinding | null, key: string): string {
  return safeString(binding?.config_override?.[key]);
}

function findDefaultSet(sets: CredentialSet[], provider: IntegrationProvider) {
  return sets.find((s) => s.provider === provider && s.is_default) ?? sets.find((s) => s.provider === provider) ?? null;
}

function setLabel(setsById: Record<string, CredentialSet>, id: string | null | undefined) {
  if (!id) return "—";
  const s = setsById[id];
  return s ? `${s.name}${s.is_default ? " (default)" : ""}` : id;
}

function isSecretsValidForProvider(provider: IntegrationProvider, secrets: Record<string, string>) {
  if (provider === "autentique") return !!secrets.api_key && !!secrets.webhook_secret;
  if (provider === "evolution") return !!secrets.api_key;
  if (provider === "openai") return !!secrets.api_key;
  return false;
}

function buildConfigForProvider(provider: IntegrationProvider, form: Record<string, string>): Record<string, unknown> {
  const config: Record<string, unknown> = {};
  if (provider === "autentique") {
    if (form.base_url?.trim()) config.base_url = form.base_url.trim();
  }
  if (provider === "evolution") {
    if (form.api_url?.trim()) config.api_url = form.api_url.trim();
  }
  if (provider === "openai") {
    if (form.base_url?.trim()) config.base_url = form.base_url.trim();
    if (form.chat_model?.trim()) config.chat_model = form.chat_model.trim();
    if (form.vision_model?.trim()) config.vision_model = form.vision_model.trim();
    if (form.stt_model?.trim()) config.stt_model = form.stt_model.trim();
    if (form.embedding_model?.trim()) config.embedding_model = form.embedding_model.trim();
  }
  return config;
}

function buildSecretsForProvider(provider: IntegrationProvider, form: Record<string, string>): Record<string, unknown> {
  const secrets: Record<string, unknown> = {};
  if (provider === "autentique") {
    if (form.api_key?.trim()) secrets.api_key = form.api_key.trim();
    if (form.webhook_secret?.trim()) secrets.webhook_secret = form.webhook_secret.trim();
  }
  if (provider === "evolution") {
    if (form.api_key?.trim()) secrets.api_key = form.api_key.trim();
  }
  if (provider === "openai") {
    if (form.api_key?.trim()) secrets.api_key = form.api_key.trim();
  }
  return secrets;
}

function providerFields(provider: IntegrationProvider) {
  if (provider === "autentique") {
    return {
      config: [{ key: "base_url", label: "Base URL (opcional)", placeholder: "https://api.autentique.com.br" }],
      secrets: [
        { key: "api_key", label: "API Key", placeholder: "autentique_api_key" },
        { key: "webhook_secret", label: "Webhook Secret", placeholder: "autentique_webhook_secret" },
      ],
    };
  }
  if (provider === "evolution") {
    return {
      config: [{ key: "api_url", label: "API URL", placeholder: "https://evolution.example" }],
      secrets: [{ key: "api_key", label: "API Key", placeholder: "evolution_api_key" }],
    };
  }
  return {
    config: [
      { key: "base_url", label: "Base URL (opcional)", placeholder: "https://api.openai.com/v1" },
      { key: "chat_model", label: "Chat model (opcional)", placeholder: "gpt-4o-mini" },
      { key: "vision_model", label: "Vision model (opcional)", placeholder: "gpt-4o-mini" },
      { key: "stt_model", label: "STT model (opcional)", placeholder: "whisper-1" },
      { key: "embedding_model", label: "Embedding model (opcional)", placeholder: "text-embedding-3-small" },
    ],
    secrets: [{ key: "api_key", label: "API Key", placeholder: "sk-..." }],
  };
}

function IntegrationEditor({
  open,
  onOpenChange,
  companyId,
  provider,
  initial,
  credentialSets,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  provider: IntegrationProvider;
  initial: CompanyIntegrationBinding | null;
  credentialSets: CredentialSet[];
  onSaved: () => Promise<void>;
}) {
  const [mode, setMode] = React.useState<IntegrationMode>("global");
  const [credentialSetId, setCredentialSetId] = React.useState<string>("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [form, setForm] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setSaving(false);
    const defaults = findDefaultSet(credentialSets, provider);

    setMode(initial?.mode ?? "global");
    setCredentialSetId(initial?.credential_set_id ?? defaults?.id ?? "");

    const seed: Record<string, string> = {};
    if (provider === "autentique") {
      seed.base_url = readConfig(initial, "base_url") || readConfig(initial, "api_base_url");
      seed.api_key = "";
      seed.webhook_secret = "";
    }
    if (provider === "evolution") {
      seed.api_url = readConfig(initial, "api_url");
      seed.api_key = "";
    }
    if (provider === "openai") {
      seed.base_url = readConfig(initial, "base_url") || readConfig(initial, "api_base_url");
      seed.chat_model = readConfig(initial, "chat_model");
      seed.vision_model = readConfig(initial, "vision_model");
      seed.stt_model = readConfig(initial, "stt_model");
      seed.embedding_model = readConfig(initial, "embedding_model");
      seed.api_key = "";
    }
    setForm(seed);
  }, [credentialSets, initial, open, provider]);

  const onSave = React.useCallback(async () => {
    setSaving(true);
    setError(null);

    try {
      if (mode === "global") {
        if (!credentialSetId) throw new Error("Selecione um credential set");
        await upsertCompanyIntegrationBinding(companyId, provider, { mode, credential_set_id: credentialSetId });
      }

      if (mode === "disabled") {
        await upsertCompanyIntegrationBinding(companyId, provider, { mode });
      }

      if (mode === "custom") {
        const config_override = buildConfigForProvider(provider, form);
        const secrets_override = buildSecretsForProvider(provider, form) as Record<string, string>;
        if (!isSecretsValidForProvider(provider, secrets_override)) {
          throw new Error("Preencha os segredos obrigatórios para este provider");
        }
        await upsertCompanyIntegrationBinding(companyId, provider, { mode, config_override, secrets_override });
      }

      await onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar integração");
    } finally {
      setSaving(false);
    }
  }, [companyId, credentialSetId, form, mode, onOpenChange, onSaved, provider]);

  const fields = providerFields(provider);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Configurar integração</DialogTitle>
          <DialogDescription>
            Provider: <span className="font-medium">{provider}</span>
          </DialogDescription>
        </DialogHeader>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="space-y-2">
          <Label>Modo</Label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {(["global", "custom", "disabled"] as const).map((m) => (
              <label key={m} className="flex items-center gap-2 text-sm">
                <input type="radio" name="mode" checked={mode === m} onChange={() => setMode(m)} />
                {m}
              </label>
            ))}
          </div>
        </div>

        {mode === "global" ? (
          <div className="space-y-2">
            <Label htmlFor="credentialSet">Credential set</Label>
            <select
              id="credentialSet"
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={credentialSetId}
              onChange={(e) => setCredentialSetId(e.target.value)}
            >
              <option value="">Selecione...</option>
              {credentialSets
                .filter((s) => s.provider === provider)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.is_default ? " (default)" : ""}
                    {!s.has_secrets ? " ⚠ sem segredos" : ""}
                  </option>
                ))}
            </select>
          </div>
        ) : null}

        {mode === "custom" ? (
          <div className="space-y-4 rounded-md border p-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Config (não-secreto)</p>
              <div className="grid gap-4 md:grid-cols-2">
                {fields.config.map((f) => (
                  <div key={f.key} className="space-y-2 md:col-span-2">
                    <Label htmlFor={`cfg_${f.key}`}>{f.label}</Label>
                    <Input
                      id={`cfg_${f.key}`}
                      value={form[f.key] ?? ""}
                      onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                    />
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="text-sm font-medium">Segredos (serão criptografados)</p>
              <div className="grid gap-4 md:grid-cols-2">
                {fields.secrets.map((f) => (
                  <div key={f.key} className="space-y-2 md:col-span-2">
                    <Label htmlFor={`sec_${f.key}`}>{f.label}</Label>
                    <Input
                      id={`sec_${f.key}`}
                      value={form[f.key] ?? ""}
                      onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Segredos não são exibidos após salvos; re-informe para atualizar.</p>
            </div>
          </div>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CompanyIntegrationsModal({
  open,
  onOpenChange,
  company,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: Company | null;
}) {
  const companyId = company?.id ?? "";
  const bindingsQuery = useQuery({
    queryKey: ["company-integrations", companyId],
    queryFn: () => listCompanyIntegrationBindings(companyId),
    enabled: open && !!companyId,
  });

  const setsQuery = useQuery({
    queryKey: ["integrations", "credential-sets"],
    queryFn: () => listCredentialSets(),
    enabled: open,
  });

  const [error, setError] = React.useState<string | null>(null);
  const [testingProvider, setTestingProvider] = React.useState<IntegrationProvider | null>(null);
  const [editingProvider, setEditingProvider] = React.useState<IntegrationProvider | null>(null);

  const setsById = React.useMemo(() => {
    const map: Record<string, CredentialSet> = {};
    for (const s of setsQuery.data ?? []) map[s.id] = s;
    return map;
  }, [setsQuery.data]);

  const bindingsByProvider = React.useMemo(() => {
    const map: Record<string, CompanyIntegrationBinding> = {};
    for (const b of bindingsQuery.data ?? []) map[b.provider] = b;
    return map;
  }, [bindingsQuery.data]);

  const onTest = React.useCallback(
    async (provider: IntegrationProvider) => {
      if (!companyId) return;
      setTestingProvider(provider);
      setError(null);
      try {
        const res = await testCompanyIntegration(companyId, provider);
        if (!res.ok) throw new Error(res.message ?? "Falha no teste");
        await bindingsQuery.refetch();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha no teste");
      } finally {
        setTestingProvider(null);
      }
    },
    [bindingsQuery, companyId],
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) {
          setError(null);
          setEditingProvider(null);
          setTestingProvider(null);
        }
      }}
    >
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Integrações da empresa</DialogTitle>
          <DialogDescription>{company ? `${company.name} (${company.slug})` : "—"}</DialogDescription>
        </DialogHeader>

        {bindingsQuery.isLoading || setsQuery.isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : null}
        {bindingsQuery.isError ? (
          <p className="text-sm text-destructive">
            {bindingsQuery.error instanceof Error ? bindingsQuery.error.message : "Erro ao carregar integrações"}
          </p>
        ) : null}
        {setsQuery.isError ? (
          <p className="text-sm text-destructive">
            {setsQuery.error instanceof Error ? setsQuery.error.message : "Erro ao carregar credential sets"}
          </p>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>Modo</TableHead>
                <TableHead>Credential set</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Última validação</TableHead>
                <TableHead>Erro</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {providers.map((p) => {
                const binding = bindingsByProvider[p.value] ?? null;
                const effectiveMode: string = binding?.mode ?? "global(default)";
                const setId =
                  binding?.mode === "global"
                    ? binding.credential_set_id
                    : binding?.mode
                      ? null
                      : findDefaultSet(setsQuery.data ?? [], p.value)?.id ?? null;

                return (
                  <TableRow key={p.value}>
                    <TableCell className="font-medium">{p.label}</TableCell>
                    <TableCell>{effectiveMode}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {binding?.mode === "global" || !binding ? setLabel(setsById, setId) : "—"}
                    </TableCell>
                    <TableCell>{binding?.status ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {binding?.last_validated_at ? new Date(binding.last_validated_at).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate text-xs text-muted-foreground">
                      {binding?.last_error ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setEditingProvider(p.value)}>
                          Configurar
                        </Button>
                        <Button size="sm" variant="outline" disabled={testingProvider === p.value} onClick={() => onTest(p.value)}>
                          {testingProvider === p.value ? "Testando..." : "Testar"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>

        {editingProvider ? (
          <IntegrationEditor
            open={!!editingProvider}
            onOpenChange={(o) => {
              if (!o) setEditingProvider(null);
            }}
            companyId={companyId}
            provider={editingProvider}
            initial={bindingsByProvider[editingProvider] ?? null}
            credentialSets={setsQuery.data ?? []}
            onSaved={async () => {
              await bindingsQuery.refetch();
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

