import { Module } from "@nestjs/common";

import { SupabaseModule } from "../../infrastructure/supabase/supabase.module";
import { CompanyIntegrationsController } from "./controllers/company-integrations.controller";
import { CredentialSetsController } from "./controllers/credential-sets.controller";
import { CompanyIntegrationsService } from "./services/company-integrations.service";
import { CredentialSetsService } from "./services/credential-sets.service";
import { IntegrationsResolverService } from "./services/integrations-resolver.service";

@Module({
  imports: [SupabaseModule],
  controllers: [CredentialSetsController, CompanyIntegrationsController],
  providers: [CredentialSetsService, CompanyIntegrationsService, IntegrationsResolverService],
  exports: [IntegrationsResolverService],
})
export class IntegrationsModule {}

