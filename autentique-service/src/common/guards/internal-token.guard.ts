import { CanActivate, ExecutionContext, Injectable, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";

@Injectable()
export class InternalTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const expected =
      (process.env.AUTENTIQUE_SERVICE_INTERNAL_TOKEN ?? process.env.INTERNAL_API_TOKEN ?? "").trim();
    if (!expected) {
      throw new ServiceUnavailableException("INTERNAL_API_TOKEN (or AUTENTIQUE_SERVICE_INTERNAL_TOKEN) is required");
    }

    const token = ((request.headers?.["x-internal-token"] as string | undefined) ?? "").trim();
    if (!token || token !== expected) {
      throw new UnauthorizedException("Invalid internal token");
    }
    return true;
  }
}

