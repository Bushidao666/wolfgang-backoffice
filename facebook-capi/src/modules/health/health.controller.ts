import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";

@ApiTags("health")
@Controller("health")
export class HealthController {
  @ApiOkResponse({ description: "Service is healthy" })
  @Get()
  health() {
    return {
      status: "ok",
      service: process.env.SERVICE_NAME ?? "facebook-capi",
      timestamp: new Date().toISOString(),
    };
  }
}
