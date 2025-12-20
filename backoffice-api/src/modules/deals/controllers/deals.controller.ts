import { Controller, Get, Headers, Param, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";

import { Roles } from "../../../common/decorators/roles.decorator";
import { UserRole } from "../../../common/enums/user-role.enum";
import { CompanyGuard } from "../../../common/guards/company.guard";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../../common/guards/roles.guard";
import { HoldingRoleGuard } from "../../auth/guards/holding-role.guard";
import { DealResponseDto } from "../dto/deal-response.dto";
import { DealsService } from "../services/deals.service";

@ApiTags("Deals")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, HoldingRoleGuard, RolesGuard, CompanyGuard)
@Controller("deals")
export class DealsController {
  constructor(private readonly deals: DealsService) {}

  @Get()
  @Roles(UserRole.SuperAdmin, UserRole.BackofficeAdmin, UserRole.CrmManager, UserRole.CrmUser, UserRole.AiSupervisor)
  @ApiOkResponse({ type: [DealResponseDto] })
  list(
    @Headers("x-company-id") companyId: string,
    @Query("status") status?: string,
    @Query("q") q?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.deals.list(companyId, { status, q, from, to });
  }

  @Get("stats")
  @Roles(UserRole.SuperAdmin, UserRole.BackofficeAdmin, UserRole.CrmManager, UserRole.CrmUser, UserRole.AiSupervisor)
  stats(@Headers("x-company-id") companyId: string) {
    return this.deals.stats(companyId);
  }

  @Get(":id")
  @Roles(UserRole.SuperAdmin, UserRole.BackofficeAdmin, UserRole.CrmManager, UserRole.CrmUser, UserRole.AiSupervisor)
  get(@Headers("x-company-id") companyId: string, @Param("id") dealId: string) {
    return this.deals.get(companyId, dealId);
  }

  @Get(":id/timeline")
  @Roles(UserRole.SuperAdmin, UserRole.BackofficeAdmin, UserRole.CrmManager, UserRole.CrmUser, UserRole.AiSupervisor)
  timeline(@Headers("x-company-id") companyId: string, @Param("id") dealId: string) {
    return this.deals.timeline(companyId, dealId);
  }
}
