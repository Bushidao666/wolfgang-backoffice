import { DomainError } from "./domain-error";

export class NotFoundError extends DomainError {
  constructor(message: string, details?: unknown) {
    super({
      code: "NOT_FOUND",
      message,
      statusCode: 404,
      details,
    });
  }
}

