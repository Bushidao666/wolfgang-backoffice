"use client";

import * as React from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export function PromptEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const chars = value?.length ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>System prompt</CardTitle>
        <CardDescription>Prompt principal do Centurion (mensagem de sistema).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label>Prompt</Label>
          <textarea
            className="min-h-40 w-full rounded-md border bg-background px-3 py-2 text-sm leading-relaxed"
            rows={10}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Você é um SDR educado e objetivo..."
          />
          <p className="text-xs text-muted-foreground">{chars} caracteres</p>
        </div>

        <div className="space-y-2">
          <Label>Preview</Label>
          <pre className="max-h-64 overflow-auto rounded-md border bg-muted/30 p-3 text-xs leading-relaxed">{value || "—"}</pre>
        </div>
      </CardContent>
    </Card>
  );
}

