export type Ok<T> = { ok: true; value: T };
export type Err<E extends Error> = { ok: false; error: E };
export type Result<T, E extends Error = Error> = Ok<T> | Err<E>;

export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

export function err<E extends Error>(error: E): Err<E> {
  return { ok: false, error };
}

