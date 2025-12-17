import { Module } from "@nestjs/common";

import { SupabaseModule } from "../../infrastructure/supabase/supabase.module";
import { McpController } from "./controllers/mcp.controller";
import { McpService } from "./services/mcp.service";

@Module({
  imports: [SupabaseModule],
  controllers: [McpController],
  providers: [McpService],
})
export class McpModule {}

