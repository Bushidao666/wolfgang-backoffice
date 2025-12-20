import { Injectable } from "@nestjs/common";

import type { IntegrationProvider, ResolvedIntegration } from "@wolfgang/integrations";
import { testAutentiqueIntegration, testEvolutionIntegration, testOpenAIIntegration } from "@wolfgang/integrations";

import { CompanyIntegrationsService } from "./company-integrations.service";
import { IntegrationsResolverService } from "./integrations-resolver.service";

@Injectable()
export class IntegrationValidatorService {
  constructor(
    private readonly resolver: IntegrationsResolverService,
    private readonly companyIntegrations: CompanyIntegrationsService,
  ) {}

  async validateCompanyIntegration(companyId: string, provider: IntegrationProvider): Promise<{ ok: boolean; message?: string }> {
    await this.companyIntegrations.markTesting(companyId, provider).catch(() => undefined);

    const resolved = await this.resolver.resolve(companyId, provider);
    if (!resolved) {
      await this.companyIntegrations.markValidation(companyId, provider, { ok: false, message: "Integration disabled" });
      return { ok: false, message: "Integration disabled" };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      await this.validateResolved(provider, resolved, controller.signal);
      await this.companyIntegrations.markValidation(companyId, provider, { ok: true });
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.companyIntegrations.markValidation(companyId, provider, { ok: false, message });
      return { ok: false, message };
    } finally {
      clearTimeout(timeout);
    }
  }

  private async validateResolved(provider: IntegrationProvider, resolved: ResolvedIntegration, signal: AbortSignal) {
    if (provider === "openai") {
      const apiKey = typeof resolved.secrets["api_key"] === "string" ? String(resolved.secrets["api_key"]) : "";
      const baseUrl = typeof resolved.config["base_url"] === "string" ? String(resolved.config["base_url"]) : undefined;
      return testOpenAIIntegration({ apiKey, baseUrl, signal });
    }

    if (provider === "evolution") {
      const apiKey = typeof resolved.secrets["api_key"] === "string" ? String(resolved.secrets["api_key"]) : "";
      const apiUrl = typeof resolved.config["api_url"] === "string" ? String(resolved.config["api_url"]) : "";
      return testEvolutionIntegration({ apiKey, apiUrl, signal });
    }

    if (provider === "autentique") {
      const apiKey = typeof resolved.secrets["api_key"] === "string" ? String(resolved.secrets["api_key"]) : "";
      const baseUrl = typeof resolved.config["base_url"] === "string" ? String(resolved.config["base_url"]) : undefined;
      return testAutentiqueIntegration({ apiKey, baseUrl, signal });
    }
  }
}

