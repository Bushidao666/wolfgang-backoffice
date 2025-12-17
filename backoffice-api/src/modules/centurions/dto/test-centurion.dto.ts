import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class TestCenturionDto {
  @ApiProperty({ description: "Mensagem do usuário" })
  @IsString()
  @MinLength(1)
  message!: string;
}

