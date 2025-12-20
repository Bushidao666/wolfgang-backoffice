export type AuditLogInsert = {
  company_id: string;
  actor_user_id?: string | null;
  actor_role?: string | null;
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  request_id?: string | null;
  correlation_id?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown> | null;
};

