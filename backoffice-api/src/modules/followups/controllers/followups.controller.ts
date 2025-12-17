import { Body, Controller, Delete, Get, Headers, Param, Post, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";

import { Roles } from "../../../common/decorators/roles.decorator";
import { UserRole } from "../../../common/enums/user-role.enum";
import { CompanyGuard } from "../../../common/guards/company.guard";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../../common/guards/roles.guard";
import { CreateFollowupRuleDto } from "../dto/create-followup-rule.dto";
import { FollowupsService } from "../services/followups.service";

@ApiTags("FollowUps")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, CompanyGuard)
@Controller("centurions/:id/followup-rules")
export class FollowupsController {
  constructor(private readonly followups: FollowupsService) {}

  @Get()
  @Roles(UserRole.SuperAdmin, UserRole.BackofficeAdmin, UserRole.AiSupervisor)
  list(@Param("id") centurionId: string, @Headers("x-company-id") companyId: string) {
    return this.followups.list(companyId, centurionId);
  }

  @Post()
  @Roles(UserRole.SuperAdmin, UserRole.BackofficeAdmin, UserRole.AiSupervisor)
  @ApiOkResponse({ description: "Created" })
  create(@Param("id") centurionId: string, @Headers("x-company-id") companyId: string, @Body() dto: CreateFollowupRuleDto) {
    return this.followups.create(companyId, centurionId, dto);
  }

  @Put(":ruleId")
  @Roles(UserRole.SuperAdmin, UserRole.BackofficeAdmin, UserRole.AiSupervisor)
  update(
    @Param("id") centurionId: string,
    @Param("ruleId") ruleId: string,
    @Headers("x-company-id") companyId: string,
    @Body() dto: CreateFollowupRuleDto,
  ) {
    return this.followups.update(companyId, centurionId, ruleId, dto);
  }

  @Delete(":ruleId")
  @Roles(UserRole.SuperAdmin, UserRole.BackofficeAdmin, UserRole.AiSupervisor)
  async remove(
    @Param("id") centurionId: string,
    @Param("ruleId") ruleId: string,
    @Headers("x-company-id") companyId: string,
  ) {
    await this.followups.delete(companyId, centurionId, ruleId);
    return { ok: true };
  }
}

