import { mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";

import { NestFactory } from "@nestjs/core";
import { SwaggerModule } from "@nestjs/swagger";

import { AppModule } from "../src/app.module";
import { buildSwaggerConfig } from "../src/swagger";

async function main() {
  process.env.OTEL_TRACING_ENABLED = process.env.OTEL_TRACING_ENABLED ?? "false";
  process.env.PROMETHEUS_ENABLED = process.env.PROMETHEUS_ENABLED ?? "false";

  const app = await NestFactory.create(AppModule, { logger: false });
  const document = SwaggerModule.createDocument(app, buildSwaggerConfig());

  const outDir = resolve(__dirname, "../../docs/api");
  mkdirSync(outDir, { recursive: true });
  const outFile = resolve(outDir, "openapi.json");

  writeFileSync(outFile, JSON.stringify(document, null, 2), "utf8");
  await app.close();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});

