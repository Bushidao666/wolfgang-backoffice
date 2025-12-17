import { z } from "zod";

import { buildEventSchema, type EventEnvelope } from "./base";

export const UtmSchema = z
  .object({
    source: z.string().optional(),
    medium: z.string().optional(),
    campaign: z.string().optional(),
    content: z.string().optional(),
    term: z.string().optional(),
  })
  .optional();

export const LeadCreatedPayloadSchema = z.object({
  lead_id: z.string().min(1),
  company_id: z.string().min(1),
  channel: z.enum(["whatsapp", "instagram", "telegram"]),
  source: z.string().optional().default("unknown"),
  utm: UtmSchema,
});

export type LeadCreatedPayload = z.infer<typeof LeadCreatedPayloadSchema>;

export const LeadCreatedEventSchema = buildEventSchema(
  "lead.created",
  LeadCreatedPayloadSchema,
);

export type LeadCreatedEvent = EventEnvelope<"lead.created", LeadCreatedPayload>;
