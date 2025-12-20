import { Controller, Get, Headers, Param, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";

import { Roles } from "../../../common/decorators/roles.decorator";
import { UserRole } from "../../../common/enums/user-role.enum";
import { CompanyGuard } from "../../../common/guards/company.guard";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../../common/guards/roles.guard";
import { HoldingRoleGuard } from "../../auth/guards/holding-role.guard";
import { LeadFiltersDto } from "../dto/lead-filters.dto";
import { LeadListResponseDto, LeadResponseDto } from "../dto/lead-response.dto";
import { LeadQualificationEventsResponseDto } from "../dto/qualification-events.dto";
import { LeadTimelineResponseDto } from "../dto/timeline-response.dto";
import { LeadsService } from "../services/leads.service";
import { TimelineService } from "../services/timeline.service";

@ApiTags("Leads")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, HoldingRoleGuard, RolesGuard, CompanyGuard)
@Controller("leads")
export class LeadsController {
  constructor(
    private readonly leads: LeadsService,
    private readonly timelineService: TimelineService,
  ) {}

  @Get()
  @Roles(UserRole.SuperAdmin, UserRole.BackofficeAdmin, UserRole.AiSupervisor, UserRole.CrmManager)
  @ApiOkResponse({ type: LeadListResponseDto })
  list(@Headers("x-company-id") companyId: string, @Query() filters: LeadFiltersDto) {
    return this.leads.list(companyId, filters);
  }

  @Get(":id")
  @Roles(UserRole.SuperAdmin, UserRole.BackofficeAdmin, UserRole.AiSupervisor, UserRole.CrmManager)
  @ApiOkResponse({ type: LeadResponseDto })
  get(@Headers("x-company-id") companyId: string, @Param("id") leadId: string) {
    return this.leads.get(companyId, leadId);
  }

  @Get(":id/timeline")
  @Roles(UserRole.SuperAdmin, UserRole.BackofficeAdmin, UserRole.AiSupervisor, UserRole.CrmManager)
  @ApiOkResponse({ type: LeadTimelineResponseDto })
  timeline(
    @Headers("x-company-id") companyId: string,
    @Param("id") leadId: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.timelineService.getTimeline(companyId, leadId, {
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Get(":id/qualification-events")
  @Roles(UserRole.SuperAdmin, UserRole.BackofficeAdmin, UserRole.AiSupervisor, UserRole.CrmManager)
  @ApiOkResponse({ type: LeadQualificationEventsResponseDto })
  qualificationEvents(
    @Headers("x-company-id") companyId: string,
    @Param("id") leadId: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.leads.listQualificationEvents(companyId, leadId, {
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }
}
