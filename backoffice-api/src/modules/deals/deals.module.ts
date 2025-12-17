import { Module } from "@nestjs/common";

import { SupabaseModule } from "../../infrastructure/supabase/supabase.module";
import { PostgresModule } from "../../infrastructure/postgres/postgres.module";
import { DealsController } from "./controllers/deals.controller";
import { DealsService } from "./services/deals.service";

@Module({
  imports: [SupabaseModule, PostgresModule],
  controllers: [DealsController],
  providers: [DealsService],
})
export class DealsModule {}
