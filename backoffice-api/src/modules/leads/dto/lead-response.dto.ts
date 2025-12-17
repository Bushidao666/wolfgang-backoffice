import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class LeadResponseDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ format: "uuid" })
  company_id!: string;

  @ApiProperty()
  phone!: string;

  @ApiPropertyOptional()
  name?: string | null;

  @ApiPropertyOptional()
  email?: string | null;

  @ApiPropertyOptional()
  cpf?: string | null;

  @ApiProperty()
  lifecycle_stage!: string;

  @ApiProperty()
  is_qualified!: boolean;

  @ApiPropertyOptional()
  qualification_score?: number | null;

  @ApiPropertyOptional({ type: Object })
  qualification_data?: Record<string, unknown> | null;

  @ApiPropertyOptional({ format: "uuid" })
  centurion_id?: string | null;

  @ApiPropertyOptional({ format: "uuid" })
  pixel_config_id?: string | null;

  @ApiPropertyOptional()
  utm_campaign?: string | null;

  @ApiPropertyOptional()
  utm_source?: string | null;

  @ApiPropertyOptional()
  utm_medium?: string | null;

  @ApiPropertyOptional()
  utm_term?: string | null;

  @ApiPropertyOptional()
  utm_content?: string | null;

  @ApiPropertyOptional({ type: Object })
  fb_data?: Record<string, unknown> | null;

  @ApiPropertyOptional()
  first_contact_at?: string | null;

  @ApiPropertyOptional()
  last_contact_at?: string | null;

  @ApiPropertyOptional()
  qualified_at?: string | null;

  @ApiProperty()
  created_at!: string;

  @ApiProperty()
  updated_at!: string;
}

export class LeadListResponseDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  per_page!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty({ type: [LeadResponseDto] })
  data!: LeadResponseDto[];
}

