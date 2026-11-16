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

- Supabase policy check: `pnpm check:backend`
- Supabase readiness check: `pnpm deploy:check`
- Supabase Master Schema: `pnpm deploy:supabase`
- Supabase Data & Inventory Sync: `pnpm migrate:supabase`

### 3. Pre-Deploy Validation Checklist

1. `pnpm type-check`
2. `pnpm lint`
3. `pnpm test:ci`
4. `pnpm check:backend`
5. `pnpm deploy:check`
