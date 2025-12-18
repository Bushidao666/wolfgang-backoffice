import { ServiceUnavailableException } from "@nestjs/common";

export function requireAppEncryptionKey() {
  const current = (process.env.APP_ENCRYPTION_KEY_CURRENT ?? process.env.APP_ENCRYPTION_KEY ?? "").trim();
  if (!current) {
    throw new ServiceUnavailableException(
      "APP_ENCRYPTION_KEY_CURRENT (ou APP_ENCRYPTION_KEY) é obrigatório para criptografar segredos",
    );
  }
}

