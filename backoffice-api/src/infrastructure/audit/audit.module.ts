import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";

import { LoggerService } from "../../common/logging/logger.service";
import { SupabaseModule } from "../supabase/supabase.module";
import { AuditInterceptor } from "./audit.interceptor";

@Module({
  imports: [SupabaseModule],
  providers: [
    LoggerService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AuditModule {}

