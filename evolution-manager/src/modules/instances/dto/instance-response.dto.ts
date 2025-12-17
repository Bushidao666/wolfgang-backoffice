import { ApiProperty } from "@nestjs/swagger";

import { ChannelType } from "./create-instance.dto";

export type ChannelInstanceState = "connected" | "disconnected" | "qr_ready" | "error";

export class InstanceResponseDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ format: "uuid" })
  company_id!: string;

  @ApiProperty({ enum: ChannelType })
  channel_type!: ChannelType;

  @ApiProperty()
  instance_name!: string;

  @ApiProperty({ enum: ["connected", "disconnected", "qr_ready", "error"] })
  state!: ChannelInstanceState;

  @ApiProperty({ required: false })
  phone_number?: string | null;

  @ApiProperty({ required: false })
  profile_name?: string | null;

  @ApiProperty({ required: false })
  last_connected_at?: string | null;

  @ApiProperty({ required: false })
  last_disconnected_at?: string | null;

  @ApiProperty({ required: false })
  error_message?: string | null;
}

export class QrCodeResponseDto {
  @ApiProperty({ description: "QR code em base64 (ou data URL)", nullable: true })
  qrcode!: string | null;
}

