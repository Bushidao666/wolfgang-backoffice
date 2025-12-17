import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class DealResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  company_id!: string;

  @ApiProperty()
  core_lead_id!: string;

  @ApiPropertyOptional()
  deal_full_name?: string | null;

  @ApiPropertyOptional()
  deal_phone?: string | null;

  @ApiPropertyOptional()
  deal_email?: string | null;

  @ApiPropertyOptional()
  deal_status?: string | null;

  @ApiPropertyOptional()
  deal_servico?: string | null;

  @ApiPropertyOptional()
  deal_valor_contrato?: number | null;

  @ApiProperty()
  created_at!: string;

  @ApiProperty()
  updated_at!: string;
}

