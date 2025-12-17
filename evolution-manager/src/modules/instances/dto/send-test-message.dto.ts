import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class SendTestMessageDto {
  @ApiProperty({ description: "Destino (telefone/chat_id/user_id), pode conter prefixos telegram:/instagram:" })
  @IsString()
  @MinLength(1)
  to!: string;

  @ApiProperty({ description: "Texto da mensagem" })
  @IsString()
  @MinLength(1)
  text!: string;
}

