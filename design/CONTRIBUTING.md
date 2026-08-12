# Contributing to Sierra 2027

Welcome! This guide explains how to develop, test, and contribute to the Sierra 2027 platform.

---

## Getting Started

### Prerequisites
- Node.js 18+
- pnpm 9.0+
- Firebase project (staging & production)
- Git

### Setup
```bash
# Clone repository
git clone https://github.com/ahmedfawzy8866/Sierra-Estates-Final.git
cd Sierra-Estates-Final

# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env.local

# Fill in Firebase credentials
# Edit .env.local with your Firebase config
```

### Environment Variables
```env
# Firebase (Client)
NEXT_PUBLIC_FIREBASE_PROJECT_ID=sierra-estates-staging
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=sierra-estates-staging.firebaseapp.com
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=sierra-estates-staging.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123...

# Firebase (Server-Only)
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
# OR individual env vars:
FIREBASE_PROJECT_ID=sierra-estates-staging
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@...iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY='-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n'

# API Security
SBR_SECRET_KEY=your-secret-key-here

# Optional Integrations
GOOGLE_AI_API_KEY=sk-...
TELEGRAM_BOT_TOKEN=123456:ABC...
TELEGRAM_CHAT_ID=123456789
STRIPE_SECRET_KEY=sk_test_...
DOCUSIGN_API_KEY=...
```

### Run Development Server
```bash
cd apps/web
pnpm dev

# Open http://localhost:3000
```

---

## Project Structure

```
apps/web/
├── app/                # Next.js App Router
│   ├── page.tsx       # Landing page
│   ├── api/           # API routes (protected)
│   ├── admin/         # Admin dashboard
│   └── ...
├── components/        # React components
├── lib/               # Business logic
│   ├── server/        # Server-only modules
│   └── ...
├── agents/            # Agent implementations
└── package.json
```

---

## Development Workflow

### 1. Create Feature Branch
```bash
git checkout -b feature/your-feature-name
```

### 2. Make Changes
```bash
# Keep TypeScript strict mode happy
pnpm run build
pnpm run lint
```

### 3. Run Tests
```bash
pnpm test
pnpm test:ci  # For CI environments
```

### 4. Commit with Clear Messages
```bash
git add .
git commit -m "feat: Add new feature

- Added X functionality
- Updated Y component
- Removed deprecated Z

Fixes #123"
```

### 5. Push & Create PR
```bash
git push origin feature/your-feature-name
# Create PR on GitHub
```

### 6. Code Review
- Ensure CI passes (tests, linting, build)
- Get approval from team
- Merge to main

---

## Code Style Guide

### TypeScript
- Always use **strict mode** (no `any`)
- Use explicit return types
- Avoid `!` non-null assertions (prefer guard clauses)

```typescript
// ✅ Good
function getProperty(id: string): SierraProperty | null {
  if (!id) return null;
  return properties[id];
}

// ❌ Bad
function getProperty(id: string): SierraProperty {
  return properties[id]!;
}
```

### React Components
- Use functional components (no class components)
- Prefer composition over inheritance
- Use hooks for state management

```typescript
// ✅ Good
export function PropertyCard({ property }: { property: SierraProperty }) {
  const [isExpanded, setIsExpanded] = useState(false);
  return <div>...</div>;
}

// ❌ Bad
export class PropertyCard extends React.Component {
  state = { isExpanded: false };
  render() { return <div>...</div>; }
}
```

### CSS (Tailwind)
- Use utility classes only (no custom CSS)
- Follow design tokens (colors from tailwind.config.js)
- Respect responsive breakpoints

```tsx
// ✅ Good
<div className="bg-ivory-100 text-navy-300 rounded-lg shadow-card p-6">
  <h2 className="font-serif text-heading-lg text-navy-300 mb-4">Title</h2>
</div>

// ❌ Bad
<div style={{ backgroundColor: '#F4F0E8', padding: '24px' }}>
  <h2 style={{ fontSize: '28px' }}>Title</h2>
</div>
```

### Naming Conventions
```typescript
// Components: PascalCase
export function PropertyCard() {}
export function AdminDashboard() {}

// Functions: camelCase
export function getPropertyById(id: string) {}
export function calculateRoi(property: SierraProperty) {}

// Constants: UPPER_SNAKE_CASE
export const MAX_PROPERTIES = 1000;
export const API_TIMEOUT = 5000;

// Interfaces/Types: PascalCase
interface SierraProperty { }
type DealStatus = 'draft' | 'signed' | 'closed';
```

---

## Testing

### Unit Tests
```typescript
// components/__tests__/PropertyCard.test.tsx
import { render, screen } from '@testing-library/react';
import { PropertyCard } from '../PropertyCard';

describe('PropertyCard', () => {
  it('displays property details', () => {
    const property: SierraProperty = {
      id: '123',
      sbrCode: 'TEST-1B-50K',
      // ... other required fields
    };

    render(<PropertyCard property={property} />);
    expect(screen.getByText('TEST-1B-50K')).toBeInTheDocument();
  });
});
```

