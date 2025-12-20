import { Module } from "@nestjs/common";

import { SupabaseModule } from "../../infrastructure/supabase/supabase.module";
import { MediaAssetsController } from "./controllers/media-assets.controller";
import { MediaAssetsService } from "./services/media-assets.service";

@Module({
  imports: [SupabaseModule],
  controllers: [MediaAssetsController],
  providers: [MediaAssetsService],
})
export class MediaModule {}

