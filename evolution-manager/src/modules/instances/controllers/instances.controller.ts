import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";

import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { CompanyGuard } from "../../../common/guards/company.guard";
import { CurrentUser, type AuthenticatedUser } from "../../../common/decorators/current-user.decorator";
import { CreateInstanceDto } from "../dto/create-instance.dto";
import { SendTestMessageDto } from "../dto/send-test-message.dto";
import { InstanceResponseDto, QrCodeResponseDto } from "../dto/instance-response.dto";
import { InstanceScopeGuard } from "../guards/instance-scope.guard";
import { InstancesService } from "../services/instances.service";

@ApiTags("instances")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, CompanyGuard)
@Controller("instances")
export class InstancesController {
  constructor(private readonly instances: InstancesService) {}

  @ApiOkResponse({ type: [InstanceResponseDto] })
  @Get()
  list(@Query("company_id") companyId: string | undefined, @CurrentUser() user?: AuthenticatedUser) {
    const resolved = companyId ?? user?.company_id;
    if (!resolved) {
      return [];
    }
    return this.instances.list(resolved);
  }

  @ApiOkResponse({ type: InstanceResponseDto })
  @Post()
  create(@Body() dto: CreateInstanceDto, @CurrentUser() user?: AuthenticatedUser) {
    if (user?.company_id && user.company_id !== dto.company_id) {
      dto.company_id = user.company_id;
    }
    return this.instances.create(dto);
  }

  @ApiOkResponse({ type: InstanceResponseDto })
  @UseGuards(InstanceScopeGuard)
  @Get(":id")
  get(@Param("id") id: string) {
    return this.instances.getById(id);
  }

  @ApiOkResponse({ type: InstanceResponseDto })
  @UseGuards(InstanceScopeGuard)
  @Get(":id/status")
  status(@Param("id") id: string) {
    return this.instances.refreshStatus(id);
  }

  @ApiOkResponse({ type: QrCodeResponseDto })
  @UseGuards(InstanceScopeGuard)
  @Post(":id/connect")
  async connect(@Param("id") id: string): Promise<QrCodeResponseDto> {
    const { qrcode } = await this.instances.connect(id);
    return { qrcode };
  }

  @ApiOkResponse({ description: "Disconnected" })
  @UseGuards(InstanceScopeGuard)
  @Post(":id/disconnect")
  disconnect(@Param("id") id: string) {
    return this.instances.disconnect(id);
  }

  @ApiOkResponse({ type: QrCodeResponseDto })
  @UseGuards(InstanceScopeGuard)
  @Get(":id/qrcode")
  async qrcode(@Param("id") id: string): Promise<QrCodeResponseDto> {
    const qrcode = await this.instances.getQrCode(id);
    return { qrcode };
  }

  @ApiOkResponse({ description: "Test message sent" })
  @UseGuards(InstanceScopeGuard)
  @Post(":id/test")
  async testMessage(@Param("id") id: string, @Body() dto: SendTestMessageDto): Promise<{ ok: true }> {
    await this.instances.sendTestMessage(id, dto.to, dto.text);
    return { ok: true };
  }

  @ApiOkResponse({ description: "Deleted" })
  @UseGuards(InstanceScopeGuard)
  @Delete(":id")
  delete(@Param("id") id: string) {
    return this.instances.delete(id);
  }
}
