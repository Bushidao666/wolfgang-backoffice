"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { CapabilitiesConfig, type CapabilitiesDraft } from "@/modules/centurions/components/capabilities-config";
import { CenturionPlayground } from "@/modules/centurions/components/centurion-playground";
import { PromptEditor } from "@/modules/centurions/components/prompt-editor";
import { QualificationRules } from "@/modules/centurions/components/qualification-rules";
import { FollowupsConfig } from "@/modules/centurions/followups/followups-config";
import { McpConfig } from "@/modules/centurions/mcp/mcp-config";
import { ToolsConfig } from "@/modules/centurions/tools/tools-config";
import { SchemaEditor } from "@/modules/centurions/tools/schema-editor";
import {
  createCenturion,
  deleteCenturion,
  getCenturion,
  updateCenturion,
} from "@/modules/centurions/services/centurions.service";

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
}

function parseJsonObject(raw: string): { value: Record<string, unknown> | null; error?: string } {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { value: null, error: "JSON deve ser um objeto" };
    }
    return { value: parsed as Record<string, unknown> };
  } catch (err) {
    return { value: null, error: err instanceof Error ? err.message : "JSON inválido" };
  }
}

export function CenturionEditor({ companyId, centurionId }: { companyId: string; centurionId: string }) {
  const router = useRouter();
  const isNew = centurionId === "new";

  const centurionQuery = useQuery({
    queryKey: ["centurion", companyId, centurionId],
    queryFn: () => getCenturion(companyId, centurionId),
    enabled: !!companyId && !!centurionId && !isNew,
  });

  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);
  const [prompt, setPrompt] = React.useState("");
  const [qualificationRules, setQualificationRules] = React.useState<Record<string, unknown>>({});
  const [personalityJson, setPersonalityJson] = React.useState("{}");
  const [personalityError, setPersonalityError] = React.useState<string | undefined>(undefined);
  const [capabilities, setCapabilities] = React.useState<CapabilitiesDraft>({
    can_send_audio: true,
    can_send_image: true,
    can_send_video: true,
    can_process_audio: true,
    can_process_image: true,
    message_chunking_enabled: true,
    chunk_delay_ms: 1500,
    debounce_wait_ms: 3000,
    max_retries: 3,
  });

  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  React.useEffect(() => {
    if (!centurionQuery.data) return;
    const c = centurionQuery.data;
    setName(c.name ?? "");
    setSlug(c.slug ?? "");
    setIsActive(!!c.is_active);
    setPrompt(c.prompt ?? "");
    setQualificationRules((c.qualification_rules ?? {}) as Record<string, unknown>);
    setPersonalityJson(JSON.stringify(c.personality ?? {}, null, 2));
    setCapabilities({
      can_send_audio: !!c.can_send_audio,
      can_send_image: !!c.can_send_image,
      can_send_video: !!c.can_send_video,
      can_process_audio: !!c.can_process_audio,
      can_process_image: !!c.can_process_image,
      message_chunking_enabled: !!c.message_chunking_enabled,
      chunk_delay_ms: Number(c.chunk_delay_ms ?? 1500),
      debounce_wait_ms: Number(c.debounce_wait_ms ?? 3000),
      max_retries: Number(c.max_retries ?? 3),
    });
  }, [centurionQuery.data]);

  const slugIsValid = /^[a-z0-9_]{3,64}$/.test(slug || "");

  const onSave = React.useCallback(async () => {
    setSaveError(null);
    setPersonalityError(undefined);

    if (!name.trim()) {
      setSaveError("Nome é obrigatório");
      return;
    }
    if (!slugIsValid) {
      setSaveError("Slug inválido (use a-z, 0-9 e _; 3-64 chars)");
      return;
    }
    if (!prompt.trim()) {
      setSaveError("Prompt é obrigatório");
      return;
    }

    const parsedPersonality = parseJsonObject(personalityJson);
    if (!parsedPersonality.value) {
      setPersonalityError(parsedPersonality.error);
      setSaveError("Personality JSON inválido");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        slug: slug.trim(),
        prompt,
        is_active: isActive,
        qualification_rules: qualificationRules ?? {},
        personality: parsedPersonality.value,
        ...capabilities,
      };

      if (isNew) {
        const created = await createCenturion(companyId, payload);
        router.replace(`/centurions/${encodeURIComponent(created.id)}?company_id=${encodeURIComponent(companyId)}`);
        return;
      }

      await updateCenturion(companyId, centurionId, payload);
      await centurionQuery.refetch();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }, [
    capabilities,
    centurionId,
    centurionQuery,
    companyId,
    isActive,
    isNew,
    name,
    personalityJson,
    prompt,
    qualificationRules,
    router,
    slug,
    slugIsValid,
  ]);

  const onDelete = React.useCallback(async () => {
    if (isNew) return;
    const ok = window.confirm("Remover este Centurion? Esta ação não pode ser desfeita.");
    if (!ok) return;
    setDeleting(true);
    setSaveError(null);
    try {
      await deleteCenturion(companyId, centurionId);
      router.push(`/centurions?company_id=${encodeURIComponent(companyId)}`);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Erro ao remover");
    } finally {
      setDeleting(false);
    }
  }, [centurionId, companyId, isNew, router]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Centurion</CardTitle>
          <CardDescription>Configuração do bot SDR (prompt, regras, capacidades).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {centurionQuery.isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : null}
          {centurionQuery.isError ? (
            <p className="text-sm text-destructive">
              {centurionQuery.error instanceof Error ? centurionQuery.error.message : "Erro ao carregar centurion"}
            </p>
          ) : null}
          {saveError ? <p className="text-sm text-destructive">{saveError}</p> : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="SDR Principal" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <div className="flex gap-2">
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="sdr_principal"
                />
                <Button type="button" variant="outline" onClick={() => setSlug(slugify(name))} disabled={!name.trim()}>
                  Gerar
                </Button>
              </div>
              {!slugIsValid && slug ? (
                <p className="text-xs text-destructive">Use apenas a-z, 0-9 e _ (3-64 caracteres).</p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex items-center gap-3 rounded-md border bg-muted/20 p-3" htmlFor="is_active">
              <input
                id="is_active"
                type="checkbox"
                className="h-4 w-4"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              <span className="space-y-1">
                <span className="block text-sm font-medium">Ativo</span>
                <span className="block text-xs text-muted-foreground">Controla se o Centurion pode responder novos leads.</span>
              </span>
            </label>
          </div>

          <Separator />

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              {isNew ? "Crie o Centurion para liberar tools, MCP e follow-ups." : "Pronto para salvar alterações."}
            </div>
            <div className="flex gap-2">
              {!isNew ? (
                <Button variant="destructive" onClick={onDelete} disabled={deleting || saving}>
                  {deleting ? "Removendo..." : "Remover"}
                </Button>
              ) : null}
              <Button onClick={onSave} disabled={saving}>
                {saving ? "Salvando..." : isNew ? "Criar" : "Salvar"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <PromptEditor value={prompt} onChange={setPrompt} />

      <QualificationRules value={qualificationRules} onChange={setQualificationRules} />

      <CapabilitiesConfig value={capabilities} onChange={setCapabilities} />

      <Card>
        <CardHeader>
          <CardTitle>Personality (JSON)</CardTitle>
          <CardDescription>Campos livres para personalização avançada (opcional).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <SchemaEditor
            label="Personality"
            value={personalityJson}
            onChange={setPersonalityJson}
            error={personalityError}
            helperText={'Use um objeto JSON. Ex: {"tone":"friendly","language":"pt-BR"}'}
            rows={8}
          />
        </CardContent>
      </Card>

      {!isNew ? (
        <>
          <CenturionPlayground companyId={companyId} centurionId={centurionId} />
          <ToolsConfig companyId={companyId} centurionId={centurionId} />
          <McpConfig companyId={companyId} centurionId={centurionId} />
          <FollowupsConfig companyId={companyId} centurionId={centurionId} />
        </>
      ) : null}
    </div>
  );
}
