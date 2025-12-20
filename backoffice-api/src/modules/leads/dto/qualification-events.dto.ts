import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class LeadQualificationEventDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ format: "uuid" })
  company_id!: string;

  @ApiProperty({ format: "uuid" })
  lead_id!: string;

  @ApiPropertyOptional({ format: "uuid" })
  conversation_id?: string | null;

  @ApiPropertyOptional({ format: "uuid" })
  centurion_id?: string | null;

  @ApiPropertyOptional()
  correlation_id?: string | null;

  @ApiPropertyOptional()
  causation_id?: string | null;

  @ApiProperty()
  rules_hash!: string;

  @ApiPropertyOptional({ type: Object })
  rules?: Record<string, unknown> | null;

  @ApiProperty()
  threshold!: number;

  @ApiProperty()
  score!: number;

  @ApiProperty()
  is_qualified!: boolean;

  @ApiProperty()
  required_met!: boolean;

  @ApiPropertyOptional({ type: Object })
  criteria?: unknown;

  @ApiPropertyOptional({ type: Object })
  extracted?: Record<string, unknown> | null;

  @ApiPropertyOptional()
  summary?: string | null;

  @ApiProperty()
  created_at!: string;
}

export class LeadQualificationEventsResponseDto {
  @ApiProperty({ format: "uuid" })
  lead_id!: string;

  @ApiProperty({ format: "uuid" })
  company_id!: string;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  offset!: number;

  @ApiProperty({ type: [LeadQualificationEventDto] })
  events!: LeadQualificationEventDto[];
}

