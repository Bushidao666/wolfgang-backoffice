"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SchemaEditor } from "@/modules/centurions/tools/schema-editor";

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string" && v.trim().length > 0) : [];
}

type CriterionType = "field_present" | "llm";

function asString(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function asCriteriaRecords(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v));
}

function criterionTypeOf(value: unknown): CriterionType {
  return value === "llm" ? "llm" : "field_present";
}

function suggestCriterionKey(existing: Set<string>, base: string): string {
  const cleaned = base.trim().replace(/[^a-zA-Z0-9_]+/g, "_").replace(/^_+|_+$/g, "") || "criterion";
  if (!existing.has(cleaned)) return cleaned;
  for (let i = 2; i <= 50; i++) {
    const k = `${cleaned}_${i}`;
    if (!existing.has(k)) return k;
  }
  return `${cleaned}_${Date.now()}`;
}

export function QualificationRules({
  value,
  onChange,
}: {
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const requiredFields = asStringArray(value.required_fields);
  const criteria = asCriteriaRecords(value.criteria);
  const threshold = clamp(asNumber(value.threshold, 1.0), 0, 1);
  const totalWeight = criteria.reduce((sum, c) => sum + clamp(asNumber(c.weight, 0), 0, 1), 0);

  const [newField, setNewField] = React.useState("");
  const [jsonText, setJsonText] = React.useState(() => JSON.stringify(value ?? {}, null, 2));
  const [jsonError, setJsonError] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    setJsonText(JSON.stringify(value ?? {}, null, 2));
  }, [value]);

  const addField = React.useCallback(() => {
    const trimmed = newField.trim();
    if (!trimmed) return;
    if (requiredFields.includes(trimmed)) {
      setNewField("");
      return;
    }
    onChange({ ...value, required_fields: [...requiredFields, trimmed] });
    setNewField("");
  }, [newField, onChange, requiredFields, value]);

  const removeField = React.useCallback(
    (field: string) => {
      onChange({ ...value, required_fields: requiredFields.filter((f) => f !== field) });
    },
    [onChange, requiredFields, value],
  );

  const applyJson = React.useCallback(() => {
    try {
      const parsed = JSON.parse(jsonText) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        setJsonError("JSON deve ser um objeto");
        return;
      }
      setJsonError(undefined);
      onChange(parsed as Record<string, unknown>);
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : "JSON inválido");
    }
  }, [jsonText, onChange]);

  const updateCriteria = React.useCallback(
    (next: Record<string, unknown>[]) => {
      onChange({ ...value, criteria: next });
    },
    [onChange, value],
  );

  const addCriterion = React.useCallback(() => {
    const existingKeys = new Set(criteria.map((c) => asString(c.key)).filter(Boolean));
    const key = suggestCriterionKey(existingKeys, "criterion");
    updateCriteria([
      ...criteria,
      {
        key,
        label: "",
        type: "field_present",
        field: key,
        weight: criteria.length ? 0.25 : 1.0,
        required: false,
      },
    ]);
  }, [criteria, updateCriteria]);

  const removeCriterion = React.useCallback(
    (index: number) => {
      updateCriteria(criteria.filter((_, i) => i !== index));
    },
    [criteria, updateCriteria],
  );

  const updateCriterion = React.useCallback(
    (index: number, patch: Record<string, unknown>) => {
      updateCriteria(criteria.map((c, i) => (i === index ? { ...c, ...patch } : c)));
    },
    [criteria, updateCriteria],
  );

  const normalizeWeights = React.useCallback(() => {
    if (!criteria.length) return;
    if (totalWeight > 0) {
      updateCriteria(
        criteria.map((c) => {
          const w = clamp(asNumber(c.weight, 0), 0, 1);
          return { ...c, weight: clamp(w / totalWeight, 0, 1) };
        }),
      );
      return;
    }
    const eq = 1 / criteria.length;
    updateCriteria(criteria.map((c) => ({ ...c, weight: clamp(eq, 0, 1) })));
  }, [criteria, totalWeight, updateCriteria]);

  const importLegacyFields = React.useCallback(() => {
    if (!requiredFields.length) return;
    const existingKeys = new Set(criteria.map((c) => asString(c.key)).filter(Boolean));
    const generated = requiredFields.map((field) => {
      const key = suggestCriterionKey(existingKeys, field);
      existingKeys.add(key);
      return {
        key,
        label: field,
        type: "field_present",
        field,
        weight: clamp(1 / requiredFields.length, 0, 1),
        required: true,
      } satisfies Record<string, unknown>;
    });
    onChange({ ...value, criteria: [...criteria, ...generated] });
  }, [criteria, onChange, requiredFields, value]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Regras de qualificação</CardTitle>
        <CardDescription>Define critérios ponderados (vNext), campos obrigatórios (legacy) e threshold.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="threshold">Threshold</Label>
          <Input
            id="threshold"
            type="number"
            min="0"
            max="1"
            step="0.05"
            value={String(threshold)}
            onChange={(e) => onChange({ ...value, threshold: clamp(Number(e.target.value), 0, 1) })}
          />
          <p className="text-xs text-muted-foreground">
            Score mínimo entre 0 e 1 para considerar qualificado (critérios required também precisam ser atendidos).
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Label>Critérios (vNext)</Label>
              <p className="text-xs text-muted-foreground">
                Cada critério contribui para o score (peso) e pode ser obrigatório. Peso total recomendado: 1.0.
              </p>
              <p className="text-xs text-muted-foreground">Peso total atual: {totalWeight.toFixed(2)}</p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={normalizeWeights} disabled={!criteria.length}>
                Normalizar pesos
              </Button>
              <Button type="button" onClick={addCriterion}>
                Adicionar critério
              </Button>
            </div>
          </div>

          {!criteria.length ? (
            <div className="rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">
              Nenhum critério definido ainda.
            </div>
          ) : null}

          <div className="space-y-3">
            {criteria.map((c, idx) => {
              const type = criterionTypeOf(c.type);
              const key = asString(c.key);
              const weight = clamp(asNumber(c.weight, 0), 0, 1);
              const required = asBoolean(c.required, false);
              const label = asString(c.label);
              const field = asString(c.field);
              const prompt = asString(c.prompt);

              return (
                <div key={`${key || "criterion"}:${idx}`} className="rounded-md border bg-muted/10 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium">Critério #{idx + 1}</div>
                    <Button type="button" variant="destructive" onClick={() => removeCriterion(idx)}>
                      Remover
                    </Button>
                  </div>

                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Key</Label>
                      <Input
                        value={key}
                        onChange={(e) => updateCriterion(idx, { key: e.target.value })}
                        placeholder="ex: budget"
                      />
                      <p className="text-xs text-muted-foreground">Identificador único do critério (usado no histórico).</p>
                    </div>

                    <div className="space-y-2">
                      <Label>Label (opcional)</Label>
                      <Input
                        value={label}
                        onChange={(e) => updateCriterion(idx, { label: e.target.value })}
                        placeholder="ex: Orçamento"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <select
                        className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                        value={type}
                        onChange={(e) => {
                          const nextType = criterionTypeOf(e.target.value);
                          if (nextType === "field_present") {
                            updateCriterion(idx, { type: nextType, field: field || key || "", prompt: undefined });
                          } else {
                            updateCriterion(idx, { type: nextType, prompt: prompt || "", field: undefined });
                          }
                        }}
                      >
                        <option value="field_present">field_present</option>
                        <option value="llm">llm</option>
                      </select>
                      <p className="text-xs text-muted-foreground">
                        field_present verifica presença de um campo; llm avalia via prompt (vNext).
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Peso</Label>
                      <Input
                        type="number"
                        min="0"
                        max="1"
                        step="0.05"
                        value={String(weight)}
                        onChange={(e) => updateCriterion(idx, { weight: clamp(Number(e.target.value), 0, 1) })}
                      />
                      <p className="text-xs text-muted-foreground">Entre 0 e 1.</p>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    <label className="flex items-center gap-3 rounded-md border bg-muted/10 p-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={required}
                        onChange={(e) => updateCriterion(idx, { required: e.target.checked })}
                      />
                      <span className="space-y-1">
                        <span className="block text-sm font-medium">Required</span>
                        <span className="block text-xs text-muted-foreground">Se marcado, deve ser atendido para qualificar.</span>
                      </span>
                    </label>

                    {type === "field_present" ? (
                      <div className="space-y-2">
                        <Label>Field</Label>
                        <Input
                          value={field}
                          onChange={(e) => updateCriterion(idx, { field: e.target.value })}
                          placeholder="ex: budget"
                        />
                        <p className="text-xs text-muted-foreground">
                          Nome do campo a ser considerado presente (ex: budget, date, location).
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label>Prompt (LLM)</Label>
                        <textarea
                          className="min-h-[42px] w-full rounded-md border bg-background px-3 py-2 text-sm"
                          value={prompt}
                          onChange={(e) => updateCriterion(idx, { prompt: e.target.value })}
                          placeholder="Descreva como avaliar este critério a partir do contexto..."
                          rows={3}
                        />
                        <p className="text-xs text-muted-foreground">Use instruções objetivas e saída booleana (met/not met).</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Label>Campos obrigatórios (legacy)</Label>
              <p className="text-xs text-muted-foreground">
                Mantido por compatibilidade. Se você já usa critérios (vNext), prefira configurar required via critérios.
              </p>
            </div>
            <Button type="button" variant="outline" onClick={importLegacyFields} disabled={!requiredFields.length}>
              Importar para critérios
            </Button>
          </div>
          <div className="flex gap-2">
            <Input
              value={newField}
              onChange={(e) => setNewField(e.target.value)}
              placeholder="ex: budget, date, location"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addField();
                }
              }}
            />
            <Button type="button" onClick={addField} disabled={!newField.trim()}>
              Adicionar
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {requiredFields.map((f) => (
              <button
                key={f}
                type="button"
                className="inline-flex items-center gap-2 rounded-md border bg-muted/30 px-2 py-1 text-xs"
                onClick={() => removeField(f)}
                title="Remover"
              >
                <span>{f}</span>
                <span className="text-muted-foreground">×</span>
              </button>
            ))}
            {!requiredFields.length ? <span className="text-xs text-muted-foreground">Nenhum campo definido.</span> : null}
          </div>
        </div>

        <div className="space-y-2">
          <SchemaEditor
            label="JSON avançado (opcional)"
            value={jsonText}
            onChange={setJsonText}
            error={jsonError}
            helperText="Você pode editar manualmente o JSON das regras (criteria, required_fields, threshold, metadata...)."
            rows={10}
          />
          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={applyJson}>
              Aplicar JSON
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
