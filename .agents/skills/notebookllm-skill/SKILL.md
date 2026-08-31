---
name: notebookllm-skill
description: Grounded New Cairo Real Estate Information Bank, intelligent unit recommendation, citation verification, study guide creation, and NotebookLM-style Audio Overview podcast briefing generation for Sierra Estates.
---

# Information Bank & New Cairo Unit Recommendation Engine (NotebookLM Skill)

## Overview

The `notebookllm-skill` (Sierra Information Bank / بنك المعلومات العقاري) provides Google NotebookLM-powered intelligence and unit recommendations tailored for New Cairo and luxury Egyptian real estate:

1. **New Cairo Real Estate Encyclopedia**: Built-in verified knowledge spanning Golden Square, Fifth Settlement, Mostakbal City, and prime compounds (Mivida, Palm Hills, Mountain View iCity, Hyde Park, Villette, Eastown, Swan Lake, Azzar, etc.).
2. **Intelligent Unit Recommendation**: When any user asks about buying, renting, or investing in New Cairo, it suggests the best matching compounds, specific unit types (Apartments, iVillas, Townhouses, Standalones), prices, down payments, and installment structures.
3. **Strict Source Grounding & Citation Verification**: Query across multiple verified real estate documents with direct verbatim citation attribution.
4. **Audio Overview Generation**: Automatically generate 2-person Deep Dive podcast scripts (Host & Financial Analyst) discussing compound yields, payment structures, and market arbitrage.
5. **Investment Memorandum & Study Guide Synthesis**: Distill complex developer agreements, pricing spreadsheets, and payment matrices into executive memos.

## TypeScript Architecture

- **Engine**: [`NotebookLMEngine`](file:///h:/last/Main/SE-Vercel-deploy-main/packages/agents-core/src/notebookllm-engine.ts)
- **Export**: `@sierra-estates/agents-core`
- **Client Route**: `/notebookllm` & `/ar/notebookllm` (Information Bank / بنك المعلومات)
