import { createParamDecorator, type ExecutionContext } from "@nestjs/common";

export type AuthenticatedUser = {
  sub: string;
  email?: string;
  role: string;
  company_id?: string;
  permissions: string[];
  schema_name?: string;
  raw: Record<string, unknown>;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    return request.user as AuthenticatedUser | undefined;
  },
);

