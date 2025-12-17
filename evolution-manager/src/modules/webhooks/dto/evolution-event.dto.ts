import { z } from "zod";

export const EvolutionWebhookSchema = z.object({
  event: z.string().min(1),
  instance: z.string().min(1),
  data: z.unknown().optional(),
});

export type EvolutionWebhook = z.infer<typeof EvolutionWebhookSchema>;

