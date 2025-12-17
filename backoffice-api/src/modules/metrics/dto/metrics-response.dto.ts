import { ApiProperty } from "@nestjs/swagger";

export class MetricsSummaryDto {
  @ApiProperty()
  company_id!: string;

  @ApiProperty()
  from!: string;

  @ApiProperty()
  to!: string;

  @ApiProperty()
  total_leads!: number;

  @ApiProperty({ description: "Leads por lifecycle_stage", type: Object })
  by_stage!: Record<string, number>;

  @ApiProperty()
  qualified_leads!: number;

  @ApiProperty({ description: "qualified_leads / total_leads (0..1)" })
  conversion_rate!: number;

  @ApiProperty({ description: "Tempo médio (segundos) até qualificação" })
  avg_qualification_seconds!: number;
}

export class MetricsConversionDto {
  @ApiProperty()
  company_id!: string;

  @ApiProperty()
  from!: string;

  @ApiProperty()
  to!: string;

  @ApiProperty({ type: Object })
  funnel!: Record<string, number>;
}

export class MetricsByCenturionItemDto {
  @ApiProperty()
  centurion_id!: string;

  @ApiProperty()
  centurion_name!: string;

  @ApiProperty()
  total_leads!: number;

  @ApiProperty()
  qualified_leads!: number;

  @ApiProperty()
  conversion_rate!: number;
}

export class MetricsByCenturionDto {
  @ApiProperty()
  company_id!: string;

  @ApiProperty()
  from!: string;

  @ApiProperty()
  to!: string;

  @ApiProperty({ type: [MetricsByCenturionItemDto] })
  items!: MetricsByCenturionItemDto[];
}

export class MetricsTimelinePointDto {
  @ApiProperty({ description: "YYYY-MM-DD" })
  date!: string;

  @ApiProperty()
  leads_created!: number;

  @ApiProperty()
  leads_qualified!: number;

  @ApiProperty()
  contracts_signed!: number;
}

export class MetricsTimelineDto {
  @ApiProperty()
  company_id!: string;

  @ApiProperty()
  from!: string;

  @ApiProperty()
  to!: string;

  @ApiProperty({ type: [MetricsTimelinePointDto] })
  points!: MetricsTimelinePointDto[];
}

