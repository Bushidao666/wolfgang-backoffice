import { z } from "zod";

export const QualificationDtoSchema = z.object({
  lead_id: z.string().uuid(),
  company_id: z.string().uuid(),
  score: z.number().min(0).max(1),
  criteria: z.array(z.string().min(1)).default([]),
  summary: z.string().nullable().optional(),
  qualified_at: z.string().datetime(),
});

export type QualificationDto = z.infer<typeof QualificationDtoSchema>;
