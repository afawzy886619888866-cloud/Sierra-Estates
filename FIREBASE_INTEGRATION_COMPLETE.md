# Firebase integration archive

This file records a superseded Firebase implementation and is retained only for
historical migration context. It is not an installation guide, deployment guide,
security contract, or description of the active runtime.

## Current status

The active architecture is Vercel + Next.js + Supabase. Firebase Hosting, Firestore
as the primary store, Firebase Auth, Firebase Storage, and Firebase deployment
workflows are retired. New work must use the canonical contracts in:

- [`DEPLOYMENT.md`](./DEPLOYMENT.md)
- [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- [`SECURITY.md`](./SECURITY.md)

## Historical contents

The original document described Firebase SDK initialization, Firestore collections,
Firebase Auth, admin SDK integration, rules, and Firebase deployment steps. Those
details no longer describe production behavior and must not be followed.

Legacy source files may remain temporarily while migration cleanup is completed.
Before removing any compatibility module, verify its imports and active deployment
references, then update the migration tests and this archive.
