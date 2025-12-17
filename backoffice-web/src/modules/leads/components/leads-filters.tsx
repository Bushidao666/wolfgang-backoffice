"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type LeadFilters = {
  q?: string;
  status?: string;
  channel?: string;
};

export function LeadsFilters({
  value,
  onChange,
}: {
  value: LeadFilters;
  onChange: (next: LeadFilters) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <div className="space-y-2">
        <Label htmlFor="q">Busca</Label>
        <Input
          id="q"
          value={value.q ?? ""}
          onChange={(e) => onChange({ ...value, q: e.target.value })}
          placeholder="nome, telefone, email"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Input
          id="status"
          value={value.status ?? ""}
          onChange={(e) => onChange({ ...value, status: e.target.value })}
          placeholder="ex: new, qualified"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="channel">Canal</Label>
        <select
          id="channel"
          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          value={value.channel ?? ""}
          onChange={(e) => onChange({ ...value, channel: e.target.value || undefined })}
        >
          <option value="">Todos</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="instagram">Instagram</option>
          <option value="telegram">Telegram</option>
        </select>
      </div>
    </div>
  );
}

