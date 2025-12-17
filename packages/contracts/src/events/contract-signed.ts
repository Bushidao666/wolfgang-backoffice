import { z } from "zod";

import { buildEventSchema, type EventEnvelope } from "./base";

export const ContractSignedPayloadSchema = z.object({
  contract_id: z.string().min(1),
  deal_id: z.string().min(1),
  company_id: z.string().min(1),
  signed_at: z.string().datetime(),
  value: z.number().nonnegative().optional(),
  currency: z.string().min(3).max(3).optional(),
});

export type ContractSignedPayload = z.infer<typeof ContractSignedPayloadSchema>;

export const ContractSignedEventSchema = buildEventSchema(
  "contract.signed",
  ContractSignedPayloadSchema,
);

export type ContractSignedEvent = EventEnvelope<
  "contract.signed",
  ContractSignedPayload
>;
