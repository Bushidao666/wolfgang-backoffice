import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class LeadTimelineMessageDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ format: "uuid" })
  conversation_id!: string;

  @ApiProperty({ enum: ["inbound", "outbound"] })
  direction!: string;

  @ApiProperty({ enum: ["text", "audio", "image", "video", "document"] })
  content_type!: string;

  @ApiPropertyOptional()
  content?: string | null;

  @ApiPropertyOptional()
  audio_transcription?: string | null;

  @ApiPropertyOptional()
  image_description?: string | null;

  @ApiPropertyOptional()
  channel_message_id?: string | null;

  @ApiPropertyOptional({ type: Object })
  metadata?: Record<string, unknown> | null;

  @ApiProperty()
  created_at!: string;
}

export class LeadTimelineResponseDto {
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

  @ApiProperty({ type: [LeadTimelineMessageDto] })
  messages!: LeadTimelineMessageDto[];
}

