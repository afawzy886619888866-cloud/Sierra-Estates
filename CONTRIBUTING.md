# Contributing to Sierra 2027

Welcome! This document outlines engineering standards, workflows, and contribution guidelines for the Sierra 2027 platform.

---

## 1. Quick Start

### Prerequisites

- **Node.js**: `22.0.0+`
- **pnpm**: `9.0+`
- **Firebase CLI** & **Vercel CLI**

### Setup & Local Development

```bash
# 1. Clone repository
git clone https://github.com/sierrablue8866-droid/SE-Vercel-deploy-main.git
cd SE-Vercel-deploy-main

# 2. Install dependencies
pnpm install

# 3. Configure environment variables (.env.example is the source of truth)
cp .env.example apps/sierra-estates-realty/.env.local

# 4. Start local development server (http://localhost:3000)
pnpm dev
```

---

## 2. Monorepo Structure

```text
SE-Vercel-deploy-main/
├── apps/
│   └── sierra-estates-realty/     # Next.js 15 PropTech application (Bilingual EN/AR)
│       ├── app/(site)/            # Public client portal
│       ├── app/admin/             # Admin management console
│       ├── app/api/               # REST API route handlers & webhooks
│       ├── components/            # UI components & spatial design system
│       └── lib/                   # Firestore models, services & server utilities
├── packages/                      # Shared internal packages
├── functions/                     # Firebase Cloud Functions
├── scripts/                       # Deployment, agent & maintenance scripts
└── turbo.json                     # Turborepo task pipeline
```

---

## 3. Workflow & Git Standards

### Branching Strategy

Branch off `main` with appropriate type prefixes:

| Branch Prefix | Usage | Example |
| :--- | :--- | :--- |
| `feature/` | New features or capabilities | `feature/client-portal-chat` |
| `fix/` | Bug fixes | `fix/inventory-sync-currency` |
| `refactor/` | Code refactoring without behavior change | `refactor/listing-card-hooks` |
| `docs/` | Documentation updates | `docs/api-routes-reference` |
| `chore/` | Tooling, dependencies, or maintenance | `chore/upgrade-turborepo` |

### Pre-Commit Verification

Always verify types, linting, and tests locally before committing:

```bash
pnpm type-check    # Validate TypeScript types
pnpm lint          # Run ESLint checks
pnpm test          # Run Vitest test suite
```

### Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```text
feat(listings): add bilingual compound filter

- Implement English and Arabic query token matching
- Add cache revalidation tag for compound listings
- Add unit tests for compound slug resolution

Fixes #123
```

---

## 4. Code Style & Architecture

### TypeScript Standards

- Strict mode is enforced (`noImplicitAny`, `strictNullChecks`).
- Specify explicit return types on exported functions and API routes.
- Prefer optional chaining (`?.`) and nullish coalescing (`??`) over non-null assertions (`!`).

```typescript
// ✅ Good
export function getPropertyById(id: string): SierraProperty | null {
  if (!id) return null;
  return propertiesRegistry.get(id) ?? null;
}

// ❌ Bad
export function getPropertyById(id: string): SierraProperty {
  return propertiesRegistry.get(id)!;
}
```

### React & Tailwind Standards

- Use functional components with standard React Hooks.
- Add `'use client'` only when client-side state or browser APIs are required.
- Use Tailwind design tokens from `tailwind.config.ts` (avoid hardcoded hex colors or arbitrary values).

```tsx
// ✅ Good
export function PropertyCard({ property }: { property: SierraProperty }) {
  return (
    <div className="rounded-lg border border-gold-500/20 bg-ivory-100 p-6 md:p-8">
      <h3 className="font-serif text-heading-md text-navy-900">{property.title}</h3>
    </div>
  );
}
```

---

## 5. Testing & Local Emulation

### Writing Tests

```typescript
// apps/sierra-estates-realty/components/__tests__/PropertyCard.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PropertyCard } from '../PropertyCard';

describe('PropertyCard', () => {
  it('renders unit code and price accurately', () => {
    const mockProperty: SierraProperty = {
      id: 'prop-123',
      sbrCode: 'MV-OCT-402',
      title: 'Mountain View 4BR Villa',
      price: 15500000,
    };

    render(<PropertyCard property={mockProperty} />);
    expect(screen.getByText('MV-OCT-402')).toBeInTheDocument();
  });
});
```

### Firebase Local Emulators

```bash
# Start local Firestore, Storage, and Functions emulators
firebase emulators:start
```

---

## 6. Key Commands Reference

| Command | Description |
| :--- | :--- |
| `pnpm dev` | Run local dev server via Turborepo |
| `pnpm build` | Build all apps and packages for production |
| `pnpm lint` | Run ESLint across monorepo |
| `pnpm type-check` | Run TypeScript type checking |
| `pnpm test` | Run test suite via Vitest |
| `pnpm deploy:prod` | Deploy client web app to Vercel production |
| `pnpm deploy:rules` | Deploy Firestore security rules and storage rules |
| `pnpm deploy:firebase` | Deploy full Firebase suite (rules, storage, functions) |

---

## 7. Additional References

- [ARCHITECTURE.md](./ARCHITECTURE.md) — System design, data pipeline, and architecture
- [API.md](./API.md) — API routes and schema contracts
- [DEPLOYMENT.md](./DEPLOYMENT.md) — Infrastructure and deployment operations

---

### Happy Coding! 🚀
