"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { createCompany, type CreateCompanyIntegration } from "@/modules/empresas/services/companies.service";
import { listCredentialSets, type CredentialSet, type IntegrationProvider } from "@/modules/integracoes/services/integrations.service";

const providers: { value: IntegrationProvider; label: string }[] = [
  { value: "autentique", label: "Autentique" },
  { value: "evolution", label: "Evolution" },
  { value: "openai", label: "OpenAI" },
];

function findDefaultSet(sets: CredentialSet[], provider: IntegrationProvider) {
  return sets.find((s) => s.provider === provider && s.is_default) ?? sets.find((s) => s.provider === provider) ?? null;
}

type GlobalSelection = {
  mode: "global" | "disabled";
  credential_set_id?: string;
};

type CustomAutentique = {
  enabled: boolean;
  base_url: string;
  api_key: string;
  webhook_secret: string;
};

type CustomEvolution = {
  enabled: boolean;
  api_url: string;
  api_key: string;
};

type CustomOpenAI = {
  enabled: boolean;
  base_url: string;
  chat_model: string;
  vision_model: string;
  stt_model: string;
  embedding_model: string;
  api_key: string;
};

function buildIntegrationsFromGlobal(sel: Record<IntegrationProvider, GlobalSelection>): CreateCompanyIntegration[] {
  const out: CreateCompanyIntegration[] = [];
  for (const p of providers) {
    const s = sel[p.value];
    if (!s) continue;
    if (s.mode === "disabled") {
      out.push({ provider: p.value, mode: "disabled" });
      continue;
    }
    if (s.credential_set_id) {
      out.push({ provider: p.value, mode: "global", credential_set_id: s.credential_set_id });
    }
  }
  return out;
}

function buildIntegrationsFromCustom(args: {
  autentique: CustomAutentique;
  evolution: CustomEvolution;
  openai: CustomOpenAI;
}): CreateCompanyIntegration[] {
  const out: CreateCompanyIntegration[] = [];

  if (!args.autentique.enabled) {
    out.push({ provider: "autentique", mode: "disabled" });
  } else {
    out.push({
      provider: "autentique",
      mode: "custom",
      config_override: args.autentique.base_url.trim() ? { base_url: args.autentique.base_url.trim() } : {},
      secrets_override: {
        api_key: args.autentique.api_key.trim(),
        webhook_secret: args.autentique.webhook_secret.trim(),
      },
    });
  }

  if (!args.evolution.enabled) {
    out.push({ provider: "evolution", mode: "disabled" });
  } else {
    out.push({
      provider: "evolution",
      mode: "custom",
      config_override: { api_url: args.evolution.api_url.trim() },
      secrets_override: { api_key: args.evolution.api_key.trim() },
    });
  }

  if (!args.openai.enabled) {
    out.push({ provider: "openai", mode: "disabled" });
  } else {
    const cfg: Record<string, unknown> = {};
    if (args.openai.base_url.trim()) cfg.base_url = args.openai.base_url.trim();
    if (args.openai.chat_model.trim()) cfg.chat_model = args.openai.chat_model.trim();
    if (args.openai.vision_model.trim()) cfg.vision_model = args.openai.vision_model.trim();
    if (args.openai.stt_model.trim()) cfg.stt_model = args.openai.stt_model.trim();
    if (args.openai.embedding_model.trim()) cfg.embedding_model = args.openai.embedding_model.trim();

    out.push({
      provider: "openai",
      mode: "custom",
      config_override: cfg,
      secrets_override: { api_key: args.openai.api_key.trim() },
    });
  }

  return out;
}

