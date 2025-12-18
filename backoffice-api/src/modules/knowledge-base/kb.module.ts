import { Module } from "@nestjs/common";

import { SupabaseModule } from "../../infrastructure/supabase/supabase.module";
import { IntegrationsModule } from "../integrations/integrations.module";
import { KbController } from "./controllers/kb.controller";
import { DocumentProcessorService } from "./services/document-processor.service";
import { KbService } from "./services/kb.service";

@Module({
  imports: [SupabaseModule, IntegrationsModule],
  controllers: [KbController],
  providers: [KbService, DocumentProcessorService],
  exports: [KbService],
})
export class KnowledgeBaseModule {}
