/**
 * Result Type Pattern — Railway-oriented programming
 * Enables clear error handling and chaining
 * No throwing, pure functional error propagation
 */

export type Result<T, E = Error> =
  | { ok: true; data: T }
  | { ok: false; error: E };

export class Ok<T> {
  constructor(readonly data: T) {}

  isOk(): this is Ok<T> {
    return true;
  }

  isErr(): this is Err<unknown> {
    return false;
  }
}

export class Err<E> {
  constructor(readonly error: E) {}

  isOk(): this is Ok<unknown> {
    return false;
  }

  isErr(): this is Err<E> {
    return true;
  }
}

// Helper functions
export function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

// Map operations for chaining
export function map<T, U, E>(
  result: Result<T, E>,
  fn: (data: T) => U
): Result<U, E> {
  if ('data' in result) return { ok: true, data: fn(result.data) };
  return { ok: false, error: result.error };
}

export function flatMap<T, U, E>(
  result: Result<T, E>,
  fn: (data: T) => Result<U, E>
): Result<U, E> {
  if ('data' in result) return fn(result.data);
  return { ok: false, error: result.error };
}

// Async helpers
export async function tryCatch<T>(
  fn: () => Promise<T>
): Promise<Result<T>> {
  try {
    return ok(await fn());
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

// Pattern matching
export function match<T, E, R>(
  result: Result<T, E>,
  handlers: {
    ok: (data: T) => R;
    err: (error: E) => R;
  }
): R {
  if ('data' in result) return handlers.ok(result.data);
  return handlers.err(result.error);
}
