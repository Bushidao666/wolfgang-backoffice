import { randomUUID } from "crypto";

import type { ContractCreatedEvent } from "@wolfgang/contracts";

export function buildContractCreatedEvent(args: {
  company_id: string;
  contract_id: string;
  deal_id: string;
  value?: number | null;
  currency?: string | null;
  correlation_id?: string | null;
  causation_id?: string | null;
}): ContractCreatedEvent {
  return {
    id: randomUUID(),
    type: "contract.created",
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
      value: args.value ?? undefined,
      currency: args.currency ?? undefined,
    },
  };
}

