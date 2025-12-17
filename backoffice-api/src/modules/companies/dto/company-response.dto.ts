export type CompanyResponseDto = {
  id: string;
  name: string;
  slug: string;
  document: string | null;
  status: "active" | "suspended" | "archived";
  schema_name: string;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

