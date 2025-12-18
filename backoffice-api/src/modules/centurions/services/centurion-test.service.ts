import { Injectable } from "@nestjs/common";

import { ValidationError } from "@wolfgang/contracts";

import { CenturionsService } from "./centurions.service";
import { normalizeHttpUrl } from "../../../common/utils/url";

@Injectable()
export class CenturionTestService {
  constructor(private readonly centurions: CenturionsService) {}

  async run(companyId: string, centurionId: string, message: string, opts?: { requestId?: string; correlationId?: string }) {
    await this.centurions.get(companyId, centurionId);

    const base = normalizeHttpUrl(process.env.AGENT_RUNTIME_URL ?? "http://localhost:5000").replace(/\/+$/, "");
    const url = `${base}/centurions/${encodeURIComponent(centurionId)}/test`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(opts?.requestId ? { "x-request-id": opts.requestId } : {}),
          ...(opts?.correlationId ? { "x-correlation-id": opts.correlationId } : {}),
          "x-company-id": companyId,
        },
        body: JSON.stringify({ company_id: companyId, message }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new ValidationError("Agent Runtime test request failed", { status: res.status, body: text });
      }

      const json = (await res.json()) as {
        ok?: boolean;
        response?: string;
        model?: string;
        usage?: Record<string, unknown>;
      };

      return {
        ok: true,
        model: json.model,
        response: json.response ?? "",
        usage: json.usage ?? {},
      };
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new ValidationError("Agent Runtime test request timed out");
      }
      throw new ValidationError("Agent Runtime test request failed", { error: err instanceof Error ? err.message : String(err) });
    } finally {
      clearTimeout(timeout);
    }
  }
}
