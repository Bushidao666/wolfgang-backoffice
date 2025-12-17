"use client";

import * as React from "react";
import type { UseFormRegister } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type InstagramInstanceFormValues = {
  instagram_account_id?: string;
};

export function InstagramConfigFields({
  register,
  required,
}: {
  register: UseFormRegister<any>;
  required: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="instagram_account_id">Instagram Account ID</Label>
      <Input
        id="instagram_account_id"
        placeholder="ex: 1784140..."
        {...register("instagram_account_id", {
          validate: (value: unknown) => {
            if (!required) return true;
            if (typeof value === "string" && value.trim().length > 0) return true;
            return "required";
          },
        })}
      />
      <p className="text-xs text-muted-foreground">
        Necessário para instâncias Instagram (quando aplicável ao provider).
      </p>
    </div>
  );
}
