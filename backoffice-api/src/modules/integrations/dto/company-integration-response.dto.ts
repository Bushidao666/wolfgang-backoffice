import { ApiProperty } from "@nestjs/swagger";

export class CompanyIntegrationResponseDto {
  @ApiProperty()
  company_id!: string;

  @ApiProperty()
  provider!: string;

  @ApiProperty()
  mode!: string;

  @ApiProperty({ nullable: true })
  credential_set_id!: string | null;

  @ApiProperty()
  config_override!: Record<string, unknown>;

  @ApiProperty()
  has_secrets_override!: boolean;

  @ApiProperty()
  status!: string;

  @ApiProperty({ nullable: true })
  last_validated_at!: string | null;

  @ApiProperty({ nullable: true })
  last_error!: string | null;

  @ApiProperty()
  created_at!: string;

  @ApiProperty()
  updated_at!: string;
}

