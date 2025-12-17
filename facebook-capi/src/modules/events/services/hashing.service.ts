import { Injectable } from "@nestjs/common";
import { createHash } from "crypto";

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

@Injectable()
export class HashingService {
  hashEmail(email: string): string {
    return sha256(normalizeText(email));
  }

  hashPhone(phone: string): string {
    const digits = phone.replace(/\\D/g, "");
    const normalized = digits.startsWith("55") && digits.length > 11 ? digits.slice(2) : digits;
    return sha256(normalized);
  }

  hashName(name: string): { first?: string; last?: string } {
    const parts = normalizeText(name).split(/\\s+/).filter(Boolean);
    if (!parts.length) return {};
    if (parts.length === 1) return { first: sha256(parts[0]) };
    return { first: sha256(parts[0]), last: sha256(parts.slice(1).join(" ")) };
  }

  hashExternalId(externalId: string): string {
    return sha256(externalId.trim());
  }
}
