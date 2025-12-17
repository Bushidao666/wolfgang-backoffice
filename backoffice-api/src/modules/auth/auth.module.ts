import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";

import { SupabaseModule } from "../../infrastructure/supabase/supabase.module";
import { AuthController } from "./controllers/auth.controller";
import { AuthService } from "./services/auth.service";
import { JwtStrategy } from "./strategies/jwt.strategy";

@Module({
  imports: [PassportModule, SupabaseModule],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}

