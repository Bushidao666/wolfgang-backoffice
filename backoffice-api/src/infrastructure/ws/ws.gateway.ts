import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";

import { UserRole } from "../../common/enums/user-role.enum";
import { LoggerService } from "../../common/logging/logger.service";

type JwtPayload = {
  sub: string;
  exp: number;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
};

type ConnectedClient = Socket & {
  data: {
    user?: { sub: string; role: UserRole; company_id?: string };
  };
};

function resolveRole(payload: JwtPayload): UserRole {
  const rawRole =
    (payload.app_metadata?.["role"] as string | undefined) ??
    (payload.user_metadata?.["role"] as string | undefined);
  return (Object.values(UserRole) as string[]).includes(rawRole ?? "")
    ? (rawRole as UserRole)
    : UserRole.CrmUser;
}

function resolveCompany(payload: JwtPayload): string | undefined {
  return (
    (payload.app_metadata?.["company_id"] as string | undefined) ??
    (payload.user_metadata?.["company_id"] as string | undefined)
  );
}

@WebSocketGateway({
  cors: {
    origin: (() => {
      const origins = (process.env.CORS_ORIGIN ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      return origins.length > 0 ? origins : true;
    })(),
    credentials: true,
  },
  path: "/ws",
})
@Injectable()
export class WsGateway {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
  ) {}

  private getJwtSecret() {
    return (
      process.env.SUPABASE_JWT_SECRET?.trim() ||
      this.configService.get<string>("SUPABASE_JWT_SECRET")?.trim() ||
      process.env.JWT_SECRET?.trim() ||
      "dev-secret"
    );
  }

  handleConnection(client: ConnectedClient) {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ??
        (client.handshake.headers?.authorization as string | undefined)?.replace(/^Bearer\\s+/i, "");
      if (!token) {
        client.disconnect(true);
        return;
      }

      const decoded = jwt.verify(token, this.getJwtSecret()) as JwtPayload;
      const role = resolveRole(decoded);
      const companyFromToken = resolveCompany(decoded);

      const requestedCompany =
        (client.handshake.auth?.company_id as string | undefined) ??
        (client.handshake.query?.company_id as string | undefined) ??
        (client.handshake.headers?.["x-company-id"] as string | undefined);

      const companyId =
        companyFromToken ??
        (role === UserRole.SuperAdmin || role === UserRole.BackofficeAdmin ? requestedCompany : undefined);

      client.data.user = { sub: decoded.sub, role, company_id: companyId };

      if (companyId) {
        client.join(this.companyRoom(companyId));
      }

      this.logger.log("ws.connected", { request_id: client.id, sub: decoded.sub, role, company_id: companyId });
    } catch (err) {
      this.logger.warn("ws.auth_failed", { request_id: client.id, error: err instanceof Error ? err.message : String(err) });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: ConnectedClient) {
    this.logger.log("ws.disconnected", { request_id: client.id, company_id: client.data.user?.company_id });
  }

  companyRoom(companyId: string) {
    return `company:${companyId}`;
  }

  emitToCompany(companyId: string, event: string, payload: unknown) {
    this.server.to(this.companyRoom(companyId)).emit(event, payload);
  }
}
