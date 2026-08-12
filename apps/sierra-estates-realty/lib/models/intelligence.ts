/**
 * SIERRA ESTATES — INTELLIGENCE DATA STRUCTURES
 * Shared types for neural services and frontend consumption.
 */

export interface IntelligentAsset {
  id: string;
  title: string;
  location: string;
  price: number;
  roi: number;
  yield: number;
  tags: string[];
  intelligenceScore: number;
  reasoning: string;
}
