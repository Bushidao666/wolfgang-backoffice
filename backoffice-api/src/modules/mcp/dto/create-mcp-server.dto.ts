import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsObject, IsOptional, IsString, IsUrl, Matches } from "class-validator";

export class CreateMcpServerDto {
  @ApiProperty({ description: "Nome amigável do server (ex: crm-tools)" })
  @IsString()
  @Matches(/^[a-zA-Z][a-zA-Z0-9_\\-]{2,64}$/)
  name!: string;

  @ApiProperty({ description: "Base URL do MCP server (SSE/HTTP)", example: "http://localhost:8787" })
  @IsUrl({ require_tld: false })
  server_url!: string;

  @ApiPropertyOptional({ description: "bearer|api_key|basic|none" })
  @IsOptional()
  @IsString()
  auth_type?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  auth_config?: Record<string, unknown>;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

