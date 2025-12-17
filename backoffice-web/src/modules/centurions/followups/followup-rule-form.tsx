"use client";

import * as React from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createFollowupRule,
  type CreateFollowupRuleInput,
  type FollowupRuleRow,
  updateFollowupRule,
} from "@/modules/centurions/followups/services/followups.service";

type FormValues = {
  name: string;
  inactivity_hours: number;
  template: string;
  max_attempts: number;
  is_active: boolean;
};

export function FollowupRuleForm({
  open,
  onOpenChange,
  companyId,
  centurionId,
  rule,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  centurionId: string;
  rule?: FollowupRuleRow;
  onSaved: () => void;
}) {
  const form = useForm<FormValues>({
    defaultValues: {
      name: rule?.name ?? "",
      inactivity_hours: rule?.inactivity_hours ?? 24,
      template: rule?.template ?? "",
      max_attempts: rule?.max_attempts ?? 1,
      is_active: rule?.is_active ?? true,
    },
  });

  React.useEffect(() => {
    form.reset({
      name: rule?.name ?? "",
      inactivity_hours: rule?.inactivity_hours ?? 24,
      template: rule?.template ?? "",
      max_attempts: rule?.max_attempts ?? 1,
      is_active: rule?.is_active ?? true,
    });
  }, [form, rule]);

  const onSubmit = React.useCallback(
    async (values: FormValues) => {
      const payload: CreateFollowupRuleInput = {
        name: values.name.trim(),
        inactivity_hours: values.inactivity_hours,
        template: values.template.trim(),
        max_attempts: values.max_attempts,
        is_active: values.is_active,
      };

      if (rule) {
        await updateFollowupRule(companyId, centurionId, rule.id, payload);
      } else {
        await createFollowupRule(companyId, centurionId, payload);
      }

      onSaved();
      onOpenChange(false);
    },
    [centurionId, companyId, onOpenChange, onSaved, rule],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{rule ? `Editar regra: ${rule.name}` : "Nova regra de follow-up"}</DialogTitle>
          <DialogDescription>Dispara após inatividade do lead e envia uma mensagem proativa.</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" placeholder="no_response_24h" {...form.register("name", { required: true, minLength: 3 })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inactivity_hours">Inatividade (h)</Label>
              <Input id="inactivity_hours" type="number" {...form.register("inactivity_hours", { valueAsNumber: true, min: 1, max: 720 })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_attempts">Máx. tentativas</Label>
              <Input id="max_attempts" type="number" {...form.register("max_attempts", { valueAsNumber: true, min: 1, max: 10 })} />
            </div>
            <div className="flex items-end gap-2">
              <input id="is_active" type="checkbox" className="h-4 w-4" {...form.register("is_active")} />
              <Label htmlFor="is_active">Ativa</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="template">Template</Label>
            <textarea
              id="template"
              className="min-h-28 w-full rounded-md border bg-background px-3 py-2 text-sm"
              {...form.register("template", { required: true, minLength: 3 })}
            />
            <p className="text-xs text-muted-foreground">O Agent Runtime pode refinar o template via LLM, quando disponível.</p>
          </div>

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

