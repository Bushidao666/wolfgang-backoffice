import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";

import { Roles } from "../../../common/decorators/roles.decorator";
import { UserRole } from "../../../common/enums/user-role.enum";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../../common/guards/roles.guard";
import { ValidationError } from "@wolfgang/contracts";
import { HoldingRoleGuard } from "../../auth/guards/holding-role.guard";
import { CompanyIntegrationResponseDto } from "../dto/company-integration-response.dto";
import { UpsertCompanyIntegrationDto } from "../dto/upsert-company-integration.dto";
import { CompanyIntegrationsService } from "../services/company-integrations.service";
import { IntegrationValidatorService } from "../services/integration-validator.service";

const providers = ["autentique", "evolution", "openai"] as const;

function ensureProvider(value: string): (typeof providers)[number] {
  if ((providers as readonly string[]).includes(value)) return value as any;
  throw new ValidationError("Invalid provider", { provider: value });
}

@ApiTags("Integrations")
@ApiBearerAuth()
@Controller("integrations/companies/:companyId")
@UseGuards(JwtAuthGuard, HoldingRoleGuard, RolesGuard)
export class CompanyIntegrationsController {
  constructor(
    private readonly companyIntegrations: CompanyIntegrationsService,
    private readonly validator: IntegrationValidatorService,
  ) {}

  @Get("bindings")
  @Roles(UserRole.BackofficeAdmin, UserRole.SuperAdmin)
  @ApiOperation({ summary: "List company integration bindings" })
  @ApiParam({ name: "companyId", type: "string", format: "uuid" })
  @ApiOkResponse({ type: [CompanyIntegrationResponseDto] })
  list(@Param("companyId", new ParseUUIDPipe()) companyId: string) {
    return this.companyIntegrations.list(companyId);
  }

  @Post("bindings/:provider")
  @Roles(UserRole.BackofficeAdmin, UserRole.SuperAdmin)
  @ApiOperation({ summary: "Upsert a company integration binding" })
  @ApiParam({ name: "companyId", type: "string", format: "uuid" })
  @ApiParam({ name: "provider", enum: providers })
  @ApiOkResponse({ type: CompanyIntegrationResponseDto })
  upsert(
    @Param("companyId", new ParseUUIDPipe()) companyId: string,
    @Param("provider") provider: string,
    @Body() dto: UpsertCompanyIntegrationDto,
  ) {
    return this.companyIntegrations.upsert(companyId, ensureProvider(provider), dto);
  }

  @Post("test/:provider")
  @Roles(UserRole.BackofficeAdmin, UserRole.SuperAdmin)
  @ApiOperation({ summary: "Test integration resolution/credentials for a company" })
  @ApiParam({ name: "companyId", type: "string", format: "uuid" })
  @ApiParam({ name: "provider", enum: providers })
  test(
    @Param("companyId", new ParseUUIDPipe()) companyId: string,
    @Param("provider") provider: string,
  ) {
    return this.validator.validateCompanyIntegration(companyId, ensureProvider(provider));
  }
}
