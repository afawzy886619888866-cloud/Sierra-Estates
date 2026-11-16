import 'server-only';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * SIERRA ESTATES 3.0 — GEMINI EMBEDDING SERVICE (Phase 3)
 *
 * The ONE query-side embedder for the vector RAG memory system. It mirrors
 * scripts/generate-supabase-embeddings.ts exactly — model
 * `gemini-embedding-001` with outputDimensionality 768 — so query vectors
 * and stored `listings.embedding_768` vectors live in the same space and
 * the `match_listings_gemini` cosine RPC is meaningful.
 *
 * §21 honesty: without a key there is NO fallback vector — a zero vector
 * would silently match nothing (or everything, depending on the engine) and
 * fabricate retrieval quality. Callers receive an explicit error instead.
 */

export const GEMINI_EMBEDDING_MODEL = 'gemini-embedding-001';
export const GEMINI_EMBEDDING_DIMENSIONS = 768;

export class GeminiEmbeddingUnavailableError extends Error {
  constructor(reason: string) {
    super(`Gemini embedding unavailable: ${reason}`);
    this.name = 'GeminiEmbeddingUnavailableError';
  }
}

function resolveApiKey(): string {
  return (
    process.env.GOOGLE_GENAI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_AI_API_KEY ||
    ''
  );
}

export function isGeminiEmbeddingConfigured(): boolean {
  return resolveApiKey().length > 0;
}

/**
 * Embed one text into 768 dimensions with gemini-embedding-001.
 * Throws GeminiEmbeddingUnavailableError when the key is missing or the
 * call fails — callers must degrade honestly, never with a fake vector.
 */
export async function embedQuery768(text: string): Promise<number[]> {
  const apiKey = resolveApiKey();
  const input = String(text ?? '').trim();
  if (!input) {
    throw new GeminiEmbeddingUnavailableError('empty query text');
  }
  if (!apiKey) {
    throw new GeminiEmbeddingUnavailableError(
      'GOOGLE_GENAI_API_KEY (or GEMINI_API_KEY / GOOGLE_AI_API_KEY) is not configured',
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: GEMINI_EMBEDDING_MODEL });

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await model.embedContent({
        content: { role: 'user', parts: [{ text: input }] },
        outputDimensionality: GEMINI_EMBEDDING_DIMENSIONS,
      } as Parameters<typeof model.embedContent>[0]);
      const values = Array.from(result.embedding.values ?? []);
      if (values.length === GEMINI_EMBEDDING_DIMENSIONS) {
        return values;
      }
      throw new Error(
        `unexpected embedding dimensionality ${values.length} (expected ${GEMINI_EMBEDDING_DIMENSIONS})`,
      );
    } catch (err) {
      lastError = err;
      const rateLimited = /429|quota/i.test(String((err as Error)?.message ?? ''));
      if (!rateLimited || attempt === 3) break;
      await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }
  throw new GeminiEmbeddingUnavailableError((lastError as Error)?.message ?? 'embedding call failed');
}
