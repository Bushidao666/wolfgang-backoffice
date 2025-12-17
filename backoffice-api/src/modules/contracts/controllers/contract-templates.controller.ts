import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Put,
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
import { CreateContractTemplateDto } from "../dto/create-contract-template.dto";
import { ContractTemplatesService } from "../services/contract-templates.service";

@ApiTags("ContractTemplates")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, CompanyGuard)
@Controller("contracts/templates")
export class ContractTemplatesController {
  constructor(private readonly templates: ContractTemplatesService) {}

  @Get()
  @Roles(UserRole.SuperAdmin, UserRole.BackofficeAdmin, UserRole.CrmManager, UserRole.AiSupervisor)
  list(@Headers("x-company-id") companyId: string) {
    return this.templates.list(companyId);
  }

  @Post()
  @Roles(UserRole.SuperAdmin, UserRole.BackofficeAdmin, UserRole.CrmManager)
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file"))
  @ApiOkResponse({ description: "Created" })
  create(
    @Headers("x-company-id") companyId: string,
    @Body() dto: CreateContractTemplateDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.templates.create(companyId, dto, file);
  }

  @Put(":id")
  @Roles(UserRole.SuperAdmin, UserRole.BackofficeAdmin, UserRole.CrmManager)
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file"))
  update(
    @Headers("x-company-id") companyId: string,
    @Param("id") templateId: string,
    @Body() dto: CreateContractTemplateDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.templates.update(companyId, templateId, dto, file);
  }

  @Delete(":id")
  @Roles(UserRole.SuperAdmin, UserRole.BackofficeAdmin, UserRole.CrmManager)
  async remove(@Headers("x-company-id") companyId: string, @Param("id") templateId: string) {
    await this.templates.delete(companyId, templateId);
    return { ok: true };
  }
}

