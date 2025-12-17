import { IsIn, IsObject, IsOptional, IsString } from "class-validator";

export class UpdateCompanyDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  document?: string;

  @IsOptional()
  @IsIn(["active", "suspended", "archived"])
  status?: "active" | "suspended" | "archived";

  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;
}

