import { Module } from "@nestjs/common";

import { SupabaseModule } from "../../infrastructure/supabase/supabase.module";
import { CompaniesController } from "./controllers/companies.controller";
import { CompanyUsersController } from "./controllers/company-users.controller";
import { CompaniesRepository } from "./repository/companies.repository";
import { CompaniesService } from "./services/companies.service";
import { CompanyUsersService } from "./services/company-users.service";
import { SchemaProvisionerService } from "./services/schema-provisioner.service";

@Module({
  imports: [SupabaseModule],
  controllers: [CompaniesController, CompanyUsersController],
  providers: [CompaniesRepository, SchemaProvisionerService, CompaniesService, CompanyUsersService],
})
export class CompaniesModule {}

