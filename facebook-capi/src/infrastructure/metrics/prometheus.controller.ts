import { Controller, Get, Res } from "@nestjs/common";
import type { Response } from "express";

import { PrometheusService } from "./prometheus.service";

@Controller()
export class PrometheusController {
  constructor(private readonly prometheus: PrometheusService) {}

  @Get("metrics")
  async metrics(@Res() res: Response) {
    res.setHeader("Content-Type", this.prometheus.contentType());
    res.send(await this.prometheus.metrics());
  }
}

