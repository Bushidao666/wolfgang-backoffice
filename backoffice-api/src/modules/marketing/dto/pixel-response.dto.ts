import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class PixelResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  company_id!: string;

  @ApiProperty()
  pixel_id!: string;

  @ApiPropertyOptional()
  meta_test_event_code?: string | null;

  @ApiPropertyOptional()
  domain?: string | null;

  @ApiProperty()
  is_active!: boolean;

  @ApiProperty({ description: "Whether an access token is configured (token itself is never returned)" })
  has_access_token!: boolean;

  @ApiProperty()
  created_at!: string;

  @ApiProperty()
  updated_at!: string;
}

