import 'server-only';

export interface OpenClawGatewayConfig {
  baseUrl: string;
  token: string;
  configured: boolean;
}

const normalizeBaseUrl = (value: string | undefined) => value?.trim().replace(/\/+$/, '') || '';

export function getOpenClawGatewayConfig(): OpenClawGatewayConfig {
  const baseUrl = normalizeBaseUrl(process.env.OPENCLAW_BASE_URL);
  const token = process.env.OPENCLAW_TOKEN?.trim() || '';

  return {
    baseUrl,
    token,
    configured: Boolean(baseUrl && token),
  };
}
