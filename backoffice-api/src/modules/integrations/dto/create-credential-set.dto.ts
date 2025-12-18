import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsIn, IsObject, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

const providers = ["autentique", "evolution", "openai"] as const;
export type IntegrationProvider = (typeof providers)[number];

export class CreateCredentialSetDto {
  @ApiProperty({ enum: providers })
  @IsString()
  @IsIn(providers)
  provider!: IntegrationProvider;

  @ApiProperty({ description: "Human-friendly name (ex: 'Default', 'Account A')" })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  is_default?: boolean;

  @ApiPropertyOptional({ description: "Non-secret config (urls, models, flags)" })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @ApiPropertyOptional({ description: "Secrets payload (will be encrypted at rest)" })
  @IsOptional()
  @IsObject()
  secrets?: Record<string, unknown>;
}

