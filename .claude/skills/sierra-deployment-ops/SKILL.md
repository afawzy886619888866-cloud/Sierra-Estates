---
name: sierra-deployment-ops
description: Deployment and infrastructure management for Vercel, Firebase Firestore rules, and Cloud Storage.
---

# Sierra Deployment Ops Skill

## Overview

Automates and validates deployments for the Sierra Estates platform across Vercel and Firebase infrastructure.

## Deployment Workflows

### 1. Vercel Preview & Production

- Preview Deployment: `pnpm deploy:preview`
- Production Deployment: `pnpm deploy:prod`
- Vercel Link / Environment Sync: `pnpm link:vercel`

### 2. Firebase Rules & Storage

- Deploy security rules & storage: `pnpm deploy:rules`
- Full Firebase Deploy (rules, storage, functions): `pnpm deploy:firebase`

### 3. Pre-Deploy Validation Checklist

1. `pnpm turbo run type-check`
2. `pnpm turbo run lint`
3. `pnpm turbo run test:ci`
