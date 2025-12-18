import { Injectable } from "@nestjs/common";

import { NotFoundError, ValidationError } from "@wolfgang/contracts";
import { encryptJson } from "@wolfgang/crypto";

import type { CompanyResponseDto } from "../dto/company-response.dto";
import type { CreateCompanyDto } from "../dto/create-company.dto";
import type { ListCompaniesDto } from "../dto/list-companies.dto";
import type { UpdateCompanyDto } from "../dto/update-company.dto";
import { CompaniesRepository } from "../repository/companies.repository";

function slugify(input: string): string {
  const normalized = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  const cleaned = normalized
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+/, "")
    .replace(/_+$/, "");

  const base = cleaned.length ? cleaned : "empresa";
  const prefixed = /^[0-9]/.test(base) ? `c_${base}` : base;
  return prefixed.length > 48 ? prefixed.slice(0, 48) : prefixed;
}

@Injectable()
export class CompaniesService {
  constructor(
    private readonly repo: CompaniesRepository,
  ) {}

  async list(query: ListCompaniesDto) {
    const page = query.page ?? 1;
    const perPage = query.per_page ?? 20;

    const { rows, total } = await this.repo.listCompanies({
      page,
      perPage,
      q: query.q,
      status: query.status,
    });

    const data = await Promise.all(
      rows.map(async (row) => {
        const schemaName = (await this.repo.getPrimarySchemaName(row.id)) ?? row.slug;
        return this.toResponse(row, schemaName);
      }),
    );

    return {
      data,
      page,
      per_page: perPage,
      total,
    };
  }

  async create(dto: CreateCompanyDto, ownerUserId: string): Promise<CompanyResponseDto> {
    if (!dto.name?.trim()) {
      throw new ValidationError("Company name is required");
    }

    const baseSlug = slugify(dto.name);
    const document = dto.document?.trim() || undefined;

    const integrations =
      dto.integrations?.map((i) => {
        if (i.mode === "global" && !i.credential_set_id) {
          throw new ValidationError("credential_set_id is required when mode=global", { provider: i.provider });
        }
        if (i.mode === "custom") {
          if (!i.secrets_override || Object.keys(i.secrets_override).length === 0) {
            throw new ValidationError("secrets_override is required when mode=custom", { provider: i.provider });
          }
        }

        return {
          provider: i.provider,
          mode: i.mode,
          credential_set_id: i.credential_set_id,
          config_override: i.config_override ?? {},
          secrets_override_enc: i.mode === "custom" ? encryptJson(i.secrets_override ?? {}) : "",
        };
      }) ?? undefined;

    const suffix = Date.now().toString(36);
    const maxBase = Math.max(1, 48 - (suffix.length + 1));
    const attempts: string[] = [baseSlug, `${baseSlug.slice(0, maxBase)}_${suffix}`];

    let lastError: unknown = null;
    for (const slug of attempts) {
      try {
        const { company, schema_name } = await this.repo.createCompanyFull({
          name: dto.name.trim(),
          slug,
          document,
          settings: dto.settings ?? {},
          owner_user_id: ownerUserId,
          integrations,
        });
        return this.toResponse(company, schema_name);
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError instanceof Error ? lastError : new ValidationError("Failed to create company", { error: lastError });
  }

  async getById(id: string) {
    const company = await this.repo.getCompanyById(id);
    if (!company) {
      throw new NotFoundError("Company not found");
    }
    const schemaName = (await this.repo.getPrimarySchemaName(company.id)) ?? company.slug;
    return this.toResponse(company, schemaName);
  }

  async update(id: string, dto: UpdateCompanyDto): Promise<CompanyResponseDto> {
    const existing = await this.repo.getCompanyById(id);
    if (!existing) {
      throw new NotFoundError("Company not found");
    }

    const updated = await this.repo.updateCompany(id, {
      name: dto.name?.trim(),
      document: dto.document?.trim(),
      status: dto.status,
      settings: dto.settings,
    });

    const schemaName = (await this.repo.getPrimarySchemaName(updated.id)) ?? updated.slug;
    return this.toResponse(updated, schemaName);
  }

  async archive(id: string): Promise<void> {
    const existing = await this.repo.getCompanyById(id);
    if (!existing) {
      throw new NotFoundError("Company not found");
    }
    await this.repo.archiveCompany(id);
  }

  private toResponse(row: {
    id: string;
    name: string;
    slug: string;
    document: string | null;
    status: "active" | "suspended" | "archived";
    settings: Record<string, unknown>;
    created_at: string;
    updated_at: string;
  }, schemaName: string): CompanyResponseDto {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      document: row.document,
      status: row.status,
      schema_name: schemaName,
      settings: row.settings ?? {},
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}