### Integration Tests
```typescript
// app/api/listings/__tests__/route.test.ts
import { GET } from '../route';
import { NextRequest } from 'next/server';

describe('/api/listings', () => {
  it('returns property listings', async () => {
    const request = new NextRequest(
      new URL('http://localhost:3000/api/listings'),
      { headers: { 'X-SBR-SECRET-KEY': process.env.SBR_SECRET_KEY } }
    );

    const response = await GET(request);
    expect(response.status).toBe(200);
  });
});
```

### Run Tests
```bash
pnpm test                    # Run once
pnpm test --watch          # Watch mode
pnpm test:ci               # CI mode (with coverage)
```

---

## Firebase Development

### Firestore Rules (Local Testing)
```bash
# Start Firestore emulator
firebase emulators:start

# In tests, connect to emulator
process.env.FIREBASE_EMULATOR_HOST = 'localhost:8080';
```

### Cloud Functions (Local Testing)
```bash
# Deploy to local emulator
firebase deploy --only functions --debug

# Test locally before deploying to production
```

### Connecting to Staging vs Production
```typescript
// lib/firebase.ts - Use NEXT_PUBLIC_FIREBASE_PROJECT_ID
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

// Staging: sierra-estates-staging
// Production: sierra-estates-production
```

---

## Build & Deployment

### Local Build
```bash
pnpm run build              # Build for production
pnpm run lint              # Check code quality
pnpm run type-check        # Run TypeScript check
```

### Deploy to Vercel
```bash
# Automatic on main branch push
# OR manual:
vercel --prod
```

### Deploy Cloud Functions
```bash
firebase deploy --only functions

# Deploy with specific environment
firebase deploy --project sierra-estates-staging --only functions
```

---

## Debugging

### Browser DevTools
- Open Chrome DevTools (F12)
- Use React DevTools extension
- Check Network tab for API calls

### Server Logs
```bash
# View Vercel logs
vercel logs

# View Firestore logs
gcloud firestore admin list-indexes --project=sierra-estates-staging
```

### Firebase Emulator Logs
```bash
firebase emulators:start --debug
```

---

## Common Tasks

### Add New API Endpoint
```typescript
// apps/web/app/api/my-feature/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Validate input
    // Process logic
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
```

### Add New React Component
```typescript
// apps/web/components/MyComponent.tsx
'use client';

import React from 'react';

interface MyComponentProps {
  title: string;
  onAction?: () => void;
}

export function MyComponent({ title, onAction }: MyComponentProps) {
  return (
    <div className="bg-ivory-100 p-6 rounded-lg">
      <h2 className="font-serif text-heading-lg text-navy-300">{title}</h2>
      {onAction && (
        <button
          onClick={onAction}
          className="mt-4 bg-gold-500 text-navy-300 px-6 py-2 rounded"
        >
          Action
        </button>
      )}
    </div>
  );
}
```

### Query Firestore
```typescript
// Use the database protocol
import { fetchPropertiesByCompound } from '@/lib/database-protocol';

const properties = await fetchPropertiesByCompound('Mountain View Desert');
```

### Use Authentication
```typescript
// Client-side
import { useAuth } from '@/lib/AuthContext';

function MyComponent() {
  const { user, isAdmin } = useAuth();
  return isAdmin ? <AdminPanel /> : <UserPanel />;
}

// Server-side
import { verifyAdminRequest } from '@/lib/auth/admin';

export async function POST(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // Proceed with admin operation
}
```

---

## Performance Tips

### Optimize Images
```tsx
import Image from 'next/image';

<Image
  src="/property.jpg"
  alt="Property"
  width={400}
  height={300}
  loading="lazy"
/>
```

### Lazy Load Components
```tsx
import dynamic from 'next/dynamic';

const VirtualTour = dynamic(() => import('@/components/VirtualTour'), {
  loading: () => <p>Loading...</p>,
});
```

### Cache Firestore Queries
```typescript
// Cache for 60 seconds
const response = await fetch('/api/listings', {
  next: { revalidate: 60 }
});
```

---

## Git Conventions

### Branch Naming
```
feature/user-authentication
fix/property-search-bug
refactor/firestore-queries
docs/api-documentation
```

### Commit Messages
```
feat: Add X feature
fix: Resolve Y bug
refactor: Improve Z code
docs: Update X documentation
test: Add tests for X
chore: Update dependencies
```

### Pull Request Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added
- [ ] Integration tests added
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guide
- [ ] TypeScript strict mode passes
- [ ] Tests pass locally
- [ ] No console warnings/errors
```

---

## Issues & Bugs

### Reporting Bugs
1. Search existing issues
2. Create new issue with:
   - Clear title
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment info (Node version, browser, OS)

### Working on Issues
1. Comment "I'll work on this"
2. Create branch from issue number: `fix/#123-short-description`
3. Reference issue in PR: "Fixes #123"

---

## Questions?

- Check [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
- Check [API.md](./API.md) for endpoint documentation
- Open a GitHub issue for questions/discussions

---

**Happy coding! 🚀**

Last Updated: 2026-05-26
