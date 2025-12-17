"use client";

import * as React from "react";
import type { UseFormRegister } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type TelegramInstanceFormValues = {
  telegram_bot_token?: string;
};

export function TelegramConfigFields({
  register,
  required,
}: {
  register: UseFormRegister<any>;
  required: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="telegram_bot_token">Telegram Bot Token</Label>
      <Input
        id="telegram_bot_token"
        placeholder="123456:ABC..."
        {...register("telegram_bot_token", {
          validate: (value: unknown) => {
            if (!required) return true;
            if (typeof value === "string" && value.trim().length > 0) return true;
            return "required";
          },
        })}
      />
      <p className="text-xs text-muted-foreground">
        Token do bot usado para enviar/receber mensagens via webhook.
      </p>
    </div>
  );
}
