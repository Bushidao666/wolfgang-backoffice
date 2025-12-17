import { ApiProperty } from "@nestjs/swagger";

export class AuthResponseDto {
  @ApiProperty()
  access_token!: string;

  @ApiProperty()
  refresh_token!: string;

  @ApiProperty()
  expires_in!: number;

  @ApiProperty()
  token_type!: string;

  @ApiProperty({ required: false })
  user?: unknown;
}

