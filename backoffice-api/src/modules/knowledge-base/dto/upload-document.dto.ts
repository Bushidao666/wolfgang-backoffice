import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class UploadDocumentDto {
  @ApiPropertyOptional({ description: "Título exibido do documento (default: nome do arquivo)" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;
}

