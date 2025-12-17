import { Module } from "@nestjs/common";

import { SupabaseModule } from "../../infrastructure/supabase/supabase.module";
import { CenturionTestController } from "./controllers/centurion-test.controller";
import { CenturionsController } from "./controllers/centurions.controller";
import { CenturionTestService } from "./services/centurion-test.service";
import { CenturionsService } from "./services/centurions.service";

@Module({
  imports: [SupabaseModule],
  controllers: [CenturionsController, CenturionTestController],
  providers: [CenturionsService, CenturionTestService],
  exports: [CenturionsService],
})
export class CenturionsModule {}

