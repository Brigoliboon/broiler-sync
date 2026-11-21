import "server-only";

type ErrorLike = {
  message?: string;
  code?: string;
};

export class DbError extends Error {
  readonly code?: string;

  constructor(message: string, cause?: ErrorLike) {
    super(cause?.message ? `${message}: ${cause.message}` : message);
    this.name = "DbError";
    this.code = cause?.code;
  }
}

export function throwIfError(
  result: { data: unknown; error: ErrorLike | null },
  message: string,
): unknown {
  if (result.error) throw new DbError(message, result.error);
  return result.data;
}
