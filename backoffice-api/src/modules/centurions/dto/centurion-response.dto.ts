import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CenturionResponseDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ format: "uuid" })
  company_id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  prompt!: string;

  @ApiPropertyOptional({ type: Object })
  personality?: Record<string, unknown> | null;

  @ApiPropertyOptional({ type: Object })
  qualification_rules?: Record<string, unknown> | null;

  @ApiPropertyOptional()
  can_send_audio?: boolean;

  @ApiPropertyOptional()
  can_send_image?: boolean;

  @ApiPropertyOptional()
  can_send_video?: boolean;

  @ApiPropertyOptional()
  can_process_audio?: boolean;

  @ApiPropertyOptional()
  can_process_image?: boolean;

  @ApiPropertyOptional()
  message_chunking_enabled?: boolean;

  @ApiPropertyOptional()
  chunk_delay_ms?: number;

  @ApiPropertyOptional()
  debounce_wait_ms?: number;

  @ApiProperty()
  is_active!: boolean;

  @ApiPropertyOptional()
  max_retries?: number | null;

  @ApiPropertyOptional()
  total_conversations?: number | null;

  @ApiPropertyOptional()
  total_qualified?: number | null;

  @ApiProperty()
  created_at!: string;

  @ApiProperty()
  updated_at!: string;
}

