import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min, Matches } from "class-validator";

export class CreateFollowupRuleDto {
  @ApiProperty({ description: "Nome único da regra (por Centurion)" })
  @IsString()
  @Matches(/^[a-zA-Z][a-zA-Z0-9_\\-]{2,64}$/)
  name!: string;

  @ApiProperty({ description: "Horas de inatividade para disparar follow-up", default: 24 })
  @IsInt()
  @Min(1)
  @Max(720)
  inactivity_hours!: number;

  @ApiProperty({ description: "Template base da mensagem (será refinado pelo LLM, quando disponível)" })
  @IsString()
  @MaxLength(1000)
  template!: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  max_attempts?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

