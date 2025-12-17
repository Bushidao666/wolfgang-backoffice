import { Body, Controller, Headers, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";

import { Roles } from "../../../common/decorators/roles.decorator";
import { UserRole } from "../../../common/enums/user-role.enum";
import { CompanyGuard } from "../../../common/guards/company.guard";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../../common/guards/roles.guard";
import { TestCenturionDto } from "../dto/test-centurion.dto";
import { CenturionTestService } from "../services/centurion-test.service";

@ApiTags("Centurions")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, CompanyGuard)
@Controller("centurions")
export class CenturionTestController {
  constructor(private readonly tester: CenturionTestService) {}

  @Post(":id/test")
  @Roles(UserRole.SuperAdmin, UserRole.BackofficeAdmin, UserRole.AiSupervisor)
  @ApiOkResponse({ description: "Test response" })
  test(
    @Headers("x-company-id") companyId: string,
    @Headers("x-request-id") requestId: string | undefined,
    @Headers("x-correlation-id") correlationId: string | undefined,
    @Param("id") id: string,
    @Body() dto: TestCenturionDto,
  ) {
    return this.tester.run(companyId, id, dto.message, { requestId, correlationId });
  }
}
