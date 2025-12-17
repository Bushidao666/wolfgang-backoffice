import { Module } from "@nestjs/common";

import { SupabaseModule } from "../../infrastructure/supabase/supabase.module";
import { PostgresModule } from "../../infrastructure/postgres/postgres.module";
import { AutentiqueServiceClient } from "../../infrastructure/clients/autentique-service.client";
import { ContractTemplatesController } from "./controllers/contract-templates.controller";
import { ContractsController } from "./controllers/contracts.controller";
import { ContractTemplatesService } from "./services/contract-templates.service";
import { ContractsService } from "./services/contracts.service";

@Module({
  imports: [SupabaseModule, PostgresModule],
  controllers: [ContractTemplatesController, ContractsController],
  providers: [AutentiqueServiceClient, ContractTemplatesService, ContractsService],
})
export class ContractsModule {}
