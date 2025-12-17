import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUUID } from "class-validator";

export class ContractsQueryDto {
  @ApiProperty()
  @IsUUID()
  company_id!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  deal_index_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  lead_id?: string;
}

