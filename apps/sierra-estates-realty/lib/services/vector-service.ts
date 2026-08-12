/**
 * SIERRA ESTATES — VECTOR INTELLIGENCE SERVICE
 * Bridge to Gemini text-embedding-004 for Semantic Memory.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.GOOGLE_GENAI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

/**
 * Generates a 768-dimensional vector embedding for the provided text.
 * Optimized for Sierra Estates's real estate and stakeholder datasets.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!API_KEY) {
    console.warn("[VectorService] No API key configured. Returning zero vector.");
    return new Array(768).fill(0);
  }

  try {
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent(text);
    return Array.from(result.embedding.values);
  } catch (err) {
    console.error("[VectorService] Embedding failed:", err);
    return new Array(768).fill(0);
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
