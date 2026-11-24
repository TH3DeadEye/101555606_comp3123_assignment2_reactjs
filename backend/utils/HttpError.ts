// Every error the API sends back has the same JSON shape:
//   { "status": "error", "code": "...", "message": "...", "errors": [...] }
// "code" is a stable machine-readable value the frontend can switch on,
// "errors" is only present for validation problems (one entry per field).

export interface FieldError {
  field: string;
  message: string;
}

const defaultCodes: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  429: 'TOO_MANY_REQUESTS',
  500: 'INTERNAL_ERROR',
};

interface HttpErrorOptions {
  code?: string;
  errors?: FieldError[];
}

export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly errors: FieldError[] | undefined;

  constructor(status: number, message: string, options: HttpErrorOptions = {}) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = options.code ?? defaultCodes[status] ?? 'ERROR';
    this.errors = options.errors;
  }
}
