import { Body, Controller, Delete, Get, Headers, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";

import { Roles } from "../../../common/decorators/roles.decorator";
import { UserRole } from "../../../common/enums/user-role.enum";
import { CompanyGuard } from "../../../common/guards/company.guard";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../../common/guards/roles.guard";
import { HoldingRoleGuard } from "../../auth/guards/holding-role.guard";
import { CreateMcpServerDto } from "../dto/create-mcp-server.dto";
import { McpService } from "../services/mcp.service";

@ApiTags("MCP")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, HoldingRoleGuard, RolesGuard, CompanyGuard)
@Controller("centurions/:id/mcp-servers")
export class McpController {
  constructor(private readonly mcp: McpService) {}

  @Get()
  @Roles(UserRole.SuperAdmin, UserRole.BackofficeAdmin, UserRole.AiSupervisor)
  list(@Param("id") centurionId: string, @Headers("x-company-id") companyId: string) {
    return this.mcp.list(companyId, centurionId);
  }

  @Post()
  @Roles(UserRole.SuperAdmin, UserRole.BackofficeAdmin, UserRole.AiSupervisor)
  @ApiOkResponse({ description: "Created" })
  create(@Param("id") centurionId: string, @Headers("x-company-id") companyId: string, @Body() dto: CreateMcpServerDto) {
    return this.mcp.create(companyId, centurionId, dto);
  }

  @Delete(":serverId")
  @Roles(UserRole.SuperAdmin, UserRole.BackofficeAdmin, UserRole.AiSupervisor)
  async remove(
    @Param("id") centurionId: string,
    @Param("serverId") serverId: string,
    @Headers("x-company-id") companyId: string,
  ) {
    await this.mcp.delete(companyId, centurionId, serverId);
    return { ok: true };
  }
}
