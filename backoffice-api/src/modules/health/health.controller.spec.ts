import { Test } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "../../app.module";

describe("HealthController", () => {
  it("GET /health returns 200", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleRef.createNestApplication();
    await app.init();

    const res = await request(app.getHttpServer()).get("/health").expect(200);
    expect(res.body).toHaveProperty("status", "ok");

    await app.close();
  });
});

