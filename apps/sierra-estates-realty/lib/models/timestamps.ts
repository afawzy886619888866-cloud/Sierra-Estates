/**
 * Timestamp representation after the Firebase → Supabase migration.
 *
 * Firestore modelled instants as a `Timestamp` class (with `FieldValue` for
 * server-side sentinels like `serverTimestamp()`). Postgres `timestamptz`
 * arrives over PostgREST as an ISO-8601 string, and the record layer in
 * `@sierra-estates/db` serialises a `Date` on the way in — so a value is a
 * string on read and either form on write.
 *
 * Declared here rather than inline so the models stop importing types from the
 * Firebase SDK, which is what kept `firebase` in the dependency graph of code
 * that no longer talks to it.
 */
export type IsoTimestamp = string;

/** Accepted when writing: the record layer converts a `Date` to ISO. */
export type WritableTimestamp = IsoTimestamp | Date;
