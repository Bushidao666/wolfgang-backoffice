import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ToolResponseDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ format: "uuid" })
  company_id!: string;

  @ApiProperty({ format: "uuid" })
  centurion_id!: string;

  @ApiProperty()
  tool_name!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty()
  endpoint!: string;

  @ApiProperty()
  method!: string;

  @ApiProperty({ type: Object })
  headers!: Record<string, unknown>;

  @ApiPropertyOptional()
  auth_type?: string | null;

  @ApiProperty({ type: Object })
  auth_config!: Record<string, unknown>;

  @ApiProperty({ type: Object })
  input_schema!: Record<string, unknown>;

  @ApiPropertyOptional({ type: Object })
  output_schema?: Record<string, unknown> | null;

  @ApiProperty()
  timeout_ms!: number;

  @ApiProperty()
  retry_count!: number;

  @ApiProperty()
  is_active!: boolean;

  @ApiProperty()
  created_at!: string;

  @ApiProperty()
  updated_at!: string;
}

