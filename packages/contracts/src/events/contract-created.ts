import { z } from "zod";

import { buildEventSchema, type EventEnvelope } from "./base";

export const ContractCreatedPayloadSchema = z.object({
  contract_id: z.string().min(1),
  deal_id: z.string().min(1),
  company_id: z.string().min(1),
  value: z.number().nonnegative().optional(),
  currency: z.string().min(3).max(3).optional(),
});

export type ContractCreatedPayload = z.infer<typeof ContractCreatedPayloadSchema>;

export const ContractCreatedEventSchema = buildEventSchema(
  "contract.created",
  ContractCreatedPayloadSchema,
);

export type ContractCreatedEvent = EventEnvelope<
  "contract.created",
  ContractCreatedPayload
>;

