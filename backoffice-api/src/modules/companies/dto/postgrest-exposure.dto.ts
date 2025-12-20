import { ApiProperty } from "@nestjs/swagger";

export class PostgrestExposureQueueItemDto {
  @ApiProperty()
  schema_name!: string;

  @ApiProperty()
  created_at!: string;
}

export class PostgrestExposureDrainResultDto {
  @ApiProperty()
  drained!: number;

  @ApiProperty()
  remaining!: number;
}

