import { randomUUID } from "crypto";

import type { ContractSignedEvent } from "@wolfgang/contracts";

export function buildContractSignedEvent(args: {
  company_id: string;
  contract_id: string;
  deal_id: string;
  signed_at: string;
  value?: number | null;
  currency?: string | null;
  correlation_id?: string | null;
  causation_id?: string | null;
}): ContractSignedEvent {
  return {
    id: randomUUID(),
    type: "contract.signed",
    version: 1,
    occurred_at: new Date().toISOString(),
    company_id: args.company_id,
    source: "autentique-service",
    correlation_id: args.correlation_id ?? args.contract_id,
    causation_id: args.causation_id ?? null,
    payload: {
      contract_id: args.contract_id,
      deal_id: args.deal_id,
      company_id: args.company_id,
      signed_at: args.signed_at,
      value: args.value ?? undefined,
      currency: args.currency ?? undefined,
    },
  };
}

