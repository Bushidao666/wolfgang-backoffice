import { z } from "zod";

import {
  ContractSignedEventSchema,
  LeadCreatedEventSchema,
  LeadQualifiedEventSchema,
} from "@wolfgang/contracts";

export const MarketingEventSchema = z.discriminatedUnion("type", [
  LeadCreatedEventSchema,
  LeadQualifiedEventSchema,
  ContractSignedEventSchema,
]);

export type MarketingEvent = z.infer<typeof MarketingEventSchema>;

