import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";

import { UserRole } from "../../../common/enums/user-role.enum";

type RequestUser = { role?: UserRole };

@Injectable()
export class HoldingRoleGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as RequestUser | undefined;

    const role = user?.role;
    if (!role) return false;

    if (role === UserRole.SuperAdmin) return true;
    if (role === UserRole.BackofficeAdmin) return true;
    if (role === UserRole.AiSupervisor) return true;

    throw new ForbiddenException("Holding-only");
  }
}

