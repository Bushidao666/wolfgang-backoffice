import { Module } from "@nestjs/common";

import { PostgresModule } from "../../infrastructure/postgres/postgres.module";
import { SupabaseModule } from "../../infrastructure/supabase/supabase.module";
import { CompaniesController } from "./controllers/companies.controller";
import { CompanyUsersController } from "./controllers/company-users.controller";
import { PostgrestExposureWorker } from "./jobs/postgrest-exposure.worker";
import { CompaniesRepository } from "./repository/companies.repository";
import { CompaniesService } from "./services/companies.service";
import { CompanyUsersService } from "./services/company-users.service";
import { PostgrestExposureService } from "./services/postgrest-exposure.service";
import { SchemaProvisionerService } from "./services/schema-provisioner.service";

@Module({
  imports: [SupabaseModule, PostgresModule],
  controllers: [CompaniesController, CompanyUsersController],
  providers: [
    CompaniesRepository,
    SchemaProvisionerService,
    PostgrestExposureService,
    PostgrestExposureWorker,
    CompaniesService,
    CompanyUsersService,
  ],
})
export class CompaniesModule {}
