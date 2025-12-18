import { Body, Controller, Headers, Param, Post, RawBody } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";

import { WebhookProcessorService } from "../services/webhook-processor.service";

@ApiTags("Webhooks")
@Controller("webhooks")
export class WebhooksController {
  constructor(private readonly processor: WebhookProcessorService) {}

  @Post("autentique/set/:credentialSetId")
  @ApiOkResponse({ description: "Webhook processed" })
  async autentiqueWebhookByCredentialSet(
    @Param("credentialSetId") credentialSetId: string,
    @RawBody() rawBody: Buffer | undefined,
    @Body() payload: unknown,
    @Headers("x-autentique-signature") signature?: string,
    @Headers("x-request-id") requestId?: string,
  ) {
    await this.processor.processAutentiqueWebhookForCredentialSet({
      credential_set_id: credentialSetId,
      raw_body: rawBody,
      payload,
      signature,
      request_id: requestId,
    });
    return { ok: true };
  }

  @Post("autentique/company/:companyId")
  @ApiOkResponse({ description: "Webhook processed" })
  async autentiqueWebhookByCompany(
    @Param("companyId") companyId: string,
    @RawBody() rawBody: Buffer | undefined,
    @Body() payload: unknown,
    @Headers("x-autentique-signature") signature?: string,
    @Headers("x-request-id") requestId?: string,
  ) {
    await this.processor.processAutentiqueWebhookForCompany({
      company_id: companyId,
      raw_body: rawBody,
      payload,
      signature,
      request_id: requestId,
    });
    return { ok: true };
  }

  @Post("autentique")
  @ApiOkResponse({ description: "Webhook processed" })
  async autentiqueWebhook(
    @RawBody() rawBody: Buffer | undefined,
    @Body() payload: unknown,
    @Headers("x-autentique-signature") signature?: string,
    @Headers("x-request-id") requestId?: string,
  ) {
    await this.processor.processAutentiqueWebhook({
      raw_body: rawBody,
      payload,
      signature,
      request_id: requestId,
    });
    return { ok: true };
  }
}
