import { Module } from "@nestjs/common";

import { SupabaseModule } from "../../infrastructure/supabase/supabase.module";
import { FollowupsController } from "./controllers/followups.controller";
import { FollowupsService } from "./services/followups.service";

@Module({
  imports: [SupabaseModule],
  controllers: [FollowupsController],
  providers: [FollowupsService],
})
export class FollowupsModule {}

