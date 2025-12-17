import { z } from "zod";

import { buildEventSchema, type EventEnvelope } from "./base";

export const MessageMediaSchema = z
  .object({
    type: z.enum(["image", "audio", "document"]),
    url: z.string().url(),
    mime_type: z.string().min(1),
    sha256: z.string().min(10).optional(),
  })
  .nullable()
  .optional();

export const MessageReceivedPayloadSchema = z.object({
  instance_id: z.string().min(1),
  lead_external_id: z.string().min(1),
  from: z.string().min(3),
  body: z.string().optional().nullable(),
  media: MessageMediaSchema,
  raw: z.record(z.any()).optional().default({}),
});

export type MessageReceivedPayload = z.infer<typeof MessageReceivedPayloadSchema>;

export const MessageReceivedEventSchema = buildEventSchema(
  "message.received",
  MessageReceivedPayloadSchema,
);

export type MessageReceivedEvent = EventEnvelope<
  "message.received",
  MessageReceivedPayload
>;
