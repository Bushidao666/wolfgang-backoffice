import { DocumentBuilder } from "@nestjs/swagger";

export function buildSwaggerConfig() {
  return new DocumentBuilder()
    .setTitle("Wolfgang Backoffice API")
    .setDescription("API principal do backoffice multi-tenant")
    .setVersion("0.1.0")
    .addBearerAuth()
    .build();
}

