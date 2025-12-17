import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreatePixelDto {
  @ApiProperty({ description: "Meta Pixel ID (digits)" })
  @IsString()
  @MinLength(5)
  @MaxLength(30)
  pixel_id!: string;

  @ApiProperty({ description: "Meta access token (will be stored encrypted)" })
  @IsString()
  @MinLength(10)
  meta_access_token!: string;

  @ApiPropertyOptional({ description: "Optional test event code (Meta Events Manager > Test events)" })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  meta_test_event_code?: string;

  @ApiPropertyOptional({ description: "Optional domain/source URL (ex: https://example.com)" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  domain?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

