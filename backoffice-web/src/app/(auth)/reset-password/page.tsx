"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { resetPassword } from "@/lib/api/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z
  .object({
    password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
    confirm: z.string().min(6),
  })
  .refine((v) => v.password === v.confirm, { message: "As senhas não conferem", path: ["confirm"] });

type FormValues = z.infer<typeof schema>;

function getAccessTokenFromUrl(): string | null {
  if (typeof window === "undefined") return null;

  const search = new URLSearchParams(window.location.search);
  const fromQuery = search.get("access_token");
  if (fromQuery) return fromQuery;

  const hash = window.location.hash?.replace(/^#/, "");
  if (!hash) return null;

  const hashParams = new URLSearchParams(hash);
  return hashParams.get("access_token");
}

export default function ResetPasswordPage() {
  const [accessToken, setAccessToken] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setAccessToken(getAccessTokenFromUrl());
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirm: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    if (!accessToken) {
      setError("Token de redefinição ausente ou inválido.");
      return;
    }
    try {
      await resetPassword(accessToken, values.password);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao redefinir senha");
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Redefinir senha</CardTitle>
        <CardDescription>Defina uma nova senha para sua conta.</CardDescription>
      </CardHeader>
      <CardContent>
        {done ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Senha atualizada com sucesso.</p>
            <Button asChild className="w-full">
              <a href="/login">Ir para login</a>
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nova senha</Label>
              <Input id="password" type="password" autoComplete="new-password" {...form.register("password")} />
              {form.formState.errors.password ? (
                <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm">Confirmar senha</Label>
              <Input id="confirm" type="password" autoComplete="new-password" {...form.register("confirm")} />
              {form.formState.errors.confirm ? (
                <p className="text-sm text-destructive">{form.formState.errors.confirm.message}</p>
              ) : null}
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Salvando..." : "Atualizar senha"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

