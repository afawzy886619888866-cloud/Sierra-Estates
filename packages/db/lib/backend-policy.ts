export const CANONICAL_BACKEND = 'supabase' as const;

export interface CanonicalBackendStatus {
  backend: typeof CANONICAL_BACKEND;
  url: string | null;
  anonKey: string | null;
  serviceRoleKey: string | null;
}

export function getSupabaseWriteConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || process.env.POSTGRES_URL || null;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    null;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || null;

  return { url, anonKey, serviceRoleKey };
}

export function isSupabaseCanonicalBackendConfigured(): boolean {
  const { url, anonKey } = getSupabaseWriteConfig();
  return Boolean(url && anonKey);
}

export function getCanonicalBackendStatus(): CanonicalBackendStatus {
  const { url, anonKey, serviceRoleKey } = getSupabaseWriteConfig();

  return {
    backend: CANONICAL_BACKEND,
    url,
    anonKey,
    serviceRoleKey,
  };
}

export function assertCanonicalBackendForWrites(context: string): CanonicalBackendStatus {
  const status = getCanonicalBackendStatus();

  if (!status.url || !status.anonKey) {
    throw new Error(
      `[backend-policy] Canonical backend is ${CANONICAL_BACKEND}. Missing Supabase URL or anon key for ${context}. ` +
        'Refusing legacy Firebase writes and falling back to the canonical backend contract.'
    );
  }

  if (!status.serviceRoleKey) {
    throw new Error(
      `[backend-policy] Supabase service-role key is required for writes in ${context}. ` +
        'Do not silently downgrade to the anon key.'
    );
  }

  return status;
}
