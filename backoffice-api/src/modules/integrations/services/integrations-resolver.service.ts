import { Injectable } from "@nestjs/common";

import { ValidationError } from "@wolfgang/contracts";
import type { IntegrationProvider, ResolvedIntegration } from "@wolfgang/integrations";
import { resolveCompanyIntegration } from "@wolfgang/integrations";

import { SupabaseService } from "../../../infrastructure/supabase/supabase.service";

@Injectable()
export class IntegrationsResolverService {
  constructor(private readonly supabase: SupabaseService) {}

  private admin() {
    return this.supabase.getAdminClient();
  }

  async resolve(companyId: string, provider: IntegrationProvider): Promise<ResolvedIntegration | null> {
    try {
      return await resolveCompanyIntegration({ supabaseAdmin: this.admin(), companyId, provider });
    } catch (error) {
      throw new ValidationError("Failed to resolve integration", { provider, companyId, error });
    }
  }
}

