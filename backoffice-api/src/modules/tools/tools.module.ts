import { Module } from "@nestjs/common";

import { SupabaseModule } from "../../infrastructure/supabase/supabase.module";
import { ToolsController } from "./controllers/tools.controller";
import { ToolsService } from "./services/tools.service";

@Module({
  imports: [SupabaseModule],
  controllers: [ToolsController],
  providers: [ToolsService],
})
export class ToolsModule {}

