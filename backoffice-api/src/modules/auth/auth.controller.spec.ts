import { Test } from "@nestjs/testing";
import request from "supertest";
import jwt from "jsonwebtoken";

import { AppModule } from "../../app.module";

describe("AuthController", () => {
  it("GET /auth/me without token returns 401", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleRef.createNestApplication();
    await app.init();

    await request(app.getHttpServer()).get("/auth/me").expect(401);

    await app.close();
  });

  it("GET /auth/me with valid token returns user", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleRef.createNestApplication();
    await app.init();

    const token = jwt.sign(
      {
        sub: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0001",
        email: "a@example.com",
        exp: Math.floor(Date.now() / 1000) + 60 * 60,
        app_metadata: { role: "backoffice_admin", company_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" },
        user_metadata: {},
      },
      "dev-secret",
    );

    const res = await request(app.getHttpServer())
      .get("/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body).toHaveProperty("sub", "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0001");
    expect(res.body).toHaveProperty("role", "backoffice_admin");

    await app.close();
  });
});

