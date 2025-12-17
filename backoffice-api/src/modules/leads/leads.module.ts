import { Module } from "@nestjs/common";

import { SupabaseModule } from "../../infrastructure/supabase/supabase.module";
import { LeadsController } from "./controllers/leads.controller";
import { LeadsService } from "./services/leads.service";
import { TimelineService } from "./services/timeline.service";

@Module({
  imports: [SupabaseModule],
  controllers: [LeadsController],
  providers: [LeadsService, TimelineService],
  exports: [LeadsService],
})
export class LeadsModule {}

