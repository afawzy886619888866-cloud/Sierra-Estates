/**
 * Result Type Pattern — Railway-oriented programming
 * Enables clear error handling and chaining
 * No throwing, pure functional error propagation
 */





export class Ok {
  constructor( data) {;this.data = data;}

  isOk() {
    return true;
  }

  isErr() {
    return false;
  }
}

export class Err {
  constructor( error) {;this.error = error;}

  isOk() {
    return false;
  }

  isErr() {
    return true;
  }
}

// Helper functions
export function ok(data) {
  return { ok: true, data };
}

export function err(error) {
  return { ok: false, error };
}

// Map operations for chaining
export function map(
  result,
  fn
) {
  if ('data' in result) return { ok: true, data: fn(result.data) };
  return { ok: false, error: result.error };
}

export function flatMap(
  result,
  fn
) {
  if ('data' in result) return fn(result.data);
  return { ok: false, error: result.error };
}

// Async helpers
export async function tryCatch(
  fn
) {
  try {
    return ok(await fn());
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

// Pattern matching
export function match(
  result,
  handlers



) {
  if ('data' in result) return handlers.ok(result.data);
  return handlers.err(result.error);
}
