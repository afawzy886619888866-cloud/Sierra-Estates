---
name: sierra-deployment-ops
description: Deployment and infrastructure management for Vercel, Supabase, and worker services.
---

# Sierra Deployment Ops Skill

## Overview

Automates and validates deployments for the Sierra Estates platform across Vercel,
Supabase, and worker infrastructure. Firebase deployment is retired.

## Deployment Workflows

### 1. Vercel Preview & Production

- Preview Deployment: `pnpm deploy:preview`
- Production Deployment: `pnpm deploy:prod`
- Vercel Link / Environment Sync: `pnpm link:vercel`

### 2. Supabase Schema and Data

- Validate backend policy: `pnpm check:backend`
- Validate deployment readiness: `pnpm deploy:check`
- Apply the canonical schema: `pnpm deploy:supabase`
- Migrate data into Supabase: `pnpm migrate:supabase`

### 3. Pre-Deploy Validation Checklist

1. `pnpm type-check`
2. `pnpm lint`
3. `pnpm test:ci`
4. `pnpm check:backend`
5. `pnpm deploy:check`
