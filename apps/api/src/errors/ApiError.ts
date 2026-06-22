import type { ZodError } from "zod";

export type ApiFieldError = {
  path: string;
  message: string;
};

export type ApiErrorResponse = {
  error: {
    code: string;
    message: string;
    details?: unknown;
    fieldErrors?: ApiFieldError[];
  };
};

type ApiErrorOptions = {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
  fieldErrors?: ApiFieldError[] | undefined;
};

export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;
  readonly fieldErrors?: ApiFieldError[];

  constructor(options: ApiErrorOptions) {
    super(options.message);
    this.name = "ApiError";
    this.statusCode = options.statusCode;
    this.code = options.code;

    if (options.details !== undefined) {
      this.details = options.details;
    }

    if (options.fieldErrors !== undefined) {
      this.fieldErrors = options.fieldErrors;
    }
  }
}

export function createApiErrorResponse(error: {
  code: string;
  message: string;
  details?: unknown;
  fieldErrors?: ApiFieldError[] | undefined;
}): ApiErrorResponse {
  return {
    error: {
      code: error.code,
      message: error.message,
      ...(error.details !== undefined ? { details: error.details } : {}),
      ...(error.fieldErrors !== undefined && error.fieldErrors.length > 0
        ? { fieldErrors: error.fieldErrors }
        : {})
    }
  };
}

export function zodIssuesToFieldErrors(error: ZodError): ApiFieldError[] {
  return error.issues.map((issue) => ({
    path:
      issue.path.length > 0 ? issue.path.map(String).join(".") : "requestBody",
    message: issue.message
  }));
}