export function CreateCompanyWizardModal({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => Promise<void>;
}) {
  const setsQuery = useQuery({
    queryKey: ["integrations", "credential-sets"],
    queryFn: () => listCredentialSets(),
    enabled: open,
  });

  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [name, setName] = React.useState("");
  const [document, setDocument] = React.useState("");

  const [mode, setMode] = React.useState<"global" | "custom">("global");

  const [globalSel, setGlobalSel] = React.useState<Record<IntegrationProvider, GlobalSelection>>({
    autentique: { mode: "global", credential_set_id: "" },
    evolution: { mode: "global", credential_set_id: "" },
    openai: { mode: "global", credential_set_id: "" },
  });

  const [customAutentique, setCustomAutentique] = React.useState<CustomAutentique>({
    enabled: true,
    base_url: "",
    api_key: "",
    webhook_secret: "",
  });
  const [customEvolution, setCustomEvolution] = React.useState<CustomEvolution>({ enabled: true, api_url: "", api_key: "" });
  const [customOpenAI, setCustomOpenAI] = React.useState<CustomOpenAI>({
    enabled: true,
    base_url: "",
    chat_model: "",
    vision_model: "",
    stt_model: "",
    embedding_model: "",
    api_key: "",
  });

  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [defaultsApplied, setDefaultsApplied] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setStep(1);
    setName("");
    setDocument("");
    setMode("global");
    setSaving(false);
    setError(null);
    setDefaultsApplied(false);

    setCustomAutentique({ enabled: true, base_url: "", api_key: "", webhook_secret: "" });
    setCustomEvolution({ enabled: true, api_url: "", api_key: "" });
    setCustomOpenAI({
      enabled: true,
      base_url: "",
      chat_model: "",
      vision_model: "",
      stt_model: "",
      embedding_model: "",
      api_key: "",
    });
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    if (defaultsApplied) return;
    const sets = setsQuery.data ?? null;
    if (!sets) return;
    const untouched = (Object.keys(globalSel) as IntegrationProvider[]).every(
      (k) => globalSel[k].mode === "global" && !globalSel[k].credential_set_id,
    );
    if (!untouched) {
      setDefaultsApplied(true);
      return;
    }
    setGlobalSel({
      autentique: { mode: "global", credential_set_id: findDefaultSet(sets, "autentique")?.id ?? "" },
      evolution: { mode: "global", credential_set_id: findDefaultSet(sets, "evolution")?.id ?? "" },
      openai: { mode: "global", credential_set_id: findDefaultSet(sets, "openai")?.id ?? "" },
    });
    setDefaultsApplied(true);
  }, [defaultsApplied, globalSel, open, setsQuery.data]);

  const integrations = React.useMemo(() => {
    if (mode === "global") return buildIntegrationsFromGlobal(globalSel);
    return buildIntegrationsFromCustom({ autentique: customAutentique, evolution: customEvolution, openai: customOpenAI });
  }, [customAutentique, customEvolution, customOpenAI, globalSel, mode]);

  const canGoNext = React.useMemo(() => {
    if (step === 1) return name.trim().length >= 2;
    return true;
  }, [name, step]);

  const validateBeforeCreate = React.useCallback(() => {
    if (!name.trim()) return "Nome é obrigatório";

    if (mode === "global") {
      for (const p of providers) {
        const sel = globalSel[p.value];
        if (sel?.mode === "global" && !sel.credential_set_id) {
          return `Selecione um credential set para ${p.label} (ou desabilite)`;
        }
      }
    } else {
      if (customAutentique.enabled && (!customAutentique.api_key.trim() || !customAutentique.webhook_secret.trim())) {
        return "Autentique: api_key e webhook_secret são obrigatórios";
      }
      if (customEvolution.enabled && (!customEvolution.api_url.trim() || !customEvolution.api_key.trim())) {
        return "Evolution: api_url e api_key são obrigatórios";
      }
      if (customOpenAI.enabled && !customOpenAI.api_key.trim()) {
        return "OpenAI: api_key é obrigatório";
      }
    }

    return null;
  }, [customAutentique, customEvolution, customOpenAI, globalSel, mode, name]);

  const onCreate = React.useCallback(async () => {
    const validationError = validateBeforeCreate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await createCompany({
        name: name.trim(),
        document: document.trim() ? document.trim() : undefined,
        integrations,
      });
      await onCreated();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar empresa");
    } finally {
      setSaving(false);
    }
  }, [document, integrations, name, onCreated, onOpenChange, validateBeforeCreate]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Nova empresa</DialogTitle>
          <DialogDescription>Cria a empresa, provisiona o schema e configura integrações.</DialogDescription>
        </DialogHeader>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            Etapa <span className="font-medium text-foreground">{step}</span> / 3
          </div>
          <div className="flex gap-2">
            <Button variant="outline" disabled={step === 1 || saving} onClick={() => setStep((s) => (s === 3 ? 2 : 1))}>
              Voltar
            </Button>
            {step < 3 ? (
              <Button disabled={!canGoNext || saving} onClick={() => setStep((s) => (s === 1 ? 2 : 3))}>
                Próximo
              </Button>
            ) : (
              <Button disabled={saving} onClick={onCreate}>
                {saving ? "Criando..." : "Criar empresa"}
              </Button>
            )}
          </div>
        </div>

        <Separator />

        {step === 1 ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Empresa Alpha" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="document">Documento (opcional)</Label>
              <Input id="document" value={document} onChange={(e) => setDocument(e.target.value)} placeholder="CNPJ/CPF" />
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Modo de credenciais</Label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" name="mode" checked={mode === "global"} onChange={() => setMode("global")} />
                  Usar credenciais globais
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" name="mode" checked={mode === "custom"} onChange={() => setMode("custom")} />
                  Configurar credenciais específicas (por empresa)
                </label>
              </div>
            </div>

            {setsQuery.isLoading ? <p className="text-sm text-muted-foreground">Carregando credential sets...</p> : null}
            {setsQuery.isError ? (
              <p className="text-sm text-destructive">
                {setsQuery.error instanceof Error ? setsQuery.error.message : "Erro ao carregar credential sets"}
              </p>
            ) : null}

            {mode === "global" ? (
              <div className="space-y-4 rounded-md border p-4">
                <p className="text-sm font-medium">Selecione o set global por provider</p>
                <div className="grid gap-4">
                  {providers.map((p) => {
                    const sets = (setsQuery.data ?? []).filter((s) => s.provider === p.value);
                    const sel = globalSel[p.value];
                    return (
                      <div key={p.value} className="grid gap-3 md:grid-cols-3">
                        <div className="text-sm font-medium">{p.label}</div>
                        <div className="space-y-2">
                          <Label htmlFor={`mode_${p.value}`}>Modo</Label>
                          <select
                            id={`mode_${p.value}`}
                            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                            value={sel.mode}
                            onChange={(e) =>
                              setGlobalSel((prev) => ({
                                ...prev,
                                [p.value]: { ...prev[p.value], mode: e.target.value as GlobalSelection["mode"] },
                              }))
                            }
                          >
                            <option value="global">global</option>
                            <option value="disabled">disabled</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`set_${p.value}`}>Credential set</Label>
                          <select
                            id={`set_${p.value}`}
                            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                            value={sel.credential_set_id ?? ""}
                            onChange={(e) =>
                              setGlobalSel((prev) => ({
                                ...prev,
                                [p.value]: { ...prev[p.value], credential_set_id: e.target.value },
                              }))
                            }
                            disabled={sel.mode !== "global"}
                          >
                            <option value="">Selecione...</option>
                            {sets.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                                {s.is_default ? " (default)" : ""}
                                {!s.has_secrets ? " ⚠ sem segredos" : ""}
                              </option>
                            ))}
                          </select>
                          {!sets.length ? <p className="text-xs text-muted-foreground">Nenhum set cadastrado para este provider.</p> : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {mode === "custom" ? (
              <div className="space-y-4 rounded-md border p-4">
                <p className="text-sm font-medium">Credenciais específicas por provider</p>

                <div className="space-y-4">
                  <div className="space-y-2 rounded-md border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">Autentique</p>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={!customAutentique.enabled}
                          onChange={(e) => setCustomAutentique((s) => ({ ...s, enabled: !e.target.checked }))}
                        />
                        Desabilitar
                      </label>
                    </div>
                    {customAutentique.enabled ? (
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="aut_base">Base URL (opcional)</Label>
                          <Input id="aut_base" value={customAutentique.base_url} onChange={(e) => setCustomAutentique((s) => ({ ...s, base_url: e.target.value }))} />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="aut_key">API Key</Label>
                          <Input id="aut_key" value={customAutentique.api_key} onChange={(e) => setCustomAutentique((s) => ({ ...s, api_key: e.target.value }))} />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="aut_wh">Webhook Secret</Label>
                          <Input
                            id="aut_wh"
                            value={customAutentique.webhook_secret}
                            onChange={(e) => setCustomAutentique((s) => ({ ...s, webhook_secret: e.target.value }))}
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Provider desabilitado para esta empresa.</p>
                    )}
                  </div>

                  <div className="space-y-2 rounded-md border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">Evolution</p>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={!customEvolution.enabled}
                          onChange={(e) => setCustomEvolution((s) => ({ ...s, enabled: !e.target.checked }))}
                        />
                        Desabilitar
                      </label>
                    </div>
                    {customEvolution.enabled ? (
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="evo_url">API URL</Label>
                          <Input id="evo_url" value={customEvolution.api_url} onChange={(e) => setCustomEvolution((s) => ({ ...s, api_url: e.target.value }))} />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="evo_key">API Key</Label>
                          <Input id="evo_key" value={customEvolution.api_key} onChange={(e) => setCustomEvolution((s) => ({ ...s, api_key: e.target.value }))} />
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Provider desabilitado para esta empresa.</p>
                    )}
                  </div>

                  <div className="space-y-2 rounded-md border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">OpenAI</p>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={!customOpenAI.enabled}
                          onChange={(e) => setCustomOpenAI((s) => ({ ...s, enabled: !e.target.checked }))}
                        />
                        Desabilitar
                      </label>
                    </div>
                    {customOpenAI.enabled ? (
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="oai_base">Base URL (opcional)</Label>
                          <Input id="oai_base" value={customOpenAI.base_url} onChange={(e) => setCustomOpenAI((s) => ({ ...s, base_url: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="oai_chat">Chat model (opcional)</Label>
                          <Input id="oai_chat" value={customOpenAI.chat_model} onChange={(e) => setCustomOpenAI((s) => ({ ...s, chat_model: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="oai_vision">Vision model (opcional)</Label>
                          <Input id="oai_vision" value={customOpenAI.vision_model} onChange={(e) => setCustomOpenAI((s) => ({ ...s, vision_model: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="oai_stt">STT model (opcional)</Label>
                          <Input id="oai_stt" value={customOpenAI.stt_model} onChange={(e) => setCustomOpenAI((s) => ({ ...s, stt_model: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="oai_emb">Embedding model (opcional)</Label>
                          <Input id="oai_emb" value={customOpenAI.embedding_model} onChange={(e) => setCustomOpenAI((s) => ({ ...s, embedding_model: e.target.value }))} />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="oai_key">API Key</Label>
                          <Input id="oai_key" value={customOpenAI.api_key} onChange={(e) => setCustomOpenAI((s) => ({ ...s, api_key: e.target.value }))} />
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Provider desabilitado para esta empresa.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <div className="rounded-md border p-4">
              <p className="text-sm font-medium">Resumo</p>
              <p className="text-sm text-muted-foreground">
                Empresa: <span className="font-medium text-foreground">{name.trim() || "—"}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Documento: <span className="font-medium text-foreground">{document.trim() || "—"}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Modo de integrações: <span className="font-medium text-foreground">{mode}</span>
              </p>
            </div>

            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="p-3 text-left font-medium">Provider</th>
                    <th className="p-3 text-left font-medium">Modo</th>
                    <th className="p-3 text-left font-medium">Detalhes</th>
                  </tr>
                </thead>
                <tbody>
                  {integrations.map((i) => (
                    <tr key={i.provider} className="border-b last:border-b-0">
                      <td className="p-3">{i.provider}</td>
                      <td className="p-3">{i.mode}</td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {i.mode === "global" ? `credential_set_id=${i.credential_set_id}` : null}
                        {i.mode === "custom" ? "custom secrets/config (criptografado)" : null}
                        {i.mode === "disabled" ? "disabled" : null}
                      </td>
                    </tr>
                  ))}
                  {!integrations.length ? (
                    <tr>
                      <td className="p-3 text-sm text-muted-foreground" colSpan={3}>
                        Nenhuma integração configurada.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
