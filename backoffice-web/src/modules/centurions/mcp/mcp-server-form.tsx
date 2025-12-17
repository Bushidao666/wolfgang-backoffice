"use client";

import * as React from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SchemaEditor } from "@/modules/centurions/tools/schema-editor";
import { createMcpServer, type CreateMcpServerInput } from "@/modules/centurions/mcp/services/mcp.service";

type FormValues = {
  name: string;
  server_url: string;
  auth_type: string;
  is_active: boolean;
};

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

export function McpServerForm({
  open,
  onOpenChange,
  companyId,
  centurionId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  centurionId: string;
  onSaved: () => void;
}) {
  const form = useForm<FormValues>({
    defaultValues: { name: "", server_url: "", auth_type: "none", is_active: true },
  });
  const [authConfigJson, setAuthConfigJson] = React.useState("{}");
  const [jsonError, setJsonError] = React.useState<string | undefined>(undefined);

  const onSubmit = React.useCallback(
    async (values: FormValues) => {
      const parsed = parseJson(authConfigJson, "Auth config");
      if (parsed.error) {
        setJsonError(parsed.error);
        return;
      }
      setJsonError(undefined);

      const payload: CreateMcpServerInput = {
        name: values.name.trim(),
        server_url: values.server_url.trim(),
        auth_type: values.auth_type.trim() ? values.auth_type.trim() : undefined,
        auth_config: parsed.value ?? {},
        is_active: values.is_active,
      };

      await createMcpServer(companyId, centurionId, payload);
      onSaved();
      onOpenChange(false);
      form.reset({ name: "", server_url: "", auth_type: "none", is_active: true });
      setAuthConfigJson("{}");
    },
    [authConfigJson, centurionId, companyId, form, onOpenChange, onSaved],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo MCP server</DialogTitle>
          <DialogDescription>Registra um MCP server e permite discovery/execução de tools via protocolo.</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" placeholder="crm-tools" {...form.register("name", { required: true, minLength: 3 })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="server_url">Server URL</Label>
              <Input id="server_url" placeholder="http://localhost:8787" {...form.register("server_url", { required: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="auth_type">Auth type</Label>
              <Input id="auth_type" placeholder="none|bearer|api_key|basic" {...form.register("auth_type")} />
            </div>
            <div className="flex items-end gap-2">
              <input id="is_active" type="checkbox" className="h-4 w-4" {...form.register("is_active")} />
              <Label htmlFor="is_active">Ativo</Label>
            </div>
          </div>

          <SchemaEditor
            label="Auth config (JSON)"
            value={authConfigJson}
            onChange={setAuthConfigJson}
            error={jsonError}
            rows={8}
            helperText='Ex (bearer): { "token": "..." } | Ex (api_key): { "header_name": "x-api-key", "key": "..." }'
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

