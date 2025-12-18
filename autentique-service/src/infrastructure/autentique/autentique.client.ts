import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "crypto";

import type { AutentiqueConfig } from "../../config/autentique.config";

type GraphQlResponse<T> = { data?: T; errors?: Array<{ message: string; extensions?: unknown }> };

type CreateDocumentInput = {
  name: string;
  message?: string;
};

export type AutentiqueCredentials = {
  api_key: string;
  base_url?: string;
};

export type AutentiqueSignerInput = {
  email?: string;
  name?: string;
  phone?: string;
  delivery_method?: "DELIVERY_METHOD_EMAIL" | "DELIVERY_METHOD_WHATSAPP" | "DELIVERY_METHOD_SMS";
  action?: "SIGN" | "ACKNOWLEDGE";
};

export type CreateDocumentResult = {
  document_id: string;
  signature_public_id?: string;
  signature_short_link?: string;
  raw?: unknown;
};

@Injectable()
export class AutentiqueClient {
  private readonly defaultBaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    const cfg = this.configService.get<AutentiqueConfig>("autentique") ?? {
      apiKey: process.env.AUTENTIQUE_API_KEY ?? "",
      baseUrl: process.env.AUTENTIQUE_BASE_URL ?? "https://api.autentique.com.br",
      webhookSecret: process.env.AUTENTIQUE_WEBHOOK_SECRET ?? "",
    };
    this.defaultBaseUrl = cfg.baseUrl ?? "https://api.autentique.com.br";
  }

  private endpoint(baseUrl: string): string {
    const base = baseUrl.replace(/\/$/, "");
    if (base.endsWith("/graphql")) return base;
    if (base.endsWith("/v2")) return `${base}/graphql`;
    return `${base}/v2/graphql`;
  }

  private authHeader(apiKey: string): string {
    if (!apiKey) {
      throw new Error("AUTENTIQUE_API_KEY is required (resolved credentials missing api_key)");
    }
    return `Bearer ${apiKey}`;
  }

  async createDocument(
    credentials: AutentiqueCredentials,
    args: {
      document: CreateDocumentInput;
      signers: AutentiqueSignerInput[];
      file: { filename: string; contentType: string; buffer: Buffer };
      organization_id?: number;
      folder_id?: string;
    },
  ): Promise<CreateDocumentResult> {
    const baseUrl = (credentials.base_url ?? this.defaultBaseUrl).trim() || this.defaultBaseUrl;
    const apiKey = credentials.api_key?.trim() ?? "";
    const query = `mutation CreateDocumentMutation(\n  $document: DocumentInput!,\n  $signers: [SignerInput!]!,\n  $file: Upload!\n) {\n  createDocument(\n    document: $document,\n    signers: $signers,\n    file: $file${args.organization_id ? `,\n    organization_id: ${args.organization_id}` : ""}${
      args.folder_id ? `,\n    folder_id: \"${args.folder_id}\"` : ""
    }\n  ) {\n    id\n    name\n    signatures {\n      public_id\n      name\n      email\n      link { short_link }\n    }\n  }\n}`;

    const operations = {
      query,
      variables: {
        document: args.document,
        signers: args.signers,
        file: null,
      },
    };

    const map = { 0: ["variables.file"] };
    const form = new FormData();
    form.append("operations", JSON.stringify(operations));
    form.append("map", JSON.stringify(map));
    form.append("0", new Blob([new Uint8Array(args.file.buffer)], { type: args.file.contentType }), args.file.filename);

    const res = await fetch(this.endpoint(baseUrl), {
      method: "POST",
      headers: { Authorization: this.authHeader(apiKey) },
      body: form,
    });

    const json = (await res.json().catch(() => undefined)) as GraphQlResponse<any> | undefined;
    if (!res.ok || !json || json.errors?.length) {
      const message = json?.errors?.map((e) => e.message).join("; ") || `Autentique createDocument failed (${res.status})`;
      throw new Error(message);
    }

    const created = json.data?.createDocument;
    const documentId = String(created?.id ?? "");
    if (!documentId) throw new Error("Autentique createDocument did not return id");

    const firstSignature = Array.isArray(created?.signatures) ? created.signatures[0] : undefined;
    const signaturePublicId = firstSignature?.public_id ? String(firstSignature.public_id) : undefined;
    const signatureShortLink = firstSignature?.link?.short_link ? String(firstSignature.link.short_link) : undefined;

    return {
      document_id: documentId,
      signature_public_id: signaturePublicId,
      signature_short_link: signatureShortLink,
      raw: json.data,
    };
  }

  async createSignatureLink(credentials: AutentiqueCredentials, publicId: string): Promise<string> {
    const query = `mutation{\\n  createLinkToSignature(public_id: \\\"${publicId}\\\"){\\n    short_link\\n  }\\n}`;
    const json = await this.graphql<{ createLinkToSignature: { short_link: string } }>(credentials, query, {});
    const link = json.createLinkToSignature?.short_link;
    if (!link) throw new Error("Autentique createLinkToSignature returned empty link");
    return link;
  }

  async getDocument(credentials: AutentiqueCredentials, documentId: string): Promise<unknown> {
    const query = `query{\\n  document(id: \\\"${documentId}\\\"){\\n    id\\n    name\\n    created_at\\n    files { original signed pades }\\n    signatures {\\n      public_id\\n      name\\n      email\\n      created_at\\n      action { name }\\n      link { short_link }\\n      signed { created_at }\\n      rejected { created_at }\\n    }\\n  }\\n}`;
    const json = await this.graphql<{ document: unknown }>(credentials, query, {});
    return (json as any).document;
  }

  async listSigners(credentials: AutentiqueCredentials, documentId: string): Promise<unknown[]> {
    const doc = (await this.getDocument(credentials, documentId)) as any;
    const signatures = doc?.signatures;
    return Array.isArray(signatures) ? signatures : [];
  }

  async downloadSignedFile(credentials: AutentiqueCredentials, signedUrl: string): Promise<Buffer> {
    const apiKey = credentials.api_key?.trim() ?? "";
    const res = await fetch(signedUrl, {
      method: "GET",
      headers: { Authorization: this.authHeader(apiKey) },
    });
    if (!res.ok) throw new Error(`Failed to download signed file (${res.status})`);
    const arr = await res.arrayBuffer();
    return Buffer.from(arr);
  }

  private async graphql<T>(
    credentials: AutentiqueCredentials,
    query: string,
    variables: Record<string, unknown>,
  ): Promise<T> {
    const baseUrl = (credentials.base_url ?? this.defaultBaseUrl).trim() || this.defaultBaseUrl;
    const apiKey = credentials.api_key?.trim() ?? "";
    const res = await fetch(this.endpoint(baseUrl), {
      method: "POST",
      headers: {
        Authorization: this.authHeader(apiKey),
        "Content-Type": "application/json",
        "X-Request-Id": randomUUID(),
      },
      body: JSON.stringify({ query, variables }),
    });

    const json = (await res.json().catch(() => undefined)) as GraphQlResponse<T> | undefined;
    if (!res.ok || !json || json.errors?.length) {
      const message = json?.errors?.map((e) => e.message).join("; ") || `Autentique graphql failed (${res.status})`;
      throw new Error(message);
    }
    return json.data as T;
  }
}
