import { Controller, Get, Headers, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";

import { Roles } from "../../../common/decorators/roles.decorator";
import { UserRole } from "../../../common/enums/user-role.enum";
import { CompanyGuard } from "../../../common/guards/company.guard";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../../common/guards/roles.guard";
import { HoldingRoleGuard } from "../../auth/guards/holding-role.guard";
import { MetricsByCenturionDto, MetricsConversionDto, MetricsSummaryDto, MetricsTimelineDto } from "../dto/metrics-response.dto";
import { MetricsService } from "../services/metrics.service";

@ApiTags("Metrics")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, HoldingRoleGuard, RolesGuard, CompanyGuard)
@Controller("metrics")
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get("summary")
  @Roles(UserRole.SuperAdmin, UserRole.BackofficeAdmin, UserRole.AiSupervisor, UserRole.CrmManager)
  @ApiOkResponse({ type: MetricsSummaryDto })
  summary(@Headers("x-company-id") companyId: string, @Query("from") from?: string, @Query("to") to?: string) {
    return this.metrics.summary(companyId, { from, to });
  }

  @Get("conversion")
  @Roles(UserRole.SuperAdmin, UserRole.BackofficeAdmin, UserRole.AiSupervisor, UserRole.CrmManager)
  @ApiOkResponse({ type: MetricsConversionDto })
  conversion(@Headers("x-company-id") companyId: string, @Query("from") from?: string, @Query("to") to?: string) {
    return this.metrics.conversion(companyId, { from, to });
  }

  @Get("by-centurion")
  @Roles(UserRole.SuperAdmin, UserRole.BackofficeAdmin, UserRole.AiSupervisor, UserRole.CrmManager)
  @ApiOkResponse({ type: MetricsByCenturionDto })
  byCenturion(@Headers("x-company-id") companyId: string, @Query("from") from?: string, @Query("to") to?: string) {
    return this.metrics.byCenturion(companyId, { from, to });
  }

  @Get("timeline")
  @Roles(UserRole.SuperAdmin, UserRole.BackofficeAdmin, UserRole.AiSupervisor, UserRole.CrmManager)
  @ApiOkResponse({ type: MetricsTimelineDto })
  timeline(@Headers("x-company-id") companyId: string, @Query("from") from?: string, @Query("to") to?: string) {
    return this.metrics.timeline(companyId, { from, to });
  }

  // Aliases for older docs
  @Get("overview")
  overview(@Headers("x-company-id") companyId: string, @Query("from") from?: string, @Query("to") to?: string) {
    return this.metrics.summary(companyId, { from, to });
  }
}
