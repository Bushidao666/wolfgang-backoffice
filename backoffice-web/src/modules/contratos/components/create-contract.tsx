"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { listDeals } from "@/modules/deals/services/deals.service";
import { createContract, listContractTemplates } from "@/modules/contratos/services/contracts.service";

function parseJsonObject(raw: string): Record<string, unknown> {
  if (!raw.trim()) return {};
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("contract_data deve ser um objeto JSON");
  }
  return parsed as Record<string, unknown>;
}

export function CreateContract({ companyId }: { companyId: string }) {
  const queryClient = useQueryClient();

  const templatesQuery = useQuery({
    queryKey: ["contractTemplates", companyId],
    queryFn: () => listContractTemplates(companyId),
    enabled: !!companyId,
  });

  const dealsQuery = useQuery({
    queryKey: ["deals", companyId, "forContracts"],
    queryFn: () => listDeals(companyId),
    enabled: !!companyId,
  });

  const templates = templatesQuery.data ?? [];
  const deals = dealsQuery.data ?? [];

  const [templateId, setTemplateId] = React.useState<string>("");
  const [dealId, setDealId] = React.useState<string>("");
  const [value, setValue] = React.useState<string>("");
  const [currency, setCurrency] = React.useState<string>("BRL");
  const [contractData, setContractData] = React.useState<string>("{}");

  const [signerName, setSignerName] = React.useState<string>("");
  const [signerEmail, setSignerEmail] = React.useState<string>("");
  const [signerPhone, setSignerPhone] = React.useState<string>("");

  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successUrl, setSuccessUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!templateId && templates.length) setTemplateId(String(templates[0].id));
  }, [templateId, templates]);

  React.useEffect(() => {
    if (!dealId && deals.length) setDealId(String(deals[0].id));
  }, [dealId, deals]);

  const onCreate = React.useCallback(async () => {
    setSaving(true);
    setError(null);
    setSuccessUrl(null);

    try {
      const parsedContractData = parseJsonObject(contractData);
      const numericValue = value.trim() ? Number(value) : undefined;
      if (numericValue !== undefined && (!Number.isFinite(numericValue) || numericValue < 0)) {
        throw new Error("Valor inválido");
      }

      const created = await createContract(companyId, {
        template_id: templateId,
        deal_id: dealId,
        value: numericValue,
        currency: currency.trim() ? currency.trim().toUpperCase() : undefined,
        signer_name: signerName.trim() ? signerName.trim() : undefined,
        signer_email: signerEmail.trim() ? signerEmail.trim() : undefined,
        signer_phone: signerPhone.trim() ? signerPhone.trim() : undefined,
        contract_data: parsedContractData,
      });

      await queryClient.invalidateQueries({ queryKey: ["contracts", companyId] });
      setSuccessUrl(created.contract_url ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao gerar contrato");
    } finally {
      setSaving(false);
    }
  }, [companyId, contractData, currency, dealId, queryClient, signerEmail, signerName, signerPhone, templateId, value]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerar contrato</CardTitle>
        <CardDescription>Cria e envia para assinatura via Autentique (gera registro em `core.contracts`).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="template">Template</Label>
            <select
              id="template"
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              disabled={templatesQuery.isLoading || templatesQuery.isError || !templates.length}
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.company_id ? "empresa" : "global"})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deal">Deal</Label>
            <select
              id="deal"
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={dealId}
              onChange={(e) => setDealId(e.target.value)}
              disabled={dealsQuery.isLoading || dealsQuery.isError || !deals.length}
            >
              {deals.map((d) => (
                <option key={d.id} value={d.id}>
                  {(d.deal_full_name ?? d.deal_phone ?? d.id).toString()} — {d.deal_status ?? "—"}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="value">Valor (opcional)</Label>
            <Input id="value" value={value} onChange={(e) => setValue(e.target.value)} placeholder="15000" inputMode="decimal" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">Moeda</Label>
            <Input id="currency" value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="BRL" />
          </div>
          <div className="flex items-end justify-end">
            <Button onClick={onCreate} disabled={saving || !templateId || !dealId}>
              {saving ? "Enviando..." : "Gerar e enviar"}
            </Button>
          </div>
        </div>

        <Separator />

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="signerName">Nome do signatário (override)</Label>
            <Input id="signerName" value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="(opcional)" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signerEmail">Email do signatário (override)</Label>
            <Input id="signerEmail" value={signerEmail} onChange={(e) => setSignerEmail(e.target.value)} placeholder="(opcional)" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signerPhone">Telefone do signatário (override)</Label>
            <Input id="signerPhone" value={signerPhone} onChange={(e) => setSignerPhone(e.target.value)} placeholder="(opcional)" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="contractData">contract_data (JSON)</Label>
          <textarea
            id="contractData"
            className="min-h-32 w-full rounded-md border bg-background px-3 py-2 font-mono text-xs"
            value={contractData}
            onChange={(e) => setContractData(e.target.value)}
            spellCheck={false}
          />
          <p className="text-xs text-muted-foreground">Use para preencher variáveis do template (ex: {"{"}\"deal_servico\":\"Buffet\"{"}"}).</p>
        </div>

        {templatesQuery.isError ? (
          <p className="text-sm text-destructive">{templatesQuery.error instanceof Error ? templatesQuery.error.message : "Erro ao carregar templates"}</p>
        ) : null}
        {dealsQuery.isError ? (
          <p className="text-sm text-destructive">{dealsQuery.error instanceof Error ? dealsQuery.error.message : "Erro ao carregar deals"}</p>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {successUrl ? (
          <p className="text-sm">
            Link de assinatura:{" "}
            <a className="underline" href={successUrl} target="_blank" rel="noreferrer">
              abrir
            </a>
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

