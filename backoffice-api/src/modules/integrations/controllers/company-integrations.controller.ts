import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";

import { Roles } from "../../../common/decorators/roles.decorator";
import { UserRole } from "../../../common/enums/user-role.enum";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../../common/guards/roles.guard";
import { ValidationError } from "@wolfgang/contracts";
import { CompanyIntegrationResponseDto } from "../dto/company-integration-response.dto";
import { UpsertCompanyIntegrationDto } from "../dto/upsert-company-integration.dto";
import { CompanyIntegrationsService } from "../services/company-integrations.service";
import { IntegrationsResolverService } from "../services/integrations-resolver.service";

const providers = ["autentique", "evolution", "openai"] as const;

function ensureProvider(value: string): (typeof providers)[number] {
  if ((providers as readonly string[]).includes(value)) return value as any;
  throw new ValidationError("Invalid provider", { provider: value });
}

@ApiTags("Integrations")
@ApiBearerAuth()
@Controller("integrations/companies/:companyId")
@UseGuards(JwtAuthGuard, RolesGuard)
export class CompanyIntegrationsController {
  constructor(
    private readonly companyIntegrations: CompanyIntegrationsService,
    private readonly resolver: IntegrationsResolverService,
  ) {}

  @Get("bindings")
  @Roles(UserRole.BackofficeAdmin, UserRole.SuperAdmin)
  @ApiOperation({ summary: "List company integration bindings" })
  @ApiParam({ name: "companyId", type: "string", format: "uuid" })
  @ApiOkResponse({ type: [CompanyIntegrationResponseDto] })
  list(@Param("companyId", new ParseUUIDPipe()) companyId: string) {
    return this.companyIntegrations.list(companyId);
  }

  @Post("bindings/:provider")
  @Roles(UserRole.BackofficeAdmin, UserRole.SuperAdmin)
  @ApiOperation({ summary: "Upsert a company integration binding" })
  @ApiParam({ name: "companyId", type: "string", format: "uuid" })
  @ApiParam({ name: "provider", enum: providers })
  @ApiOkResponse({ type: CompanyIntegrationResponseDto })
  upsert(
    @Param("companyId", new ParseUUIDPipe()) companyId: string,
    @Param("provider") provider: string,
    @Body() dto: UpsertCompanyIntegrationDto,
  ) {
    return this.companyIntegrations.upsert(companyId, ensureProvider(provider), dto);
  }

  @Post("test/:provider")
  @Roles(UserRole.BackofficeAdmin, UserRole.SuperAdmin)
  @ApiOperation({ summary: "Test integration resolution/credentials for a company" })
  @ApiParam({ name: "companyId", type: "string", format: "uuid" })
  @ApiParam({ name: "provider", enum: providers })
  async test(
    @Param("companyId", new ParseUUIDPipe()) companyId: string,
    @Param("provider") provider: string,
  ) {
    const p = ensureProvider(provider);
    const resolved = await this.resolver.resolve(companyId, p);
    if (!resolved) {
      await this.companyIntegrations.markValidation(companyId, p, { ok: false, message: "Integration disabled" });
      return { ok: false, message: "Integration disabled" };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      if (p === "openai") {
        const apiKey = typeof resolved.secrets["api_key"] === "string" ? (resolved.secrets["api_key"] as string) : "";
        const base = typeof resolved.config["base_url"] === "string" ? String(resolved.config["base_url"]) : "https://api.openai.com/v1";
        if (!apiKey) throw new Error("Missing api_key");
        const res = await fetch(`${String(base).replace(/\/+$/, "")}/models`, {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}`);
        await this.companyIntegrations.markValidation(companyId, p, { ok: true });
        return { ok: true };
      }

      if (p === "evolution") {
        const apiKey = typeof resolved.secrets["api_key"] === "string" ? (resolved.secrets["api_key"] as string) : "";
        const apiUrl = typeof resolved.config["api_url"] === "string" ? String(resolved.config["api_url"]) : "";
        if (!apiKey || !apiUrl) throw new Error("Missing api_url/api_key");

        const url = `${apiUrl.replace(/\/+$/, "")}/instance/fetchInstances`;
        const res = await fetch(url, {
          method: "GET",
          headers: { apikey: apiKey, authorization: `Bearer ${apiKey}`, "x-api-key": apiKey },
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Evolution HTTP ${res.status}`);
        await this.companyIntegrations.markValidation(companyId, p, { ok: true });
        return { ok: true };
      }

      if (p === "autentique") {
        const apiKey = typeof resolved.secrets["api_key"] === "string" ? (resolved.secrets["api_key"] as string) : "";
        const baseUrl =
          typeof resolved.config["base_url"] === "string" && String(resolved.config["base_url"]).trim()
            ? String(resolved.config["base_url"])
            : "https://api.autentique.com.br";
        if (!apiKey) throw new Error("Missing api_key");

        const base = baseUrl.replace(/\/+$/, "");
        const endpoint = base.endsWith("/graphql") ? base : base.endsWith("/v2") ? `${base}/graphql` : `${base}/v2/graphql`;
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ query: "query{__typename}", variables: {} }),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Autentique HTTP ${res.status}`);
        await this.companyIntegrations.markValidation(companyId, p, { ok: true });
        return { ok: true };
      }

      await this.companyIntegrations.markValidation(companyId, p, { ok: false, message: "Provider not implemented" });
      return { ok: false, message: "Provider not implemented" };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.companyIntegrations.markValidation(companyId, p, { ok: false, message });
      return { ok: false, message };
    } finally {
      clearTimeout(timeout);
    }
  }
}
