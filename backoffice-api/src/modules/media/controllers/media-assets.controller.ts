import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiConsumes, ApiOkResponse, ApiTags } from "@nestjs/swagger";

import { Roles } from "../../../common/decorators/roles.decorator";
import { UserRole } from "../../../common/enums/user-role.enum";
import { CompanyGuard } from "../../../common/guards/company.guard";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../../common/guards/roles.guard";
import { HoldingRoleGuard } from "../../auth/guards/holding-role.guard";
import { CreateMediaAssetDto, MediaAssetResponseDto, UpdateMediaAssetDto } from "../dto/media-asset.dto";
import { MediaAssetsService } from "../services/media-assets.service";

@ApiTags("MediaAssets")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, HoldingRoleGuard, RolesGuard, CompanyGuard)
@Controller("media/assets")
export class MediaAssetsController {
  constructor(private readonly media: MediaAssetsService) {}

  @Get()
  @Roles(UserRole.SuperAdmin, UserRole.BackofficeAdmin, UserRole.CrmManager, UserRole.AiSupervisor)
  @ApiOkResponse({ type: [MediaAssetResponseDto] })
  list(
    @Headers("x-company-id") companyId: string,
    @Query("centurion_id") centurionId?: string,
  ) {
    const resolved = centurionId === "null" ? null : centurionId;
    return this.media.list(companyId, { centurionId: resolved });
  }

  @Post()
  @Roles(UserRole.SuperAdmin, UserRole.BackofficeAdmin, UserRole.CrmManager)
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file"))
  @ApiOkResponse({ type: MediaAssetResponseDto })
  create(
    @Headers("x-company-id") companyId: string,
    @Body() dto: CreateMediaAssetDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.media.create(companyId, dto, file);
  }

  @Put(":id")
  @Roles(UserRole.SuperAdmin, UserRole.BackofficeAdmin, UserRole.CrmManager)
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file"))
  @ApiOkResponse({ type: MediaAssetResponseDto })
  update(
    @Headers("x-company-id") companyId: string,
    @Param("id") assetId: string,
    @Body() dto: UpdateMediaAssetDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.media.update(companyId, assetId, dto, file);
  }

  @Get(":id/signed-url")
  @Roles(UserRole.SuperAdmin, UserRole.BackofficeAdmin, UserRole.CrmManager, UserRole.AiSupervisor)
  signedUrl(
    @Headers("x-company-id") companyId: string,
    @Param("id") assetId: string,
    @Query("expires_s") expiresS?: string,
  ) {
    const expires = expiresS ? Number(expiresS) : undefined;
    return this.media.createSignedUrl(companyId, assetId, expires);
  }

  @Delete(":id")
  @Roles(UserRole.SuperAdmin, UserRole.BackofficeAdmin, UserRole.CrmManager)
  async remove(@Headers("x-company-id") companyId: string, @Param("id") assetId: string) {
    await this.media.delete(companyId, assetId);
    return { ok: true };
  }
}

