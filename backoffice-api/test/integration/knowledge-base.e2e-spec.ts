import request from "supertest";

import { INestApplication } from "@nestjs/common";

import { createBackofficeAdminSession } from "../utils/supabase";
import { createTestApp } from "../utils/test-app";

describe("Knowledge Base (integration)", () => {
  let app: INestApplication;
  let token: string;
  let companyId: string;
  let documentId: string;

  beforeAll(async () => {
    app = await createTestApp();
    const session = await createBackofficeAdminSession();
    token = session.accessToken;

    const company = await request(app.getHttpServer())
      .post("/companies")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "KB Co" })
      .expect(201);
    companyId = company.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it("uploads and deletes documents", async () => {
    const initial = await request(app.getHttpServer())
      .get("/knowledge-base/documents")
      .set("Authorization", `Bearer ${token}`)
      .set("x-company-id", companyId)
      .expect(200);
    expect(initial.body).toEqual([]);

    const uploaded = await request(app.getHttpServer())
      .post("/knowledge-base/documents")
      .set("Authorization", `Bearer ${token}`)
      .set("x-company-id", companyId)
      .field("title", "Notes")
      .attach("file", Buffer.from("hello"), { filename: "notes.txt", contentType: "text/plain" })
      .expect(201);
    documentId = uploaded.body.id;
    expect(uploaded.body).toEqual(expect.objectContaining({ id: expect.any(String), title: "Notes" }));

    const listed = await request(app.getHttpServer())
      .get("/knowledge-base/documents")
      .set("Authorization", `Bearer ${token}`)
      .set("x-company-id", companyId)
      .expect(200);
    expect(listed.body).toEqual(expect.arrayContaining([expect.objectContaining({ id: documentId })]));

    const chunks = await request(app.getHttpServer())
      .get(`/knowledge-base/documents/${documentId}/chunks?limit=10&offset=0`)
      .set("Authorization", `Bearer ${token}`)
      .set("x-company-id", companyId)
      .expect(200);
    expect(chunks.body).toEqual([]);

    await request(app.getHttpServer())
      .delete(`/knowledge-base/documents/${documentId}`)
      .set("Authorization", `Bearer ${token}`)
      .set("x-company-id", companyId)
      .expect(200);
  });
});

