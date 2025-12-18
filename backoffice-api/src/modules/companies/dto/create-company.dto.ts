import { Type } from "class-transformer";
import { IsArray, IsIn, IsNotEmpty, IsObject, IsOptional, IsString, ValidateNested } from "class-validator";

const providers = ["autentique", "evolution", "openai"] as const;
const modes = ["global", "custom", "disabled"] as const;

export class CreateCompanyIntegrationDto {
  @IsString()
  @IsIn(providers)
  provider!: (typeof providers)[number];

  @IsString()
  @IsIn(modes)
  mode!: (typeof modes)[number];

  @IsOptional()
  @IsString()
  credential_set_id?: string;

  @IsOptional()
  @IsObject()
  config_override?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  secrets_override?: Record<string, unknown>;
}

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

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCompanyIntegrationDto)
  integrations?: CreateCompanyIntegrationDto[];
}
