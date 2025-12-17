import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ContractResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  company_id!: string;

  @ApiPropertyOptional()
  lead_id?: string | null;

  @ApiPropertyOptional()
  deal_index_id?: string | null;

  @ApiProperty()
  template_id!: string;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional()
  contract_url?: string | null;

  @ApiPropertyOptional()
  autentique_id?: string | null;

  @ApiProperty()
  contract_data!: Record<string, unknown>;

  @ApiPropertyOptional()
  value?: number | null;

  @ApiPropertyOptional()
  signed_at?: string | null;

  @ApiProperty()
  created_at!: string;

  @ApiProperty()
  updated_at!: string;
}

