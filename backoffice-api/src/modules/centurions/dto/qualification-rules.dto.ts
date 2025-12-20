import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDefined,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from "class-validator";

const criterionTypes = ["field_present", "llm"] as const;

export class QualificationCriterionDto {
  @ApiProperty({ description: "Chave única do critério (ex: budget, intent)", minLength: 1 })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  key!: string;

  @ApiPropertyOptional({ description: "Label opcional para exibição" })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;

  @ApiProperty({ description: "Peso do critério (0-1)" })
  @IsNumber()
  @Min(0)
  @Max(1)
  weight!: number;

  @ApiPropertyOptional({ description: "Se true, este critério é obrigatório" })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiProperty({ enum: criterionTypes, description: "Tipo do critério" })
  @IsString()
  @IsIn(criterionTypes)
  type!: (typeof criterionTypes)[number];

  @ApiPropertyOptional({ description: "Campo (quando type=field_present)" })
  @ValidateIf((o) => o.type === "field_present")
  @IsDefined()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  field?: string;

  @ApiPropertyOptional({ description: "Prompt custom (quando type=llm)" })
  @ValidateIf((o) => o.type === "llm")
  @IsDefined()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  prompt?: string;
}

export class QualificationRulesDto {
  @ApiPropertyOptional({ description: "Threshold global (0-1)" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  threshold?: number;

  @ApiPropertyOptional({ type: [String], description: "Compat: campos obrigatórios antigos" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(64)
  required_fields?: string[];

  @ApiPropertyOptional({ type: [QualificationCriterionDto], description: "Critérios ponderados (vNext)" })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(32)
  @ArrayUnique((c: QualificationCriterionDto) => c.key)
  @ValidateNested({ each: true })
  @Type(() => QualificationCriterionDto)
  criteria?: QualificationCriterionDto[];

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
