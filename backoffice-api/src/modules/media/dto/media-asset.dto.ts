import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsIn, IsOptional, IsString, IsUUID } from "class-validator";

const mediaTypes = ["audio", "image", "video", "document"] as const;

export class CreateMediaAssetDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: "Tags (JSON array ou CSV)" })
  @IsOptional()
  @IsString()
  tags?: string;

  @ApiPropertyOptional({ enum: mediaTypes, description: "Opcional (inferido do arquivo quando ausente)" })
  @IsOptional()
  @IsString()
  @IsIn(mediaTypes)
  media_type?: (typeof mediaTypes)[number];

  @ApiPropertyOptional({ format: "uuid", description: "Escopo opcional por Centurion" })
  @IsOptional()
  @IsUUID()
  centurion_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdateMediaAssetDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: "Tags (JSON array ou CSV)" })
  @IsOptional()
  @IsString()
  tags?: string;

  @ApiPropertyOptional({ enum: mediaTypes })
  @IsOptional()
  @IsString()
  @IsIn(mediaTypes)
  media_type?: (typeof mediaTypes)[number];

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  centurion_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class MediaAssetResponseDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ format: "uuid" })
  company_id!: string;

  @ApiPropertyOptional({ format: "uuid" })
  centurion_id?: string | null;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty({ enum: mediaTypes })
  media_type!: (typeof mediaTypes)[number];

  @ApiProperty()
  mime_type!: string;

  @ApiProperty()
  bucket!: string;

  @ApiProperty()
  file_path!: string;

  @ApiPropertyOptional()
  file_size_bytes?: number | null;

  @ApiPropertyOptional({ type: [String] })
  tags?: string[];

  @ApiProperty()
  is_active!: boolean;

  @ApiProperty()
  created_at!: string;

  @ApiProperty()
  updated_at!: string;
}

