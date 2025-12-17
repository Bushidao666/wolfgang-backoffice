"use client";

import * as React from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InstagramConfigFields } from "@/modules/instancias/channels/instagram-config";
import { TelegramConfigFields } from "@/modules/instancias/channels/telegram-config";
import { createInstance } from "@/modules/instancias/services/instances.service";

type FormValues = {
  instance_name: string;
  channel_type: "whatsapp" | "instagram" | "telegram";
  telegram_bot_token?: string;
  instagram_account_id?: string;
};

export function CreateInstanceModal({
  open,
  onOpenChange,
  companyId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onCreated: () => void;
}) {
  const { register, handleSubmit, formState, reset, watch } = useForm<FormValues>({
    defaultValues: { instance_name: "", channel_type: "whatsapp", telegram_bot_token: "", instagram_account_id: "" },
    shouldUnregister: true,
  });

  const onSubmit = React.useCallback(
    async (values: FormValues) => {
      await createInstance({
        company_id: companyId,
        instance_name: values.instance_name.trim(),
        channel_type: values.channel_type,
        telegram_bot_token: values.channel_type === "telegram" ? values.telegram_bot_token?.trim() : undefined,
        instagram_account_id: values.channel_type === "instagram" ? values.instagram_account_id?.trim() : undefined,
      });
      onCreated();
      reset({ instance_name: "", channel_type: "whatsapp", telegram_bot_token: "", instagram_account_id: "" });
      onOpenChange(false);
    },
    [companyId, onCreated, onOpenChange, reset],
  );

  const channelType = watch("channel_type");

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset({ instance_name: "", channel_type: "whatsapp", telegram_bot_token: "", instagram_account_id: "" });
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova instância</DialogTitle>
          <DialogDescription>Cria uma instância e registra no CORE (WhatsApp/Instagram/Telegram).</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="channel_type">Canal</Label>
            <select
              id="channel_type"
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              {...register("channel_type", { required: true })}
            >
              <option value="whatsapp">WhatsApp</option>
              <option value="instagram">Instagram</option>
              <option value="telegram">Telegram</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="instance_name">Nome da instância</Label>
            <Input
              id="instance_name"
              placeholder="ex: empresa_demo_wa_1"
              {...register("instance_name", { required: true, minLength: 3 })}
            />
            <p className="text-xs text-muted-foreground">Use apenas letras, números, _ ou - (3-64 chars).</p>
          </div>

          {formState.errors.channel_type ? (
            <p className="text-sm text-destructive">Selecione um canal.</p>
          ) : null}

          {formState.errors.telegram_bot_token ? (
            <p className="text-sm text-destructive">Informe um token válido do Telegram.</p>
          ) : null}

          {formState.errors.instagram_account_id ? (
            <p className="text-sm text-destructive">Informe um Instagram Account ID válido.</p>
          ) : null}

          {channelType === "telegram" ? <TelegramConfigFields register={register} required /> : null}
          {channelType === "instagram" ? <InstagramConfigFields register={register} required /> : null}

          {formState.errors.instance_name ? (
            <p className="text-sm text-destructive">Informe um nome válido para a instância.</p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={formState.isSubmitting}>
              {formState.isSubmitting ? "Criando..." : "Criar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
