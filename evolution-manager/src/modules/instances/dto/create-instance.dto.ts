import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString, IsUUID, Matches } from "class-validator";

export enum ChannelType {
  Whatsapp = "whatsapp",
  Instagram = "instagram",
  Telegram = "telegram",
}

export class CreateInstanceDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  company_id!: string;

  @ApiProperty({ enum: ChannelType, default: ChannelType.Whatsapp })
  @IsEnum(ChannelType)
  channel_type!: ChannelType;

  @ApiProperty({ description: "Nome único da instância no provider (Evolution/Meta/TG)" })
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]{3,64}$/)
  instance_name!: string;

  @ApiProperty({ required: false, description: "Token do bot (apenas Telegram)" })
  @IsOptional()
  @IsString()
  telegram_bot_token?: string;

  @ApiProperty({ required: false, description: "Account ID (apenas Instagram)" })
  @IsOptional()
  @IsString()
  instagram_account_id?: string;
}

