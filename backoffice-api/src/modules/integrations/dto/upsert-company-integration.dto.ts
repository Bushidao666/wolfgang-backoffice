import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsObject, IsOptional, IsString, ValidateIf } from "class-validator";

const modes = ["global", "custom", "disabled"] as const;
export type IntegrationMode = (typeof modes)[number];

export class UpsertCompanyIntegrationDto {
  @ApiProperty({ enum: modes })
  @IsString()
  @IsIn(modes)
  mode!: IntegrationMode;

  @ApiPropertyOptional({ description: "Required when mode=global" })
  @ValidateIf((dto: UpsertCompanyIntegrationDto) => dto.mode === "global")
  @IsString()
  credential_set_id?: string;

  @ApiPropertyOptional({ description: "Optional override config when mode=custom" })
  @IsOptional()
  @IsObject()
  config_override?: Record<string, unknown>;

  @ApiPropertyOptional({ description: "Secrets payload (encrypted) when mode=custom" })
  @ValidateIf((dto: UpsertCompanyIntegrationDto) => dto.mode === "custom")
  @IsObject()
  secrets_override?: Record<string, unknown>;
}

