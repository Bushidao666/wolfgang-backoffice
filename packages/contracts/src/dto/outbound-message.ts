import { z } from "zod";

export const OutboundMessageItemSchema = z.object({
  type: z.enum(["text"]),
  text: z.string().min(1),
});

export const OutboundMessagePayloadSchema = z.object({
  instance_id: z.string().min(1),
  company_id: z.string().uuid(),
  channel: z.enum(["whatsapp", "instagram", "telegram"]),
  to_number: z.string().min(3),
  messages: z.array(OutboundMessageItemSchema).min(1),
  metadata: z.record(z.any()).optional().default({}),
});

export type OutboundMessagePayload = z.infer<typeof OutboundMessagePayloadSchema>;
