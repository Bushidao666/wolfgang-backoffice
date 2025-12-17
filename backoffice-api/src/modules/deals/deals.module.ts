import { Module } from "@nestjs/common";

import { SupabaseModule } from "../../infrastructure/supabase/supabase.module";
import { DealsController } from "./controllers/deals.controller";
import { DealsService } from "./services/deals.service";

@Module({
  imports: [SupabaseModule],
  controllers: [DealsController],
  providers: [DealsService],
})
export class DealsModule {}
