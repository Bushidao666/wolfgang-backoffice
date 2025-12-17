import { IsNotEmpty, IsObject, IsOptional, IsString } from "class-validator";

export class CreateCompanyDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  document?: string;

  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;
}

