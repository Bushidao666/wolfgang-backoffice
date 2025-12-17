import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class UpdatePixelDto {
  @ApiPropertyOptional({ description: "Meta Pixel ID (digits)" })
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(30)
  pixel_id?: string;

  @ApiPropertyOptional({ description: "Meta access token (will be stored encrypted)" })
  @IsOptional()
  @IsString()
  @MinLength(10)
  meta_access_token?: string;

  @ApiPropertyOptional({ description: "Optional test event code" })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  meta_test_event_code?: string;

  @ApiPropertyOptional({ description: "Optional domain/source URL" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  domain?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

