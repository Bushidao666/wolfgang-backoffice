import { z } from "zod";

import { buildEventSchema, type EventEnvelope } from "./base";

export const OutboundTextMessageSchema = z.object({
  type: z.literal("text"),
  text: z.string().min(1),
});

export const OutboundMediaMessageSchema = z
  .object({
    type: z.enum(["image", "video", "audio", "document"]),
    asset_id: z.string().uuid().optional(),
    url: z.string().url().optional(),
    mime_type: z.string().min(1).optional(),
    caption: z.string().optional(),
    filename: z.string().optional(),
  })
  .refine((m) => m.asset_id || m.url, { message: "asset_id or url is required" })
  .refine((m) => m.asset_id || m.mime_type, { message: "mime_type is required when using url" });

export const OutboundMessageSchema = z.discriminatedUnion("type", [
  OutboundTextMessageSchema,
  OutboundMediaMessageSchema,
]);

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
