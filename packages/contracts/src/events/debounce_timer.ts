import { z } from "zod";

import { buildEventSchema, type EventEnvelope } from "./base";

export const DebounceTimerPayloadSchema = z.object({
  conversation_id: z.string().min(1),
  lead_id: z.string().min(1),
  instance_id: z.string().min(1).nullable(),
  debounce_until: z.string().datetime(),
  pending_count: z.number().int().nonnegative(),
});

export type DebounceTimerPayload = z.infer<typeof DebounceTimerPayloadSchema>;

export const DebounceTimerEventSchema = buildEventSchema(
  "debounce.timer",
  DebounceTimerPayloadSchema,
);

export type DebounceTimerEvent = EventEnvelope<"debounce.timer", DebounceTimerPayload>;

