import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";

import { UserRole } from "../../../common/enums/user-role.enum";
import { InstancesService } from "../services/instances.service";

type RequestUser = { role?: UserRole; company_id?: string };

@Injectable()
export class InstanceScopeGuard implements CanActivate {
  constructor(private readonly instances: InstancesService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as RequestUser | undefined;
    if (!user) return false;

    if (user.role === UserRole.SuperAdmin || user.role === UserRole.BackofficeAdmin) {
      return true;
    }

    const instanceId = request.params?.id as string | undefined;
    if (!instanceId) return true;

    const instance = await this.instances.getById(instanceId);
    if (!user.company_id) {
      throw new ForbiddenException("Missing company scope for user");
    }
    if (instance.company_id !== user.company_id) {
      throw new ForbiddenException("company_id mismatch");
    }
    return true;
  }
}

