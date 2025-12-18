"use client";

import * as React from "react";

import { Label } from "@/components/ui/label";

export function SchemaEditor({
  label,
  value,
  onChange,
  helperText,
  error,
  rows = 10,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helperText?: string;
  error?: string;
  rows?: number;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <textarea
        className={`min-h-24 w-full rounded-md border bg-background px-3 py-2 font-mono text-xs leading-relaxed ${disabled ? "opacity-70" : ""}`}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        disabled={disabled}
      />
      {helperText ? <p className="text-xs text-muted-foreground">{helperText}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
