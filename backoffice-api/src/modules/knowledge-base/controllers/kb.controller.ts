import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiConsumes, ApiOkResponse, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { Roles } from "../../../common/decorators/roles.decorator";
import { UserRole } from "../../../common/enums/user-role.enum";
import { CompanyGuard } from "../../../common/guards/company.guard";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../../common/guards/roles.guard";
import { HoldingRoleGuard } from "../../auth/guards/holding-role.guard";
import type { AuthenticatedUser } from "../../auth/strategies/jwt.strategy";
import { UploadDocumentDto } from "../dto/upload-document.dto";
import { KbService } from "../services/kb.service";

@ApiTags("KnowledgeBase")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, HoldingRoleGuard, RolesGuard, CompanyGuard)
@Controller("knowledge-base")
export class KbController {
  constructor(private readonly kb: KbService) {}

  @Get("documents")
  @Roles(UserRole.SuperAdmin, UserRole.BackofficeAdmin, UserRole.AiSupervisor)
  list(@Headers("x-company-id") companyId: string) {
    return this.kb.listDocuments(companyId);
  }

  @Post("documents")
  @Roles(UserRole.SuperAdmin, UserRole.BackofficeAdmin, UserRole.AiSupervisor)
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file"))
  @ApiOkResponse({ description: "Uploaded" })
  upload(
    @Headers("x-company-id") companyId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.kb.uploadDocument(companyId, user?.sub, file, dto.title);
  }

  @Get("documents/:id/chunks")
  @Roles(UserRole.SuperAdmin, UserRole.BackofficeAdmin, UserRole.AiSupervisor)
  listChunks(
    @Headers("x-company-id") companyId: string,
    @Param("id", new ParseUUIDPipe()) documentId: string,
    @Query("limit", new ParseIntPipe({ optional: true })) limit?: number,
    @Query("offset", new ParseIntPipe({ optional: true })) offset?: number,
  ) {
    return this.kb.listChunks(companyId, documentId, limit ?? 100, offset ?? 0);
  }

  @Delete("documents/:id")
  @Roles(UserRole.SuperAdmin, UserRole.BackofficeAdmin, UserRole.AiSupervisor)
  async remove(@Headers("x-company-id") companyId: string, @Param("id", new ParseUUIDPipe()) documentId: string) {
    await this.kb.deleteDocument(companyId, documentId);
    return { ok: true };
  }
}
