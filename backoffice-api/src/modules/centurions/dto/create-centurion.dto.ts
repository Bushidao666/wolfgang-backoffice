import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsInt, IsObject, IsOptional, IsString, Matches, Max, Min, ValidateNested } from "class-validator";

import { QualificationRulesDto } from "./qualification-rules.dto";

export class CreateCenturionDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ description: "Slug único por empresa (ex: sdr_principal)" })
  @IsString()
  @Matches(/^[a-z0-9_]{3,64}$/)
  slug!: string;

  @ApiProperty({ description: "System prompt principal" })
  @IsString()
  prompt!: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  personality?: Record<string, unknown>;

  @ApiPropertyOptional({ type: QualificationRulesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => QualificationRulesDto)
  qualification_rules?: QualificationRulesDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  can_send_audio?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  can_send_image?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  can_send_video?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  can_process_audio?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  can_process_image?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  message_chunking_enabled?: boolean;

  @ApiPropertyOptional({ default: 1500 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60000)
  chunk_delay_ms?: number;

  @ApiPropertyOptional({ default: 3000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60000)
  debounce_wait_ms?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ default: 3 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20)
  max_retries?: number;
}

export class UpdateCenturionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9_]{3,64}$/)
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  prompt?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  personality?: Record<string, unknown>;

  @ApiPropertyOptional({ type: QualificationRulesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => QualificationRulesDto)
  qualification_rules?: QualificationRulesDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  can_send_audio?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  can_send_image?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  can_send_video?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  can_process_audio?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  can_process_image?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  message_chunking_enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60000)
  chunk_delay_ms?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60000)
  debounce_wait_ms?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20)
  max_retries?: number;
}
