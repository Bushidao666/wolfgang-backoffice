import { IsArray, IsEmail, IsIn, IsOptional, IsString } from "class-validator";

export const COMPANY_USER_ROLES = [
  "owner",
  "admin",
  "operator",
  "viewer",
  "sales_rep",
  "super_admin",
  "backoffice_admin",
] as const;

export type CompanyUserRole = (typeof COMPANY_USER_ROLES)[number];

export class AddUserDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsIn(COMPANY_USER_ROLES)
  role?: CompanyUserRole;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopes?: string[];
}

