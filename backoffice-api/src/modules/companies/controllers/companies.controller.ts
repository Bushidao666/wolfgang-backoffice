import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { Roles } from "../../../common/decorators/roles.decorator";
import { UserRole } from "../../../common/enums/user-role.enum";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../../common/guards/roles.guard";
import type { AuthenticatedUser } from "../../auth/strategies/jwt.strategy";
import { CompanyResponseDto } from "../dto/company-response.dto";
import { CreateCompanyDto } from "../dto/create-company.dto";
import { ListCompaniesDto } from "../dto/list-companies.dto";
import { UpdateCompanyDto } from "../dto/update-company.dto";
import { CompaniesService } from "../services/companies.service";

@ApiTags("Companies")
@ApiBearerAuth()
@Controller("companies")
@UseGuards(JwtAuthGuard, RolesGuard)
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  @Roles(UserRole.BackofficeAdmin, UserRole.SuperAdmin)
  @ApiOperation({ summary: "Lista empresas (holding)" })
  async list(@Query() query: ListCompaniesDto) {
    return this.companiesService.list(query);
  }

  @Post()
  @Roles(UserRole.BackofficeAdmin, UserRole.SuperAdmin)
  @ApiOperation({ summary: "Cria empresa e provisiona schema" })
  async create(@Body() dto: CreateCompanyDto, @CurrentUser() user: AuthenticatedUser): Promise<CompanyResponseDto> {
    return this.companiesService.create(dto, user.sub);
  }

  @Get(":id")
  @Roles(UserRole.BackofficeAdmin, UserRole.SuperAdmin)
  @ApiOperation({ summary: "Detalhe da empresa" })
  @ApiParam({ name: "id", type: "string", format: "uuid" })
  async get(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.companiesService.getById(id);
  }

  @Patch(":id")
  @Roles(UserRole.BackofficeAdmin, UserRole.SuperAdmin)
  @ApiOperation({ summary: "Atualiza empresa" })
  @ApiParam({ name: "id", type: "string", format: "uuid" })
  async update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateCompanyDto,
  ): Promise<CompanyResponseDto> {
    return this.companiesService.update(id, dto);
  }

  @Delete(":id")
  @Roles(UserRole.SuperAdmin)
  @ApiOperation({ summary: "Arquiva empresa (super_admin)" })
  @ApiParam({ name: "id", type: "string", format: "uuid" })
  async archive(@Param("id", new ParseUUIDPipe()) id: string): Promise<void> {
    await this.companiesService.archive(id);
  }
}

