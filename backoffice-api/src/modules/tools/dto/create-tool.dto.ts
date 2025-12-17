import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsIn, IsInt, IsObject, IsOptional, IsString, IsUrl, Matches, Max, Min } from "class-validator";

export class CreateToolDto {
  @ApiProperty({ description: "Nome único da tool (por Centurion)" })
  @IsString()
  @Matches(/^[a-zA-Z][a-zA-Z0-9_\\-]{2,64}$/)
  tool_name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: "Endpoint HTTP para execução" })
  @IsUrl({ require_tld: false })
  endpoint!: string;

  @ApiProperty({ enum: ["GET", "POST", "PUT", "PATCH", "DELETE"], default: "POST" })
  @IsIn(["GET", "POST", "PUT", "PATCH", "DELETE"])
  method!: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  headers?: Record<string, unknown>;

  @ApiPropertyOptional({ description: "bearer|api_key|basic|none" })
  @IsOptional()
  @IsString()
  auth_type?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  auth_config?: Record<string, unknown>;

  @ApiProperty({ type: Object, description: "JSON Schema de input" })
  @IsObject()
  input_schema!: Record<string, unknown>;

  @ApiPropertyOptional({ type: Object, description: "JSON Schema de output (opcional)" })
  @IsOptional()
  @IsObject()
  output_schema?: Record<string, unknown>;

  @ApiPropertyOptional({ default: 10000 })
  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(60000)
  timeout_ms?: number;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  retry_count?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

