import { Injectable } from "@nestjs/common";

import { ValidationError } from "@wolfgang/contracts";

import { SupabaseService } from "../../../infrastructure/supabase/supabase.service";

@Injectable()
export class SchemaProvisionerService {
  constructor(private readonly supabase: SupabaseService) {}

  async provisionSchema(slug: string): Promise<string> {
    const client = this.supabase.getAdminClient();

    const { data, error } = await client.schema("core").rpc("fn_provision_company_schema", { p_slug: slug });

    if (error) {
      throw new ValidationError("Failed to provision company schema", { error });
    }

    if (!data) {
      throw new ValidationError("Provision function did not return schema name");
    }

    return data as unknown as string;
  }
}
