import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";

import { AppModule } from "./app.module";
import { GlobalExceptionFilter } from "./common/filters/global-exception.filter";
import { LoggerService } from "./common/logging/logger.service";
import { buildSwaggerConfig } from "./swagger";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(LoggerService));

  app.use(helmet());

  app.enableCors({
    // Allow any origin (Railway + multiple frontends) and let CORS middleware reply to preflights.
    // With credentials=true we cannot use "*" so we reflect the Origin header.
    origin: true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      forbidUnknownValues: true,
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter(app.get(LoggerService)));

  const document = SwaggerModule.createDocument(app, buildSwaggerConfig());
  SwaggerModule.setup("api/docs", app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port, "0.0.0.0");
}

bootstrap();
