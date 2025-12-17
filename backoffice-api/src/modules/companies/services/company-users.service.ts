import { Injectable } from "@nestjs/common";

import { NotFoundError, ValidationError } from "@wolfgang/contracts";

import { CompaniesRepository } from "../repository/companies.repository";
import type { AddUserDto, CompanyUserRole } from "../dto/add-user.dto";
import { SupabaseService } from "../../../infrastructure/supabase/supabase.service";

@Injectable()
export class CompanyUsersService {
  constructor(
    private readonly repo: CompaniesRepository,
    private readonly supabase: SupabaseService,
  ) {}

  async list(companyId: string) {
    const company = await this.repo.getCompanyById(companyId);
    if (!company) {
      throw new NotFoundError("Company not found");
    }

    const links = await this.repo.listCompanyUsers(companyId);
    const admin = this.supabase.getAdminClient();

    const users = await Promise.all(
      links.map(async (link) => {
        const { data, error } = await admin.auth.admin.getUserById(link.user_id);
        if (error) {
          return {
            user_id: link.user_id,
            role: link.role,
            scopes: link.scopes,
            email: null,
          };
        }
        return {
          user_id: link.user_id,
          role: link.role,
          scopes: link.scopes,
          email: data.user?.email ?? null,
        };
      }),
    );

    return { company_id: companyId, users };
  }

  async add(companyId: string, dto: AddUserDto) {
    const company = await this.repo.getCompanyById(companyId);
    if (!company) {
      throw new NotFoundError("Company not found");
    }

    const admin = this.supabase.getAdminClient();
    const userId = await this.findOrInviteUserIdByEmail(dto.email.trim().toLowerCase());

    const role: CompanyUserRole = dto.role ?? "viewer";
    const scopes = Array.isArray(dto.scopes) ? dto.scopes : [];

    const link = await this.repo.addCompanyUser({
      companyId,
      userId,
      role,
      scopes,
    });

    const { data } = await admin.auth.admin.getUserById(userId);
    return {
      id: link.id,
      company_id: link.company_id,
      user_id: link.user_id,
      role: link.role,
      scopes: link.scopes,
      email: data.user?.email ?? dto.email,
    };
  }

  async remove(companyId: string, userId: string): Promise<void> {
    const company = await this.repo.getCompanyById(companyId);
    if (!company) {
      throw new NotFoundError("Company not found");
    }
    await this.repo.removeCompanyUser(companyId, userId);
  }

  private async findOrInviteUserIdByEmail(email: string): Promise<string> {
    const admin = this.supabase.getAdminClient();

    // GoTrue admin API não possui filtro direto por email no client; para bases pequenas, paginamos.
    let page = 1;
    const perPage = 200;

    for (let i = 0; i < 10; i += 1) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
      if (error) {
        throw new ValidationError("Failed to list auth users", { error });
      }

      const found = data.users.find((u) => (u.email ?? "").toLowerCase() === email);
      if (found) return found.id;

      if (data.users.length < perPage) break;
      page += 1;
    }

    const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email);
    if (inviteError) {
      throw new ValidationError("Failed to invite user by email", { error: inviteError });
    }
    if (!inviteData.user?.id) {
      throw new ValidationError("Invite did not return a user id");
    }
    return inviteData.user.id;
  }
}

