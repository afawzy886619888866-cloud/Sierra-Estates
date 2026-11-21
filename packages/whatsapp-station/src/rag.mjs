/**
 * WhatsApp Station — RAG module (zero-dependency)
 * ────────────────────────────────────────────────
 * Same embedding contract as the app's gemini-embeddings.ts:
 * model `gemini-embedding-001`, outputDimensionality 768 — vectors are
 * cross-compatible with listings.embedding_768 and the
 * match_waiting_list_gemini RPC (migration 20261120_052).
 *
 * Env: GEMINI_API_KEY (or GOOGLE_AI_API_KEY / GOOGLE_GENAI_API_KEY).
 */

const MODEL = 'gemini-embedding-001';
const DIMENSIONS = 768;

function apiKey() {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || '';
}

export function isRagConfigured() {
  return Boolean(apiKey());
}

async function embedContent(text, taskType) {
  const key = apiKey();
  if (!key) throw new Error('RAG_UNCONFIGURED: set GEMINI_API_KEY to enable waiting-list embeddings');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:embedContent?key=${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: `models/${MODEL}`,
      content: { parts: [{ text: String(text).slice(0, 8000) }] },
      taskType,
      outputDimensionality: DIMENSIONS,
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`GEMINI_EMBED_${res.status}: ${body.slice(0, 200)}`);
  }
  const json = await res.json();
  const values = json?.embedding?.values;
  if (!Array.isArray(values) || values.length !== DIMENSIONS) {
    throw new Error(`GEMINI_EMBED_SHAPE: expected ${DIMENSIONS} dims, got ${Array.isArray(values) ? values.length : typeof values}`);
  }
  return values;
}

/** Embed a waiting-list row (document side). */
export const embedDocument768 = (text) => embedContent(text, 'RETRIEVAL_DOCUMENT');
/** Embed a search query (query side). */
export const embedQuery768Rest = (text) => embedContent(text, 'RETRIEVAL_QUERY');

export function cosine(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i];
  }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

/**
 * Local retrieval fallback (no Supabase RPC needed): rank rows by cosine
 * against the query vector. Rows carry `embedding` as a plain array.
 */
export function retrieveSimilar(queryVec, rows, { k = 5, threshold = 0.5 } = {}) {
  return (rows || [])
    .filter((r) => Array.isArray(r.embedding) && r.embedding.length === DIMENSIONS)
    .map((r) => ({ row: r, similarity: cosine(queryVec, r.embedding) }))
    .filter((x) => x.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, k);
}

export const RAG_MODEL = MODEL;
export const RAG_DIMENSIONS = DIMENSIONS;
