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

export function QualificationRules({
  value,
  onChange,
}: {
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const requiredFields = asStringArray(value.required_fields);
  const thresholdRaw = value.threshold;
  const threshold =
    typeof thresholdRaw === "number"
      ? thresholdRaw
      : typeof thresholdRaw === "string" && thresholdRaw.trim()
        ? Number(thresholdRaw)
        : 1.0;

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Regras de qualificação</CardTitle>
        <CardDescription>Define campos obrigatórios e threshold para marcar lead como qualificado.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Campos obrigatórios</Label>
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
            <Label htmlFor="threshold">Threshold</Label>
            <Input
              id="threshold"
              type="number"
              min="0"
              max="1"
              step="0.05"
              value={Number.isFinite(threshold) ? String(threshold) : "1"}
              onChange={(e) => onChange({ ...value, threshold: Number(e.target.value) })}
            />
            <p className="text-xs text-muted-foreground">
              Score mínimo entre 0 e 1 para considerar qualificado (exige também todos os campos obrigatórios).
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <SchemaEditor
            label="JSON avançado (opcional)"
            value={jsonText}
            onChange={setJsonText}
            error={jsonError}
            helperText="Você pode editar manualmente o JSON das regras (required_fields, threshold, etc)."
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

