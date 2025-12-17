import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MinLength } from "class-validator";

export class LoginDto {
  @ApiProperty({ example: "user@empresa.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "senha-forte" })
  @IsString()
  @MinLength(6)
  password!: string;
}

