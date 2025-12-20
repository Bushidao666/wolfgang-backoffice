import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";

import { Roles } from "../../../common/decorators/roles.decorator";
import { UserRole } from "../../../common/enums/user-role.enum";
import { CompanyGuard } from "../../../common/guards/company.guard";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../../common/guards/roles.guard";
import { HoldingRoleGuard } from "../../auth/guards/holding-role.guard";
import { CreatePixelDto } from "../dto/create-pixel.dto";
import { PixelResponseDto } from "../dto/pixel-response.dto";
import { UpdatePixelDto } from "../dto/update-pixel.dto";
import { PixelsService } from "../services/pixels.service";

@ApiTags("Pixels")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, HoldingRoleGuard, RolesGuard, CompanyGuard)
@Controller("pixels")
export class PixelsController {
  constructor(private readonly pixels: PixelsService) {}

  @Get()
  @Roles(UserRole.SuperAdmin, UserRole.BackofficeAdmin, UserRole.MarketingAdmin)
  @ApiOkResponse({ type: [PixelResponseDto] })
  list(@Headers("x-company-id") companyId: string) {
    return this.pixels.list(companyId);
  }

  @Post()
  @Roles(UserRole.SuperAdmin, UserRole.BackofficeAdmin, UserRole.MarketingAdmin)
  @ApiOkResponse({ type: PixelResponseDto })
  create(@Headers("x-company-id") companyId: string, @Body() dto: CreatePixelDto) {
    return this.pixels.create(companyId, dto);
  }

  @Patch(":id")
  @Roles(UserRole.SuperAdmin, UserRole.BackofficeAdmin, UserRole.MarketingAdmin)
  @ApiOkResponse({ type: PixelResponseDto })
  update(@Headers("x-company-id") companyId: string, @Param("id") id: string, @Body() dto: UpdatePixelDto) {
    return this.pixels.update(companyId, id, dto);
  }

  @Delete(":id")
  @Roles(UserRole.SuperAdmin, UserRole.BackofficeAdmin, UserRole.MarketingAdmin)
  async remove(@Headers("x-company-id") companyId: string, @Param("id") id: string) {
    await this.pixels.delete(companyId, id);
    return { ok: true };
  }

  @Get(":id/events")
  @Roles(UserRole.SuperAdmin, UserRole.BackofficeAdmin, UserRole.MarketingAdmin, UserRole.AiSupervisor)
  events(
    @Headers("x-company-id") companyId: string,
    @Param("id") id: string,
    @Query("status") status?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.pixels.listEvents(companyId, id, { status, from, to });
  }

  @Post(":id/test")
  @Roles(UserRole.SuperAdmin, UserRole.BackofficeAdmin, UserRole.MarketingAdmin)
  test(@Headers("x-company-id") companyId: string, @Param("id") id: string) {
    return this.pixels.test(companyId, id);
  }
}
