import { DomainError } from "./domain-error";

export class ValidationError extends DomainError {
  constructor(message: string, details?: unknown) {
    super({
      code: "VALIDATION_ERROR",
      message,
      statusCode: 400,
      details,
    });
  }
}

