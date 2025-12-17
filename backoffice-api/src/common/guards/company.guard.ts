import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";

import { UserRole } from "../enums/user-role.enum";

type RequestUser = { role?: UserRole; company_id?: string };

@Injectable()
export class CompanyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as RequestUser | undefined;

    if (!user) return false;
    if (user.role === UserRole.SuperAdmin || user.role === UserRole.BackofficeAdmin) {
      return true;
    }

    const companyId =
      (request.headers["x-company-id"] as string | undefined) ??
      (request.params?.companyId as string | undefined) ??
      (request.params?.company_id as string | undefined);

    if (!companyId) return true;

    if (!user.company_id) {
      throw new ForbiddenException("Missing company scope for user");
    }

    if (user.company_id !== companyId) {
      throw new ForbiddenException("company_id mismatch");
    }

    return true;
  }
}
