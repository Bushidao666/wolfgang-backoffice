import { Injectable } from "@nestjs/common";
import { Counter, Histogram, collectDefaultMetrics, register } from "prom-client";

type HttpLabels = "method" | "route" | "status_code";
type EventLabels = "type";

function getOrCreateCounter(name: string, help: string, labelNames: string[]) {
  const existing = register.getSingleMetric(name) as Counter<string> | undefined;
  if (existing) return existing;
  return new Counter({ name, help, labelNames });
}

function getOrCreateHistogram(name: string, help: string, labelNames: string[]) {
  const existing = register.getSingleMetric(name) as Histogram<string> | undefined;
  if (existing) return existing;
  return new Histogram({
    name,
    help,
    labelNames,
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  });
}

@Injectable()
export class PrometheusService {
  private readonly enabled = (process.env.PROMETHEUS_ENABLED ?? "true") !== "false";
  private readonly httpRequestsTotal: Counter<HttpLabels>;
  private readonly httpRequestDuration: Histogram<HttpLabels>;
  private readonly eventsTotal: Counter<EventLabels>;

  constructor() {
    if (this.enabled) {
      const hasDefaults = Boolean(register.getSingleMetric("process_cpu_user_seconds_total"));
      if (!hasDefaults) {
        collectDefaultMetrics({ register });
      }
    }

    this.httpRequestsTotal = getOrCreateCounter(
      "http_requests_total",
      "Total de requests HTTP",
      ["method", "route", "status_code"],
    );
    this.httpRequestDuration = getOrCreateHistogram(
      "http_request_duration_seconds",
      "Duração dos requests HTTP em segundos",
      ["method", "route", "status_code"],
    );
    this.eventsTotal = getOrCreateCounter("domain_events_total", "Total de eventos de domínio processados", ["type"]);
  }

  observeHttpRequest(args: { method: string; route: string; statusCode: number; durationMs: number }) {
    if (!this.enabled) return;
    const labels = {
      method: args.method,
      route: args.route,
      status_code: String(args.statusCode),
    } as const;
    this.httpRequestsTotal.inc(labels, 1);
    this.httpRequestDuration.observe(labels, args.durationMs / 1000);
  }

  incDomainEvent(type: string) {
    if (!this.enabled) return;
    this.eventsTotal.inc({ type }, 1);
  }

  async metrics(): Promise<string> {
    return register.metrics();
  }

  contentType(): string {
    return register.contentType;
  }
}

