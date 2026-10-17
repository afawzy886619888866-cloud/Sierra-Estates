/**
 * SIERRA ESTATES — VECTOR INTELLIGENCE SERVICE
 * Bridge to Gemini gemini-embedding-001 (768 dimensions) for Semantic Memory.
 *
 * Sierra Estates 3.0 (Phase 3): aligned with the canonical embedding
 * pipeline — scripts/generate-supabase-embeddings.ts writes
 * listings.embedding_768 with gemini-embedding-001 @ 768 dims, and
 * lib/server/gemini-embeddings.ts embeds queries with the same model, so
 * this service now uses the identical configuration. Callers that need a
 * strict no-fabrication contract should prefer lib/server/gemini-embeddings
 * (it throws instead of returning a zero vector).
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIMENSIONS = 768;

/**
 * Generates a 768-dimensional vector embedding for the provided text.
 * Optimized for Sierra Estates's real estate and stakeholder datasets.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!API_KEY) {
    console.warn("[VectorService] No API key configured. Returning zero vector.");
    return new Array(EMBEDDING_DIMENSIONS).fill(0);
  }

  try {
    const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
    const result = await model.embedContent({
      content: { role: "user", parts: [{ text }] },
      outputDimensionality: EMBEDDING_DIMENSIONS,
    } as Parameters<typeof model.embedContent>[0]);
    return Array.from(result.embedding.values);
  } catch (err) {
    console.error("[VectorService] Embedding failed:", err);
    return new Array(EMBEDDING_DIMENSIONS).fill(0);
  }
}

/**
 * Combines multiple attributes into a single semantic string for embedding.
 */
export function createSemanticString(data: Record<string, any>): string {
  // Sierra Estates PropTech Contextualization
  return Object.entries(data)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${key}: ${value}`)
    .join(" | ");
}

export const VECTOR_MODEL = EMBEDDING_MODEL;
export const VECTOR_DIMENSIONS = EMBEDDING_DIMENSIONS;
