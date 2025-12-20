import { SetMetadata } from "@nestjs/common";

import { UserRole } from "../../../common/enums/user-role.enum";

export const HOLDING_ROLES_KEY = "holding_roles";

export function HoldingRoles(...roles: UserRole[]) {
  return SetMetadata(HOLDING_ROLES_KEY, roles);
}

