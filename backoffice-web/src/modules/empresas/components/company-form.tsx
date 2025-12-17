"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Company } from "@/modules/empresas/services/companies.service";

const schema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  document: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function CompanyForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: Company | null;
  onSubmit: (values: FormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: initial?.name ?? "", document: initial?.document ?? "" },
  });

  const submit = form.handleSubmit(async (values) => {
    await onSubmit({
      name: values.name.trim(),
      document: values.document?.trim() || undefined,
    });
  });

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" placeholder="Empresa Alpha" {...form.register("name")} />
        {form.formState.errors.name ? <p className="text-sm text-destructive">{form.formState.errors.name.message}</p> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="document">Documento (opcional)</Label>
        <Input id="document" placeholder="CNPJ/CPF" {...form.register("document")} />
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}

