---
name: clean-code
description: Professional clean code principles, readability, single responsibility, surgical refactoring, and zero-slop architecture for Sierra Estates monorepo.
---

# Clean Code Guidelines · Sierra Estates

## Core Tenets
1. **Meaningful Names**: Intent-revealing, pronounceable, and searchable identifiers for real estate entities (e.g., `listingId`, `canonicalCompound`, `unitPriceEgp`, `e164Phone`).
2. **Single Responsibility Principle (SRP)**: Each function, service, or component does one thing with clarity.
3. **Surgical Modifications**: Preserve existing comments, types, and unrelated logic. Never rewrite working files wholesale when a localized diff suffices.
4. **Zero AI Slop**: Avoid generic, boilerplate-heavy patterns, unnecessary wrappers, or placeholder comments.
5. **Fail Fast & Explicitly**: Validate boundaries with Zod, handle errors cleanly with descriptive logging, and avoid silent swallows (`catch {}`).
6. **Type Safety Over `any`**: Strictly enforce typed interfaces across Supabase models, API routes, and UI components.
