# Project Charter · Sierra Estates (`Sierra`)

## Executive Summary

Sierra Estates is the premier AI-orchestrated luxury real estate intelligence and transaction platform tailored for the New Cairo (5th Settlement) and East Cairo real estate markets. The platform unifies a 7-layer autonomous agent fleet (Titan Vertex AI, OpenClaw, Stage-9 Closer, DeepSeek Reasoner, Leila Bilingual Agent, The Scribe, and The Curator) with persistent long-term vector memory (Obsidian Memory Engine) and multi-portal syndication (PropertyFinder, Bayut, and WhatsApp broker groups).

## Vision & Strategic Objectives

- **Automated Sourcing & Ingestion**: Real-time extraction and schema normalization of WhatsApp broker broadcasts and direct owner listings into verified Sierra Code inventory (`[Compound]-[Type]-[Bedrooms][Finishing]-[Price]M+[Features]`).
- **Deterministic AVM Valuation**: Sub-second automated valuation model indexing price divergence, compound growth rates, and market liquidity.
- **Omni-Channel Lead Routing**: Bilingual Arabic/English client qualification, automated viewing scheduling, and instant DocuSign/Stripe closing.
- **Resilient AI Fleet**: Fallback-resilient orchestration across Google Cloud Vertex AI, DeepSeek V3/R1, Anthropic Claude, and local in-memory event buses.

## Key Stakeholders & Governance

- **Product Owner / Operator**: Ahmed Fawzy (`a.fawzy8866@gmail.com`)
- **Engineering & Architecture**: Antigravity Autonomous Agent Fleet (`Sierra`)
- **Compliance & Security**: MCD Deterministic Protocol, SAIF Cloud Security, and Firestore granular security rules.

## Operating Constraints

- Maximum p95 API response time < 500ms.
- 100% test pass rate across all monorepo test suites.
- Zero-drift between local branches and remote origin (`main`).
- Strict deterministic boundary between research (`EVALUATE`), planning (`CONTRACT`), and execution (`EXECUTE`).
