"use client";

import * as React from "react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ContractStatus } from "@/modules/contratos/components/contract-status";
import { getDealTimeline } from "@/modules/deals/services/deals.service";

export function DealDetails({
  open,
  onOpenChange,
  companyId,
  dealId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  dealId: string | null;
}) {
  const [data, setData] = React.useState<{
    deal: Record<string, unknown>;
    deal_index_id: string | null;
    lead_id: string | null;
    messages: Array<{ id: string; direction: string; content_type: string; content: string | null; created_at: string }>;
    contracts: Array<{ id: string; status: string; value: number | null; signed_at: string | null; contract_url: string | null; created_at: string }>;
  } | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open || !dealId) return;
    setLoading(true);
    setError(null);
    setData(null);
    getDealTimeline(companyId, dealId)
      .then((d) => setData(d))
      .catch((err) => setError(err instanceof Error ? err.message : "Falha ao carregar deal"))
      .finally(() => setLoading(false));
  }, [companyId, dealId, open]);

  const deal = data?.deal ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Detalhes do Deal</DialogTitle>
          <DialogDescription>ID: {dealId ?? "—"}</DialogDescription>
        </DialogHeader>
        {loading ? <p className="text-sm text-muted-foreground">Carregando...</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {data ? (
          <div className="space-y-4">
            <div className="rounded-md border bg-muted/30 p-3 text-xs">
              <div className="grid gap-1 md:grid-cols-2">
                <div>
                  <span className="text-muted-foreground">Nome: </span>
                  <span className="font-medium">{String((deal as any)?.deal_full_name ?? "—")}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Status: </span>
                  <span className="font-medium">{String((deal as any)?.deal_status ?? "—")}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Telefone: </span>
                  <span className="font-medium">{String((deal as any)?.deal_phone ?? "—")}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Email: </span>
                  <span className="font-medium">{String((deal as any)?.deal_email ?? "—")}</span>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="text-sm font-medium">Contratos</div>
              {data.contracts.length ? (
                <div className="space-y-2">
                  {data.contracts.map((c) => (
                    <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono">{c.id}</span>
                        <ContractStatus status={c.status} />
                        <span className="text-muted-foreground">valor:</span>
                        <span>{c.value ?? "—"}</span>
                        <span className="text-muted-foreground">criado:</span>
                        <span>{new Date(c.created_at).toLocaleString()}</span>
                      </div>
                      {c.contract_url ? (
                        <a className="underline" href={c.contract_url} target="_blank" rel="noreferrer">
                          abrir
                        </a>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Nenhum contrato ainda.</p>
              )}
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="text-sm font-medium">Timeline (mensagens)</div>
              <div className="max-h-[40vh] overflow-auto rounded-md border p-2">
                {data.messages.length ? (
                  <div className="space-y-2">
                    {data.messages.map((m) => (
                      <div key={m.id} className="flex gap-3 text-xs">
                        <div className="w-20 shrink-0 text-muted-foreground">{new Date(m.created_at).toLocaleString()}</div>
                        <div className="w-16 shrink-0">
                          <span
                            className={
                              m.direction === "inbound"
                                ? "rounded bg-emerald-500/15 px-2 py-0.5 text-emerald-700"
                                : "rounded bg-blue-500/15 px-2 py-0.5 text-blue-700"
                            }
                          >
                            {m.direction}
                          </span>
                        </div>
                        <div className="flex-1 whitespace-pre-wrap">{m.content ?? `(${m.content_type})`}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Sem mensagens ainda.</p>
                )}
              </div>
            </div>

            <Separator />

            <details>
              <summary className="cursor-pointer text-sm text-muted-foreground">JSON completo</summary>
              <pre className="mt-2 max-h-[50vh] overflow-auto rounded-md bg-muted/30 p-3 text-xs">{JSON.stringify(data, null, 2)}</pre>
            </details>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
