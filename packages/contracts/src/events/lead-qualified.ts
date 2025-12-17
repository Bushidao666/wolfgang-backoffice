import { z } from "zod";

import { buildEventSchema, type EventEnvelope } from "./base";

export const LeadQualifiedPayloadSchema = z.object({
  lead_id: z.string().min(1),
  company_id: z.string().min(1),
  score: z.number().min(0).max(1),
  criteria: z.array(z.string().min(1)).default([]),
  summary: z.string().min(1).optional(),
});

export type LeadQualifiedPayload = z.infer<typeof LeadQualifiedPayloadSchema>;

export const LeadQualifiedEventSchema = buildEventSchema(
  "lead.qualified",
  LeadQualifiedPayloadSchema,
);

export type LeadQualifiedEvent = EventEnvelope<
  "lead.qualified",
  LeadQualifiedPayload
>;
