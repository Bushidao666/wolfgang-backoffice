import { Body, Controller, Get, Headers, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";

import { InternalTokenGuard } from "../../../common/guards/internal-token.guard";
import { CreateContractDto } from "../dto/create-contract.dto";
import { ContractsQueryDto } from "../dto/contracts-query.dto";
import { ContractResponseDto } from "../dto/contract-response.dto";
import { ContractsService } from "../services/contracts.service";

@ApiTags("Contracts")
@ApiBearerAuth()
@Controller("contracts")
@UseGuards(InternalTokenGuard)
export class ContractsController {
  constructor(private readonly contracts: ContractsService) {}

  @Post()
  @ApiOkResponse({ type: ContractResponseDto })
  create(
    @Body() dto: CreateContractDto,
    @Headers("x-request-id") requestId?: string,
    @Headers("x-correlation-id") correlationId?: string,
  ) {
    return this.contracts.create(dto, { correlation_id: correlationId ?? requestId });
  }

  @Get()
  @ApiOkResponse({ type: [ContractResponseDto] })
  list(@Query() query: ContractsQueryDto) {
    return this.contracts.list(query);
  }

  @Get(":id")
  @ApiOkResponse({ type: ContractResponseDto })
  get(@Param("id") contractId: string, @Query("company_id") companyId: string) {
    return this.contracts.get({ contract_id: contractId, company_id: companyId });
  }
}
