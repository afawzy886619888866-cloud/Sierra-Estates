/**
 * Web-search grounding (Tavily REST) for the OpenClaw brain.
 *
 * §21 honesty contract: when TAVILY_API_KEY is absent the caller gets
 * { available: false } and must not fabricate results — the brain simply
 * answers without grounding. Any failure degrades to unavailable, never
 * to fake hits.
 */

export interface WebSearchHit {
  title: string;
  url: string;
  snippet: string;
}

export interface WebSearchResult {
  available: boolean;
  reason?: string;
  hits: WebSearchHit[];
}

export function isWebSearchConfigured(): boolean {
  return Boolean(process.env.TAVILY_API_KEY);
}

export async function webSearch(
  query: string,
  maxResults = 3,
  timeoutMs = 8000,
): Promise<WebSearchResult> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) {
    return { available: false, reason: 'TAVILY_API_KEY not set', hits: [] };
  }
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: key,
        query,
        max_results: maxResults,
        include_answer: false,
        search_depth: 'basic',
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
      return { available: false, reason: `Tavily returned ${res.status}`, hits: [] };
    }
    const json = (await res.json()) as { results?: Array<Record<string, unknown>> };
    const hits = (Array.isArray(json.results) ? json.results : [])
      .slice(0, maxResults)
      .map((r) => ({
        title: String(r.title ?? '').slice(0, 120),
        url: String(r.url ?? ''),
        snippet: String(r.content ?? '').slice(0, 240),
      }))
      .filter((h) => h.url);
    return { available: true, hits };
  } catch (err) {
    return {
      available: false,
      reason: err instanceof Error ? err.message : 'web search failed',
      hits: [],
    };
  }
}
