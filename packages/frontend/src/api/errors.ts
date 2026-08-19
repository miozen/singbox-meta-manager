export class ApiRequestError extends Error {
  status: number;
  code: string;
  details: string;

  constructor(options: { status: number; message: string; code?: string; details?: string }) {
    super(options.message);
    this.name = 'ApiRequestError';
    this.status = options.status;
    this.code = options.code || 'HTTP_ERROR';
    this.details = options.details || options.message;
  }
}

export function getErrorMessage(error: unknown, fallback = '请求失败') {
  if (error instanceof ApiRequestError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function isUnauthorizedError(error: unknown) {
  return error instanceof ApiRequestError && (error.status === 401 || error.status === 403);
}
