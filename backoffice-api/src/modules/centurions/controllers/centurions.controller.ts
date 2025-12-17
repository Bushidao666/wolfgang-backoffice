import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";

import { Roles } from "../../../common/decorators/roles.decorator";
import { UserRole } from "../../../common/enums/user-role.enum";
import { CompanyGuard } from "../../../common/guards/company.guard";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../../common/guards/roles.guard";
import { CreateCenturionDto, UpdateCenturionDto } from "../dto/create-centurion.dto";
import { CenturionResponseDto } from "../dto/centurion-response.dto";
import { CenturionsService } from "../services/centurions.service";

@ApiTags("Centurions")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, CompanyGuard)
@Controller("centurions")
export class CenturionsController {
  constructor(private readonly centurions: CenturionsService) {}

  @Get()
  @Roles(UserRole.SuperAdmin, UserRole.BackofficeAdmin, UserRole.AiSupervisor, UserRole.CrmManager)
  @ApiOkResponse({ type: [CenturionResponseDto] })
  list(@Headers("x-company-id") companyId: string) {
    return this.centurions.list(companyId);
  }

  @Post()
  @Roles(UserRole.SuperAdmin, UserRole.BackofficeAdmin, UserRole.AiSupervisor)
  @ApiOkResponse({ type: CenturionResponseDto })
  create(@Headers("x-company-id") companyId: string, @Body() dto: CreateCenturionDto) {
    return this.centurions.create(companyId, dto);
  }

  @Get(":id")
  @Roles(UserRole.SuperAdmin, UserRole.BackofficeAdmin, UserRole.AiSupervisor, UserRole.CrmManager)
  @ApiOkResponse({ type: CenturionResponseDto })
  get(@Headers("x-company-id") companyId: string, @Param("id") id: string) {
    return this.centurions.get(companyId, id);
  }

  @Patch(":id")
  @Roles(UserRole.SuperAdmin, UserRole.BackofficeAdmin, UserRole.AiSupervisor)
  @ApiOkResponse({ type: CenturionResponseDto })
  update(@Headers("x-company-id") companyId: string, @Param("id") id: string, @Body() dto: UpdateCenturionDto) {
    return this.centurions.update(companyId, id, dto);
  }

  @Delete(":id")
  @Roles(UserRole.SuperAdmin, UserRole.BackofficeAdmin, UserRole.AiSupervisor)
  @ApiOkResponse({ description: "Deleted" })
  async delete(@Headers("x-company-id") companyId: string, @Param("id") id: string) {
    await this.centurions.delete(companyId, id);
    return { ok: true };
  }
}

