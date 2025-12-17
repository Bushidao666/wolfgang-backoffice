import { Module } from "@nestjs/common";

import { SupabaseModule } from "../../infrastructure/supabase/supabase.module";
import { PixelsController } from "./controllers/pixels.controller";
import { PixelsService } from "./services/pixels.service";

@Module({
  imports: [SupabaseModule],
  controllers: [PixelsController],
  providers: [PixelsService],
})
export class MarketingModule {}

