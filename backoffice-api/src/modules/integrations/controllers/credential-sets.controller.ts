import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { Roles } from "../../../common/decorators/roles.decorator";
import { UserRole } from "../../../common/enums/user-role.enum";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../../common/guards/roles.guard";
import { HoldingRoleGuard } from "../../auth/guards/holding-role.guard";
import type { AuthenticatedUser } from "../../auth/strategies/jwt.strategy";
import { CreateCredentialSetDto } from "../dto/create-credential-set.dto";
import { CredentialSetResponseDto } from "../dto/credential-set-response.dto";
import { UpdateCredentialSetDto } from "../dto/update-credential-set.dto";
import { CredentialSetsService } from "../services/credential-sets.service";

@ApiTags("Integrations")
@ApiBearerAuth()
@Controller("integrations/credential-sets")
@UseGuards(JwtAuthGuard, HoldingRoleGuard, RolesGuard)
export class CredentialSetsController {
  constructor(private readonly sets: CredentialSetsService) {}

  @Get()
  @Roles(UserRole.BackofficeAdmin, UserRole.SuperAdmin)
  @ApiOperation({ summary: "List global integration credential sets" })
  @ApiOkResponse({ type: [CredentialSetResponseDto] })
  list(@Query("provider") provider?: string) {
    return this.sets.list(provider);
  }

  @Post()
  @Roles(UserRole.BackofficeAdmin, UserRole.SuperAdmin)
  @ApiOperation({ summary: "Create a global credential set" })
  @ApiOkResponse({ type: CredentialSetResponseDto })
  create(@Body() dto: CreateCredentialSetDto, @CurrentUser() user: AuthenticatedUser) {
    return this.sets.create(dto, { user_id: user.sub });
  }

  @Patch(":id")
  @Roles(UserRole.BackofficeAdmin, UserRole.SuperAdmin)
  @ApiOperation({ summary: "Update a global credential set" })
  @ApiParam({ name: "id", type: "string", format: "uuid" })
  @ApiOkResponse({ type: CredentialSetResponseDto })
  update(@Param("id") id: string, @Body() dto: UpdateCredentialSetDto) {
    return this.sets.update(id, dto);
  }

  @Post(":id/default")
  @Roles(UserRole.BackofficeAdmin, UserRole.SuperAdmin)
  @ApiOperation({ summary: "Set this credential set as default for its provider" })
  @ApiParam({ name: "id", type: "string", format: "uuid" })
  async setDefault(@Param("id") id: string): Promise<{ ok: true }> {
    await this.sets.setDefault(id);
    return { ok: true };
  }

  @Delete(":id")
  @Roles(UserRole.BackofficeAdmin, UserRole.SuperAdmin)
  @ApiOperation({ summary: "Delete a global credential set" })
  @ApiParam({ name: "id", type: "string", format: "uuid" })
  async remove(@Param("id") id: string): Promise<{ ok: true }> {
    await this.sets.remove(id);
    return { ok: true };
  }
}
