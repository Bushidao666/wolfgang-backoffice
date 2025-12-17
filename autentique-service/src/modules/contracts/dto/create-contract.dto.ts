import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsEmail,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from "class-validator";

export class CreateContractDto {
  @ApiProperty()
  @IsUUID()
  company_id!: string;

  @ApiProperty()
  @IsUUID()
  template_id!: string;

  @ApiPropertyOptional({ description: "Tenant schema name (when using local_deal_id)" })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  schema_name?: string;

  @ApiPropertyOptional({ description: "Tenant deal id (uuid, in tenant schema)" })
  @IsOptional()
  @IsUUID()
  local_deal_id?: string;

  @ApiPropertyOptional({ description: "Deal index id (core.deals_index.id)" })
  @IsOptional()
  @IsUUID()
  deal_index_id?: string;

  @ApiPropertyOptional({ description: "Contract value (defaults from deal if omitted)" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  value?: number;

  @ApiPropertyOptional({ default: "BRL" })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({ description: "Signer name (optional override)" })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  signer_name?: string;

  @ApiPropertyOptional({ description: "Signer email (optional; if omitted uses deal/lead email)" })
  @IsOptional()
  @IsEmail()
  @MaxLength(180)
  signer_email?: string;

  @ApiPropertyOptional({ description: "Signer phone (optional; if omitted uses lead phone)" })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  signer_phone?: string;

  @ApiPropertyOptional({ type: Object, description: "Extra data for template rendering (merged with deal/lead fields)" })
  @IsOptional()
  @IsObject()
  contract_data?: Record<string, unknown>;
}

