---
name: sierra-deployment-ops
description: Deployment and infrastructure management for Vercel, Supabase PostgreSQL / pgvector schemas, and Cloud Storage.
---

# Sierra Deployment Ops Skill

## Overview

Automates and validates deployments for the Sierra Estates platform across Vercel and Supabase infrastructure. Supabase is the primary authoritative database, Auth, and pgvector context engine, replacing Firebase.

## Deployment Workflows

### 1. Vercel Preview & Production

- Preview Deployment: `pnpm deploy:preview`
- Production Deployment: `pnpm deploy:prod`
- Vercel Link / Environment Sync: `pnpm link:vercel`

### 2. Supabase Schemas, Migrations & Database Operations

- Supabase Master Schema: `node scripts/apply-supabase-schema.mjs`
- Supabase Data & Inventory Sync: `npx tsx scripts/migrate-data-to-supabase.ts`
- Direct Supabase Compatibility Adapter: `@sierra-estates/db/firebase-compat-supabase`
- Legacy Firebase Rules (Archived / Superseded): `pnpm deploy:rules`

### 3. Pre-Deploy Validation Checklist

1. `pnpm turbo run type-check`
2. `pnpm turbo run lint`
3. `pnpm turbo run test:ci`
