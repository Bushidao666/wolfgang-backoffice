import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEmail, IsNumber, IsObject, IsOptional, IsString, IsUUID, MaxLength, Min } from "class-validator";

export class CreateContractDto {
  @ApiProperty({ description: "Contract template id" })
  @IsUUID()
  template_id!: string;

  @ApiProperty({ description: "Deal id (tenant schema <schema>.deals.id)" })
  @IsUUID()
  deal_id!: string;

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

  @ApiPropertyOptional({ description: "Signer email (optional override)" })
  @IsOptional()
  @IsEmail()
  @MaxLength(180)
  signer_email?: string;

  @ApiPropertyOptional({ description: "Signer phone (optional override)" })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  signer_phone?: string;

  @ApiPropertyOptional({ type: Object, description: "Extra data for template rendering (merged with deal/lead fields)" })
  @IsOptional()
  @IsObject()
  contract_data?: Record<string, unknown>;
}

