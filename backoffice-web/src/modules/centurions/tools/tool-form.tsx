"use client";

import * as React from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SchemaEditor } from "@/modules/centurions/tools/schema-editor";
import { createTool, type CreateToolInput, updateTool, type ToolConfigRow } from "@/modules/centurions/tools/services/tools.service";

type FormValues = {
  tool_name: string;
  description: string;
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  auth_type: string;
  timeout_ms: number;
  retry_count: number;
  is_active: boolean;
};

function stringifyJson(value: unknown, fallback = "{\\n  \\n}") {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return fallback;
  }
}

function parseJson(text: string, label: string): { value?: Record<string, unknown>; error?: string } {
  if (!text.trim()) return { value: {} };
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object") return { error: `${label} deve ser um objeto JSON.` };
    return { value: parsed as Record<string, unknown> };
  } catch (err) {
    return { error: `${label} JSON inválido: ${(err as Error).message}` };
  }
}

export function ToolForm({
  open,
  onOpenChange,
  companyId,
  centurionId,
  tool,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  centurionId: string;
  tool?: ToolConfigRow;
  onSaved: () => void;
}) {
  const form = useForm<FormValues>({
    defaultValues: {
      tool_name: tool?.tool_name ?? "",
      description: tool?.description ?? "",
      endpoint: tool?.endpoint ?? "",
      method: (tool?.method as FormValues["method"]) ?? "POST",
      auth_type: tool?.auth_type ?? "none",
      timeout_ms: tool?.timeout_ms ?? 10000,
      retry_count: tool?.retry_count ?? 1,
      is_active: tool?.is_active ?? true,
    },
  });

  const [headersJson, setHeadersJson] = React.useState(() => stringifyJson(tool?.headers ?? {}, "{}"));
  const [authConfigJson, setAuthConfigJson] = React.useState(() => stringifyJson(tool?.auth_config ?? {}, "{}"));
  const [inputSchemaJson, setInputSchemaJson] = React.useState(() =>
    stringifyJson(tool?.input_schema ?? { type: "object", properties: {} }, "{\\n  \\\"type\\\": \\\"object\\\",\\n  \\\"properties\\\": {}\\n}"),
  );
  const [outputSchemaJson, setOutputSchemaJson] = React.useState(() => (tool?.output_schema ? stringifyJson(tool.output_schema, "{}") : ""));

  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [updateHeaders, setUpdateHeaders] = React.useState(!tool);
  const [updateAuthConfig, setUpdateAuthConfig] = React.useState(!tool);

  React.useEffect(() => {
    form.reset({
      tool_name: tool?.tool_name ?? "",
      description: tool?.description ?? "",
      endpoint: tool?.endpoint ?? "",
      method: (tool?.method as FormValues["method"]) ?? "POST",
      auth_type: tool?.auth_type ?? "none",
      timeout_ms: tool?.timeout_ms ?? 10000,
      retry_count: tool?.retry_count ?? 1,
      is_active: tool?.is_active ?? true,
    });
    setUpdateHeaders(!tool);
    setUpdateAuthConfig(!tool);
    setHeadersJson("{}");
    setAuthConfigJson("{}");
    setInputSchemaJson(
      stringifyJson(tool?.input_schema ?? { type: "object", properties: {} }, "{\\n  \\\"type\\\": \\\"object\\\",\\n  \\\"properties\\\": {}\\n}"),
    );
    setOutputSchemaJson(tool?.output_schema ? stringifyJson(tool.output_schema, "{}") : "");
    setErrors({});
  }, [form, tool]);

  const onSubmit = React.useCallback(
    async (values: FormValues) => {
      const nextErrors: Record<string, string> = {};
      const shouldSendHeaders = !tool || updateHeaders;
      const shouldSendAuth = !tool || updateAuthConfig;

      const headersParsed = shouldSendHeaders ? parseJson(headersJson, "Headers") : { value: undefined };
      if (headersParsed.error) nextErrors.headers = headersParsed.error;
      const authParsed = shouldSendAuth ? parseJson(authConfigJson, "Auth config") : { value: undefined };
      if (authParsed.error) nextErrors.auth_config = authParsed.error;
      const inputParsed = parseJson(inputSchemaJson, "Input schema");
      if (inputParsed.error) nextErrors.input_schema = inputParsed.error;
      const outputParsed = outputSchemaJson.trim() ? parseJson(outputSchemaJson, "Output schema") : { value: undefined };
      if (outputParsed.error) nextErrors.output_schema = outputParsed.error;

      if (Object.keys(nextErrors).length) {
        setErrors(nextErrors);
        return;
      }

      const payload: CreateToolInput = {
        tool_name: values.tool_name.trim(),
        description: values.description.trim() ? values.description.trim() : undefined,
        endpoint: values.endpoint.trim(),
        method: values.method,
        ...(shouldSendHeaders ? { headers: headersParsed.value ?? {} } : {}),
        auth_type: values.auth_type.trim() && values.auth_type.trim() !== "none" ? values.auth_type.trim() : undefined,
        ...(shouldSendAuth ? { auth_config: authParsed.value ?? {} } : {}),
        input_schema: inputParsed.value ?? {},
        output_schema: outputParsed.value,
        timeout_ms: values.timeout_ms,
        retry_count: values.retry_count,
        is_active: values.is_active,
      };

      if (tool) {
        await updateTool(companyId, centurionId, tool.id, payload);
      } else {
        await createTool(companyId, centurionId, payload);
      }

      onSaved();
      onOpenChange(false);
    },
    [authConfigJson, centurionId, companyId, headersJson, inputSchemaJson, onOpenChange, onSaved, outputSchemaJson, tool, updateAuthConfig, updateHeaders],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{tool ? `Editar tool: ${tool.tool_name}` : "Nova tool"}</DialogTitle>
          <DialogDescription>Define uma integração HTTP com schema de entrada (JSON Schema).</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tool_name">Nome</Label>
              <Input id="tool_name" {...form.register("tool_name", { required: true, minLength: 3 })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endpoint">Endpoint</Label>
              <Input id="endpoint" placeholder="https://api.exemplo.com/v1/endpoint" {...form.register("endpoint", { required: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="method">Método</Label>
              <select
                id="method"
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                {...form.register("method", { required: true })}
              >
                {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input id="description" placeholder="Opcional" {...form.register("description")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="auth_type">Auth type</Label>
              <Input id="auth_type" placeholder="none|bearer|api_key|basic" {...form.register("auth_type")} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="timeout_ms">Timeout (ms)</Label>
              <Input id="timeout_ms" type="number" {...form.register("timeout_ms", { valueAsNumber: true, min: 100, max: 60000 })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="retry_count">Retries</Label>
              <Input id="retry_count" type="number" {...form.register("retry_count", { valueAsNumber: true, min: 0, max: 10 })} />
            </div>
            <div className="flex items-end gap-2">
              <input id="is_active" type="checkbox" className="h-4 w-4" {...form.register("is_active")} />
              <Label htmlFor="is_active">Ativa</Label>
            </div>
          </div>

          <SchemaEditor
            label="Headers (JSON)"
            value={headersJson}
            onChange={(v) => setHeadersJson(v)}
            error={errors.headers}
            rows={6}
            helperText={
              tool
                ? `Segredos não são exibidos. Atual: ${tool.has_headers ? "configurado" : "—"}`
                : 'Ex: { "x-api-key": "..." }'
            }
            disabled={!!tool && !updateHeaders}
          />

          {tool ? (
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" className="h-4 w-4" checked={updateHeaders} onChange={(e) => setUpdateHeaders(e.target.checked)} />
              Atualizar headers (requer re-informar valores)
            </label>
          ) : null}

          <SchemaEditor
            label="Auth config (JSON)"
            value={authConfigJson}
            onChange={(v) => setAuthConfigJson(v)}
            error={errors.auth_config}
            rows={6}
            helperText={
              tool
                ? `Segredos não são exibidos. Atual: ${tool.has_auth_secrets ? "configurado" : "—"}`
                : 'Ex (bearer): { "token": "..." } | Ex (api_key): { "header_name": "x-api-key", "key": "..." }'
            }
            disabled={!!tool && !updateAuthConfig}
          />

          {tool ? (
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" className="h-4 w-4" checked={updateAuthConfig} onChange={(e) => setUpdateAuthConfig(e.target.checked)} />
              Atualizar auth config (requer re-informar valores)
            </label>
          ) : null}

          <SchemaEditor
            label="Input schema (JSON Schema)"
            value={inputSchemaJson}
            onChange={(v) => setInputSchemaJson(v)}
            error={errors.input_schema}
            helperText='Ex: { "type": "object", "properties": { "lead_id": { "type": "string" } }, "required": ["lead_id"] }'
          />

          <SchemaEditor
            label="Output schema (opcional)"
            value={outputSchemaJson}
            onChange={(v) => setOutputSchemaJson(v)}
            error={errors.output_schema}
            rows={8}
          />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
