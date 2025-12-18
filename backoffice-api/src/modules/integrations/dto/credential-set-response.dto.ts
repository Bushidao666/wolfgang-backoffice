import { ApiProperty } from "@nestjs/swagger";

export class CredentialSetResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  provider!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  is_default!: boolean;

  @ApiProperty()
  config!: Record<string, unknown>;

  @ApiProperty({ description: "True when secrets_enc is non-empty" })
  has_secrets!: boolean;

  @ApiProperty()
  created_at!: string;

  @ApiProperty()
  updated_at!: string;
}

