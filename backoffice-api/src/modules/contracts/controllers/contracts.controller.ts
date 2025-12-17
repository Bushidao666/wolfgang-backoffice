import { Body, Controller, Get, Headers, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";

import { Roles } from "../../../common/decorators/roles.decorator";
import { UserRole } from "../../../common/enums/user-role.enum";
import { CompanyGuard } from "../../../common/guards/company.guard";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../../common/guards/roles.guard";
import { CreateContractDto } from "../dto/create-contract.dto";
import { ContractsService } from "../services/contracts.service";

@ApiTags("Contracts")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, CompanyGuard)
@Controller("contracts")
export class ContractsController {
  constructor(private readonly contracts: ContractsService) {}

  @Get()
  @Roles(UserRole.SuperAdmin, UserRole.BackofficeAdmin, UserRole.CrmManager, UserRole.CrmUser, UserRole.AiSupervisor)
  list(@Headers("x-company-id") companyId: string) {
    return this.contracts.list(companyId);
  }

  @Post()
  @Roles(UserRole.SuperAdmin, UserRole.BackofficeAdmin, UserRole.CrmManager, UserRole.CrmUser)
  @ApiOkResponse({ description: "Contract created/sent" })
  create(
    @Headers("x-company-id") companyId: string,
    @Headers("x-request-id") requestId: string | undefined,
    @Headers("x-correlation-id") correlationId: string | undefined,
    @Body() dto: CreateContractDto,
  ) {
    return this.contracts.create(companyId, dto, { requestId, correlationId });
  }

  @Get(":id")
  @Roles(UserRole.SuperAdmin, UserRole.BackofficeAdmin, UserRole.CrmManager, UserRole.CrmUser, UserRole.AiSupervisor)
  get(@Headers("x-company-id") companyId: string, @Param("id") contractId: string) {
    return this.contracts.get(companyId, contractId);
  }

  @Get(":id/download")
  @Roles(UserRole.SuperAdmin, UserRole.BackofficeAdmin, UserRole.CrmManager, UserRole.CrmUser, UserRole.AiSupervisor)
  @ApiOkResponse({ description: "Signed URL to download the signed contract (when available)" })
  download(@Headers("x-company-id") companyId: string, @Param("id") contractId: string) {
    return this.contracts.download(companyId, contractId);
  }
}
