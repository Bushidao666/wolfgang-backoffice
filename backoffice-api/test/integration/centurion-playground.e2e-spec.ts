import http from "http";

import request from "supertest";

import { INestApplication } from "@nestjs/common";

import { createBackofficeAdminSession } from "../utils/supabase";
import { createTestApp } from "../utils/test-app";

function startAgentRuntimeStub() {
  const calls: Array<{ headers: http.IncomingHttpHeaders; body: any }> = [];

  const server = http.createServer((req, res) => {
    const match = req.url?.match(/^\/centurions\/([^/]+)\/test$/);
    if (req.method !== "POST" || !match) {
      res.statusCode = 404;
      res.end();
      return;
    }

    let raw = "";
    req.on("data", (chunk) => {
      raw += String(chunk);
    });
    req.on("end", () => {
      const body = raw ? JSON.parse(raw) : null;
      calls.push({ headers: req.headers, body });
      res.setHeader("Content-Type", "application/json");
      res.statusCode = 200;
      res.end(JSON.stringify({ ok: true, model: "stub", response: `Echo: ${body?.message ?? ""}`, usage: {} }));
    });
  });

  return new Promise<{
    url: string;
    calls: typeof calls;
    close: () => Promise<void>;
  }>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") throw new Error("Failed to bind agent runtime stub");
      resolve({
        url: `http://127.0.0.1:${addr.port}`,
        calls,
        close: () => new Promise((r) => server.close(() => r())),
      });
    });
  });
}

describe("Centurion playground test (integration)", () => {
  let app: INestApplication;
  let token: string;
  let companyId: string;
  let centurionId: string;
  let stub: Awaited<ReturnType<typeof startAgentRuntimeStub>>;

  beforeAll(async () => {
    stub = await startAgentRuntimeStub();
    process.env.AGENT_RUNTIME_URL = stub.url;

    app = await createTestApp();
    const session = await createBackofficeAdminSession();
    token = session.accessToken;

    const company = await request(app.getHttpServer())
      .post("/companies")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Playground Co" })
      .expect(201);
    companyId = company.body.id;

    const centurion = await request(app.getHttpServer())
      .post("/centurions")
      .set("Authorization", `Bearer ${token}`)
      .set("x-company-id", companyId)
      .send({ name: "SDR", slug: "sdr_playground", prompt: "Você é um SDR." })
      .expect(201);
    centurionId = centurion.body.id;
  });

  afterAll(async () => {
    await app.close();
    await stub.close();
  });

  it("POST /centurions/:id/test proxies to agent-runtime", async () => {
    const correlationId = "cor_test_playground";

    const res = await request(app.getHttpServer())
      .post(`/centurions/${centurionId}/test`)
      .set("Authorization", `Bearer ${token}`)
      .set("x-company-id", companyId)
      .set("x-correlation-id", correlationId)
      .send({ message: "Olá" })
      .expect(201);

    expect(res.body).toEqual(expect.objectContaining({ ok: true, model: "stub", response: "Echo: Olá" }));

    expect(stub.calls.length).toBeGreaterThan(0);
    const last = stub.calls[stub.calls.length - 1];
    expect(last.headers["x-company-id"]).toBe(companyId);
    expect(last.headers["x-correlation-id"]).toBe(correlationId);
    expect(last.body).toEqual(expect.objectContaining({ company_id: companyId, message: "Olá" }));
  });
});
