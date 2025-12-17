import { z } from "zod";

export const EventIdSchema = z.string().min(8);
export const CompanyIdSchema = z.string().min(3);
export const CorrelationIdSchema = z.string().min(8);

export const EventEnvelopeBaseSchema = z.object({
  id: EventIdSchema,
  type: z.string().min(1),
  version: z.number().int().positive(),
  occurred_at: z.string().datetime(),
  company_id: CompanyIdSchema,
  source: z.string().min(1),
  correlation_id: CorrelationIdSchema,
  causation_id: z.string().min(1).nullable(),
});

export type EventEnvelopeBase = z.infer<typeof EventEnvelopeBaseSchema>;

export function buildEventSchema<TPayload extends z.ZodTypeAny, TType extends string>(
  type: TType,
  payloadSchema: TPayload,
) {
  return EventEnvelopeBaseSchema.extend({
    type: z.literal(type),
    payload: payloadSchema,
  });
}

export type EventEnvelope<TType extends string, TPayload> = EventEnvelopeBase & {
  type: TType;
  payload: TPayload;
};
