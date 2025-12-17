import request from "supertest";

import { INestApplication } from "@nestjs/common";

import { createTestApp } from "../utils/test-app";

describe("Health (integration)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /health returns ok", async () => {
    const res = await request(app.getHttpServer()).get("/health").expect(200);
    expect(res.body).toMatchObject({ status: "ok" });
  });
});

