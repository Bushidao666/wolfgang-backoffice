import { z } from "zod";

export const LeadStatusSchema = z.enum([
  "new",
  "in_progress",
  "qualified",
  "disqualified",
  "handoff",
]);

export const LeadUtmSchema = z.object({
  utm_source: z.string().nullable().optional(),
  utm_medium: z.string().nullable().optional(),
  utm_campaign: z.string().nullable().optional(),
  utm_content: z.string().nullable().optional(),
  utm_term: z.string().nullable().optional(),
});

export const LeadDtoSchema = z.object({
  id: z.string().uuid(),
  company_id: z.string().uuid(),
  phone: z.string().min(3),
  name: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  status: LeadStatusSchema,
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().optional(),
  utm: LeadUtmSchema.optional(),
});

export type LeadDto = z.infer<typeof LeadDtoSchema>;
