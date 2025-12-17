import { z } from "zod";

export const InboundMessagePayloadSchema = z.object({
  instance_id: z.string().min(1),
  company_id: z.string().uuid(),
  channel: z.enum(["whatsapp", "instagram", "telegram"]),
  from_number: z.string().min(3),
  message_type: z.enum(["text", "audio", "image", "document"]),
  content: z.string().nullable().optional(),
  media_url: z.string().url().nullable().optional(),
  timestamp: z.string().datetime(),
  metadata: z.record(z.any()).optional().default({}),
});

export type InboundMessagePayload = z.infer<typeof InboundMessagePayloadSchema>;
