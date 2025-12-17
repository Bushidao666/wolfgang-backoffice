import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";

import { ValidationError } from "@wolfgang/contracts";

import { SupabaseService } from "../../../infrastructure/supabase/supabase.service";
import type { CreateContractTemplateDto } from "../dto/create-contract-template.dto";

type UploadedFile = {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
};

function safeFileName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
  return cleaned || "template";
}

function parseVariables(raw?: string) {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("variables must be an array");
    return parsed;
  } catch (err) {
    throw new ValidationError("Invalid variables JSON", { error: String(err) });
  }
}

function inferFileType(file: UploadedFile): string {
  const lower = file.originalname.toLowerCase();
  if (file.mimetype === "application/pdf" || lower.endsWith(".pdf")) return "pdf";
  if (
    file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lower.endsWith(".docx")
  )
    return "docx";
  if (file.mimetype.startsWith("text/") || lower.endsWith(".txt")) return "txt";
  return file.mimetype || "application/octet-stream";
}

@Injectable()
export class ContractTemplatesService {
  private readonly bucket = "contract_templates";

  constructor(private readonly supabase: SupabaseService) {}

  private admin() {
    return this.supabase.getAdminClient();
  }

  async list(companyId: string) {
    const { data: globals, error: globalsError } = await this.admin()
      .schema("core")
      .from("contract_templates")
      .select("*")
      .is("company_id", null)
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    if (globalsError) throw new ValidationError("Failed to list global templates", { error: globalsError });

    const { data: locals, error: localsError } = await this.admin()
      .schema("core")
      .from("contract_templates")
      .select("*")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    if (localsError) throw new ValidationError("Failed to list company templates", { error: localsError });

    return [...(locals ?? []), ...(globals ?? [])];
  }

  async create(companyId: string, dto: CreateContractTemplateDto, file: UploadedFile | undefined) {
    if (!file?.buffer?.length) throw new ValidationError("Missing template file");

    const templateId = randomUUID();
    const filename = safeFileName(file.originalname);
    const filePath = `${companyId}/${templateId}/${filename}`;

    const { error: uploadError } = await this.admin().storage.from(this.bucket).upload(filePath, file.buffer, {
      contentType: file.mimetype || "application/octet-stream",
      upsert: false,
    });
    if (uploadError) throw new ValidationError("Failed to upload template file", { error: uploadError });

    const variables = parseVariables(dto.variables);
    const fileType = inferFileType(file);

    const { data, error } = await this.admin()
      .schema("core")
      .from("contract_templates")
      .insert({
        id: templateId,
        company_id: companyId,
        name: dto.name,
        description: dto.description ?? null,
        variables,
        category: dto.category ?? "general",
        is_active: true,
        file_path: filePath,
        file_type: fileType,
      })
      .select("*")
      .single();

    if (error) {
      await this.admin().storage.from(this.bucket).remove([filePath]).catch(() => undefined);
      throw new ValidationError("Failed to create template", { error });
    }

    return data;
  }

  async update(companyId: string, templateId: string, dto: CreateContractTemplateDto, file?: UploadedFile) {
    const variables = parseVariables(dto.variables);

    let filePath: string | undefined;
    let fileType: string | undefined;
    if (file?.buffer?.length) {
      const filename = safeFileName(file.originalname);
      filePath = `${companyId}/${templateId}/${filename}`;

      const { error: uploadError } = await this.admin().storage.from(this.bucket).upload(filePath, file.buffer, {
        contentType: file.mimetype || "application/octet-stream",
        upsert: true,
      });
      if (uploadError) throw new ValidationError("Failed to upload template file", { error: uploadError });
      fileType = inferFileType(file);
    }

    const { data, error } = await this.admin()
      .schema("core")
      .from("contract_templates")
      .update({
        name: dto.name,
        description: dto.description ?? null,
        variables,
        category: dto.category ?? "general",
        file_path: filePath,
        file_type: fileType,
      })
      .eq("id", templateId)
      .eq("company_id", companyId)
      .select("*")
      .maybeSingle();

    if (error) throw new ValidationError("Failed to update template", { error });
    if (!data) throw new ValidationError("Template not found");
    return data;
  }

  async delete(companyId: string, templateId: string) {
    const { data, error: fetchError } = await this.admin()
      .schema("core")
      .from("contract_templates")
      .select("file_path")
      .eq("id", templateId)
      .eq("company_id", companyId)
      .maybeSingle();
    if (fetchError) throw new ValidationError("Failed to load template", { error: fetchError });

    if (data?.file_path) {
      await this.admin().storage.from(this.bucket).remove([data.file_path]).catch(() => undefined);
    }

    const { error } = await this.admin()
      .schema("core")
      .from("contract_templates")
      .delete()
      .eq("id", templateId)
      .eq("company_id", companyId);
    if (error) throw new ValidationError("Failed to delete template", { error });
  }
}

