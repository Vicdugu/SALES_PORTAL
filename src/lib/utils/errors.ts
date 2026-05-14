export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, message, 'UNAUTHORIZED');
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation Error') {
    super(400, message, 'VALIDATION_ERROR');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, message, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(404, message, 'NOT_FOUND');
  }
}

/**
 * Determines whether an error is a known Prisma error that should NOT be
 * surfaced verbatim to the client (it may contain schema/column/table names).
 */
function isPrismaError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const name = (error as { name?: string }).name ?? '';
  return (
    name.startsWith('Prisma') ||
    'code' in error && typeof (error as { code: unknown }).code === 'string' &&
    (error as { code: string }).code.startsWith('P')
  );
}

/**
 * Returns a safe, client-facing error message.
 * - App errors (ValidationError, UnauthorizedError, etc.): return their message.
 * - Prisma / DB errors: return a generic message to avoid leaking schema details.
 * - Everything else: return a generic message.
 */
export function sanitizeError(error: unknown): { message: string; code: string; statusCode: number } {
  if (error instanceof AppError) {
    return { message: error.message, code: error.code ?? 'APP_ERROR', statusCode: error.statusCode };
  }
  if (isPrismaError(error)) {
    console.error('[DB_ERROR]', error);
    return { message: 'A database error occurred', code: 'DB_ERROR', statusCode: 500 };
  }
  console.error('[INTERNAL_ERROR]', error);
  return { message: 'An unexpected error occurred', code: 'INTERNAL_ERROR', statusCode: 500 };
}
