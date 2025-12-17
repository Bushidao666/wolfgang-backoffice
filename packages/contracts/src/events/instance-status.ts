import { z } from "zod";

import { buildEventSchema, type EventEnvelope } from "./base";

export const InstanceStatusPayloadSchema = z.object({
  instance_id: z.string().min(1),
  company_id: z.string().min(1),
  channel: z.enum(["whatsapp", "instagram", "telegram"]),
  status: z.enum(["connected", "disconnected", "qr_ready", "error"]),
  details: z.record(z.any()).optional().default({}),
});

export type InstanceStatusPayload = z.infer<typeof InstanceStatusPayloadSchema>;

export const InstanceStatusEventSchema = buildEventSchema(
  "instance.status",
  InstanceStatusPayloadSchema,
);

export type InstanceStatusEvent = EventEnvelope<
  "instance.status",
  InstanceStatusPayload
>;
