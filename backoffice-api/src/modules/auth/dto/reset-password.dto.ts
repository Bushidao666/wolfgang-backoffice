import { IsNotEmpty, IsString, MinLength } from "class-validator";

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  access_token!: string;

  @IsString()
  @MinLength(6)
  new_password!: string;
}

