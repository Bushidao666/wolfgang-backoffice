import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";

import { Roles } from "../../../common/decorators/roles.decorator";
import { UserRole } from "../../../common/enums/user-role.enum";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../../common/guards/roles.guard";
import { AddUserDto } from "../dto/add-user.dto";
import { CompanyUsersService } from "../services/company-users.service";

@ApiTags("Companies")
@ApiBearerAuth()
@Controller("companies/:id/users")
@UseGuards(JwtAuthGuard, RolesGuard)
export class CompanyUsersController {
  constructor(private readonly companyUsersService: CompanyUsersService) {}

  @Get()
  @Roles(UserRole.BackofficeAdmin, UserRole.SuperAdmin)
  @ApiOperation({ summary: "Lista usuários da empresa" })
  @ApiParam({ name: "id", type: "string", format: "uuid" })
  async list(@Param("id", new ParseUUIDPipe()) companyId: string) {
    return this.companyUsersService.list(companyId);
  }

  @Post()
  @Roles(UserRole.BackofficeAdmin, UserRole.SuperAdmin)
  @ApiOperation({ summary: "Adiciona usuário à empresa (por email)" })
  @ApiParam({ name: "id", type: "string", format: "uuid" })
  async add(@Param("id", new ParseUUIDPipe()) companyId: string, @Body() dto: AddUserDto) {
    return this.companyUsersService.add(companyId, dto);
  }

  @Delete(":userId")
  @Roles(UserRole.BackofficeAdmin, UserRole.SuperAdmin)
  @ApiOperation({ summary: "Remove usuário da empresa" })
  @ApiParam({ name: "id", type: "string", format: "uuid" })
  @ApiParam({ name: "userId", type: "string", format: "uuid" })
  async remove(
    @Param("id", new ParseUUIDPipe()) companyId: string,
    @Param("userId", new ParseUUIDPipe()) userId: string,
  ): Promise<void> {
    await this.companyUsersService.remove(companyId, userId);
  }
}

