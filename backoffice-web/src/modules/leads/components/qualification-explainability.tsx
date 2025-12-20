"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getLeadQualificationEvents, type LeadQualificationEvent } from "@/modules/leads/services/leads.service";

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
}

function formatScore(value: unknown) {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(2);
}

function shortHash(value: string | null | undefined) {
  if (!value) return "—";
  return value.length > 12 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value;
}

function asCriteriaArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v));
}

function prettyJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function QualificationExplainability({ companyId, leadId }: { companyId: string; leadId: string }) {
  const eventsQuery = useQuery({
    queryKey: ["leadQualificationEvents", companyId, leadId],
    queryFn: () => getLeadQualificationEvents(companyId, leadId, { limit: 50, offset: 0 }),
    enabled: !!companyId && !!leadId,
  });

  const events = eventsQuery.data?.events ?? [];
  const total = eventsQuery.data?.total ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Qualificação (Explainability)</CardTitle>
        <CardDescription>Histórico append-only de avaliações (score, critérios e evidências).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {eventsQuery.isLoading ? <p className="text-sm text-muted-foreground">Carregando avaliações...</p> : null}
        {eventsQuery.isError ? (
          <p className="text-sm text-destructive">
            {eventsQuery.error instanceof Error ? eventsQuery.error.message : "Erro ao carregar avaliações"}
          </p>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Total: <span className="font-medium text-foreground">{total}</span>
          </p>
          <Button variant="outline" onClick={() => eventsQuery.refetch()} disabled={eventsQuery.isFetching}>
            {eventsQuery.isFetching ? "Atualizando..." : "Atualizar"}
          </Button>
        </div>

        <Separator />

        {!events.length && !eventsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Nenhuma avaliação registrada ainda.</p>
        ) : (
          <div className="space-y-3">
            {events.map((e: LeadQualificationEvent) => {
              const criteria = asCriteriaArray(e.criteria);
              return (
                <details key={e.id} className="rounded-md border bg-muted/10 p-3">
                  <summary className="cursor-pointer list-none">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-1">
                        <div className="text-sm font-medium">{formatDate(e.created_at)}</div>
                        <div className="text-xs text-muted-foreground">
                          score={formatScore(e.score)} · threshold={formatScore(e.threshold)} · required=
                          {e.required_met ? "ok" : "fail"} · qualified={e.is_qualified ? "yes" : "no"}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">rules: {shortHash(e.rules_hash)}</div>
                    </div>
                    {e.summary ? <div className="mt-2 text-sm text-muted-foreground">{e.summary}</div> : null}
                  </summary>

                  <div className="mt-3 space-y-3">
                    {criteria.length ? (
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Critérios</div>
                        <div className="space-y-2">
                          {criteria.map((c, idx) => (
                            <div key={`${String(c.key ?? "criterion")}:${idx}`} className="rounded-md border bg-background p-3">
                              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                <div className="text-sm font-medium">{String(c.key ?? "—")}</div>
                                <div className="text-xs text-muted-foreground">
                                  type={String(c.type ?? "—")} · weight={formatScore(c.weight)} · required=
                                  {c.required ? "yes" : "no"} · met={c.met ? "yes" : "no"}
                                </div>
                              </div>
                              {c.evidence ? (
                                <pre className="mt-2 overflow-auto rounded-md bg-muted/20 p-2 text-xs">
                                  {prettyJson(c.evidence)}
                                </pre>
                              ) : (
                                <p className="mt-2 text-xs text-muted-foreground">Sem evidência registrada.</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Sem critérios registrados.</p>
                    )}

                    {e.extracted && Object.keys(e.extracted).length ? (
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Dados extraídos</div>
                        <pre className="overflow-auto rounded-md bg-muted/20 p-2 text-xs">{prettyJson(e.extracted)}</pre>
                      </div>
                    ) : null}

                    {e.rules ? (
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Config usada (snapshot)</div>
                        <pre className="overflow-auto rounded-md bg-muted/20 p-2 text-xs">{prettyJson(e.rules)}</pre>
                      </div>
                    ) : null}
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

