import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";

import { Roles } from "../../../common/decorators/roles.decorator";
import { UserRole } from "../../../common/enums/user-role.enum";
import { CompanyGuard } from "../../../common/guards/company.guard";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../../common/guards/roles.guard";
import { CreateToolDto } from "../dto/create-tool.dto";
import { ToolResponseDto } from "../dto/tool-response.dto";
import { ToolsService } from "../services/tools.service";

@ApiTags("Tools")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, CompanyGuard)
@Controller("centurions/:id/tools")
export class ToolsController {
  constructor(private readonly tools: ToolsService) {}

  @Get()
  @Roles(UserRole.SuperAdmin, UserRole.BackofficeAdmin, UserRole.AiSupervisor)
  @ApiOkResponse({ type: [ToolResponseDto] })
  list(@Param("id") centurionId: string, @Headers("x-company-id") companyId: string) {
    return this.tools.list(companyId, centurionId);
  }

  @Post()
  @Roles(UserRole.SuperAdmin, UserRole.BackofficeAdmin, UserRole.AiSupervisor)
  @ApiOkResponse({ type: ToolResponseDto })
  create(@Param("id") centurionId: string, @Headers("x-company-id") companyId: string, @Body() dto: CreateToolDto) {
    return this.tools.create(companyId, centurionId, dto);
  }

  @Patch(":toolId")
  @Roles(UserRole.SuperAdmin, UserRole.BackofficeAdmin, UserRole.AiSupervisor)
  @ApiOkResponse({ type: ToolResponseDto })
  update(
    @Param("id") centurionId: string,
    @Param("toolId") toolId: string,
    @Headers("x-company-id") companyId: string,
    @Body() dto: Partial<CreateToolDto>,
  ) {
    return this.tools.update(companyId, centurionId, toolId, dto);
  }

  @Put(":toolId")
  @Roles(UserRole.SuperAdmin, UserRole.BackofficeAdmin, UserRole.AiSupervisor)
  @ApiOkResponse({ type: ToolResponseDto })
  replace(
    @Param("id") centurionId: string,
    @Param("toolId") toolId: string,
    @Headers("x-company-id") companyId: string,
    @Body() dto: CreateToolDto,
  ) {
    return this.tools.update(companyId, centurionId, toolId, dto);
  }

  @Delete(":toolId")
  @Roles(UserRole.SuperAdmin, UserRole.BackofficeAdmin, UserRole.AiSupervisor)
  @ApiOkResponse({ description: "Deleted" })
  async remove(
    @Param("id") centurionId: string,
    @Param("toolId") toolId: string,
    @Headers("x-company-id") companyId: string,
  ) {
    await this.tools.delete(companyId, centurionId, toolId);
    return { ok: true };
  }
}
