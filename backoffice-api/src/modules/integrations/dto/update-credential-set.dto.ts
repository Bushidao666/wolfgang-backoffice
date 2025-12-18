import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsObject, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class UpdateCredentialSetDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional({ description: "Non-secret config (urls, models, flags)" })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @ApiPropertyOptional({ description: "Secrets payload (will be encrypted at rest)" })
  @IsOptional()
  @IsObject()
  secrets?: Record<string, unknown>;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  is_default?: boolean;
}

