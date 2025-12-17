import { z } from "zod";

import { buildEventSchema, type EventEnvelope } from "./base";

export const OutboundMessageSchema = z.object({
  type: z.enum(["text"]),
  text: z.string().min(1),
});

export const MessageSentPayloadSchema = z.object({
  instance_id: z.string().min(1),
  to: z.string().min(3),
  messages: z.array(OutboundMessageSchema).min(1),
  raw: z.record(z.any()).optional().default({}),
});

export type MessageSentPayload = z.infer<typeof MessageSentPayloadSchema>;

export const MessageSentEventSchema = buildEventSchema(
  "message.sent",
  MessageSentPayloadSchema,
);

export type MessageSentEvent = EventEnvelope<"message.sent", MessageSentPayload>;
