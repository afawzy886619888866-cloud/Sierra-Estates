/**
 * Type declarations for scripts/check-live-services.mjs (Sierra Estates 3.0
 * live-services status tool). The implementation is plain Node ESM so it
 * stays runnable via `node scripts/…` / `pnpm live:status` without a build
 * step; these declarations give tests and IDEs full type safety.
 */

export interface RemoteCapabilityReport {
  ok: boolean;
  status?: number;
  gated?: boolean;
  error?: string;
  geminiEmbeddings?: boolean;
  supabaseAdmin?: boolean;
  model?: string;
  dimensions?: number;
  rpc?: string;
}

export interface RagLiveProbe {
  state: 'verified' | 'failed' | 'gated' | 'unreachable';
  httpStatus?: number;
  matches?: number;
  error?: string;
  reason?: string;
}

export interface TelegramLegProbe {
  state:
    | 'skipped'
    | 'verified'
    | 'verified-token-only'
    | 'token-rejected'
    | 'channel-unreachable'
    | 'failed';
  note?: string;
  reason?: string;
  botUsername?: string | null;
  chatHandle?: string | null;
  chatId?: string;
}

export function probeRemote(
  baseUrl?: string,
  headers?: Record<string, string>,
): Promise<RemoteCapabilityReport>;

export function probeRagLive(
  baseUrl?: string,
  headers?: Record<string, string>,
): Promise<RagLiveProbe>;

export function probeTelegramLeg(opts?: {
  token?: string;
  chatId?: string;
}): Promise<TelegramLegProbe>;

export function classifyRagFailure(reason?: string): string | null;

export function main(): Promise<void>;
