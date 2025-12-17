import { Body, Controller, Get, Headers, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { AuthenticatedUser } from "../strategies/jwt.strategy";
import { AuthResponseDto } from "../dto/auth-response.dto";
import { ForgotPasswordDto } from "../dto/forgot-password.dto";
import { LoginDto } from "../dto/login.dto";
import { ResetPasswordDto } from "../dto/reset-password.dto";
import { AuthService } from "../services/auth.service";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @ApiOkResponse({ type: AuthResponseDto })
  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @ApiOkResponse({ type: AuthResponseDto })
  @Post("refresh")
  refresh(@Body("refresh_token") refreshToken: string) {
    return this.auth.refresh(refreshToken);
  }

  @ApiBearerAuth()
  @ApiOkResponse({ description: "Logout" })
  @UseGuards(JwtAuthGuard)
  @Post("logout")
  logout(@Headers("authorization") authorization?: string) {
    const token = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : undefined;
    return this.auth.logout(token);
  }

  @ApiOkResponse({ description: "Forgot password requested" })
  @Post("forgot-password")
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto.email);
  }

  @ApiOkResponse({ description: "Password reset" })
  @Post("reset-password")
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto.access_token, dto.new_password);
  }

  @ApiBearerAuth()
  @ApiOkResponse({ description: "Current user" })
  @UseGuards(JwtAuthGuard)
  @Get("me")
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }
}
