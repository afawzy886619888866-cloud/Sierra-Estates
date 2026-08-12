# Firebase Admin & Backend Integration

## SIERRA ESTATES 3.0 — Intelligence OS

Complete guide for Firebase integration across the admin dashboard, backend services, and agents.

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Admin Dashboard Firebase Setup](#admin-dashboard-firebase-setup)
3. [Backend API Routes](#backend-api-routes)
4. [Agent Integration](#agent-integration)
5. [Real-time Synchronization](#real-time-synchronization)
6. [Security & Permissions](#security--permissions)
7. [Deployment](#deployment)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                  Sierra Estates Ecosystem                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐    ┌──────────────────┐                │
│  │ Client App       │    │ Admin Dashboard  │                │
│  │ (Next.js)        │    │ (React + Vite)   │                │
│  │                  │    │                  │                │
│  │ FirebaseProvider │    │ AdminFirebaseProvider            │
│  │ useFirebase      │    │ useAdminFirebase │                │
│  │ useListings      │    │ useListingsAdmin │                │
│  └────────┬─────────┘    └────────┬─────────┘                │
│           │                       │                          │
│           └───────────┬───────────┘                          │
│                       │                                      │
│                ┌──────▼──────┐                              │
│                │   Firebase   │                              │
│                │  Firestore   │                              │
│                │              │                              │
│                │ Collections: │                              │
│                │ - houyez_listings                           │
│                │ - houyez_compounds                          │
│                │ - users                                     │
│                │ - settings                                  │
│                │ - agent_sessions                           │
│                │ - agent_sessions/messages                  │
│                │ - analytics                                │
│                └──────┬──────┘                              │
│                       │                                      │
│           ┌───────────┴───────────┐                         │
│           │                       │                          │
│  ┌────────▼─────────┐   ┌────────▼──────────┐               │
│  │ Backend API      │   │ Agent Services    │               │
│  │ /api/listings    │   │ PropertyDataMgr   │               │
│  │ /api/compounds   │   │ AgentSessionMgr   │               │
│  │ /api/users       │   │ AnalyticsManager  │               │
│  │                  │   │ UserAuthManager   │               │
│  │ Admin SDK:       │   │                   │               │
│  │ getFirestoreAdmin│   │ Real-time Sync    │               │
│  │ getAuthAdmin     │   │ Event Logging     │               │
│  └──────────────────┘   └───────────────────┘               │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Admin Dashboard Firebase Setup

### 1. Firebase Initialization

**File: `apps/admin/src/firebase-init.ts`**

```typescript
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { firebaseConfig } from '@sierra-estates/config';
import { initializeFirestoreService } from '@sierra-estates/db/firestore.service';

export async function initializeAdminFirebase() {
  // Get existing app or create new
  if (getApps().length > 0) {
    adminFirebaseApp = getApps()[0];
  } else {
    adminFirebaseApp = initializeApp(firebaseConfig);
  }

  adminAuth = getAuth(adminFirebaseApp);
  adminDb = getFirestore(adminFirebaseApp);

  // Initialize Firestore service
  initializeFirestoreService(adminDb);

  // Optional: Connect to emulator in development
  if (import.meta.env.DEV && import.meta.env.VITE_FIREBASE_EMULATOR === 'true') {
    connectFirestoreEmulator(adminDb, 'localhost', 8080);
  }

  return { app: adminFirebaseApp, auth: adminAuth, db: adminDb };
}
```

### 2. React Context Provider

**File: `apps/admin/src/providers/FirebaseProvider.tsx`**

```typescript
import { AdminFirebaseContext } from '../providers/FirebaseProvider';
import { useAdminFirebase, useAdminAuth, useAdminFirestore } from '../providers/FirebaseProvider';

// Wrap app root
export function AdminApp() {
  return (
    <AdminFirebaseProvider>
      <Dashboard />
    </AdminFirebaseProvider>
  );
}

// Use in components
function ListingsTable() {
  const { db, isInitialized } = useAdminFirebase();
  const firestore = useAdminFirestore();

  // Now use Firestore...
}
```

**File: `apps/admin/src/main.tsx`**

```typescript
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AdminFirebaseProvider>
      <App />
    </AdminFirebaseProvider>
  </React.StrictMode>,
);
```

### 3. Admin Hooks

**File: `apps/admin/src/hooks/useListingsAdmin.ts`**

```typescript
export function useListingsAdmin(): UseListingsAdminResult {
  const db = useAdminFirestore();
  const [listings, setListings] = useState<FirestoreListing[]>([]);

  useEffect(() => {
    const firestoreService = getFirestoreService();
    
    // Real-time subscription
    const unsubscribe = firestoreService.onQueryChange<FirestoreListing>(
      'houyez_listings',
      [],
      (data) => setListings(data),
      (err) => setError(err)
    );

    return () => unsubscribe();
  }, [db]);

  const createListing = async (data: Partial<FirestoreListing>) => {
    const firestoreService = getFirestoreService();
    const docRef = await firestoreService.addDocument('houyez_listings', {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return docRef.id;
  };

  return { listings, loading, error, createListing, updateListing, deleteListing, searchListings };
}
```

---

## Backend API Routes

### 1. Listings API

**File: `apps/sierra-estates-realty/app/api/listings/route.ts`**

Enhanced with Firebase Firestore integration:

```typescript
import { getFirestoreAdmin, getAuthAdmin } from '@sierra-estates/config/firebase-admin';

// GET /api/listings
export async function GET(request: Request) {
  try {
    const db = getFirestoreAdmin();
    const { searchParams } = new URL(request.url);

    // Try Firebase Firestore first
    const firebaseListings = await getListingsFromFirebase();
    if (firebaseListings) return firebaseListings;

    // Fallback to seed data
    return SEED_LISTINGS;
  } catch (error) {
    logger.error('[LISTINGS_ERROR]', error);
    return NextResponse.json({ error: 'Failed to fetch listings' }, { status: 500 });
  }
}

// POST /api/listings
export async function POST(request: Request) {
  try {
    // Verify admin token
    const token = request.headers.get('authorization')?.substring(7);
    await getAuthAdmin().verifyIdToken(token);

    const body = await request.json();
    const db = getFirestoreAdmin();

    const listing = {
      ...body,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await db.collection('houyez_listings').add(listing);
    return NextResponse.json({ id: docRef.id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
```

### 2. Compounds API

**File: `apps/sierra-estates-realty/app/api/compounds/route.ts`**

```typescript
export async function GET(request: Request) {
  const db = getFirestoreAdmin();
  const snap = await db.collection('houyez_compounds')
    .where('active', '==', true)
    .limit(50)
    .get();

  const compounds = snap.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));

  return NextResponse.json({ compounds });
}
```

### 3. Users API

**File: `apps/sierra-estates-realty/app/api/users/route.ts`**

```typescript
export async function POST(request: Request) {
  const { email, displayName, role } = await request.json();
  const auth = getAuthAdmin();
  const db = getFirestoreAdmin();

  // Create user in Firebase Auth
  const user = await auth.createUser({ email, displayName });

  // Set custom claims (role-based access control)
  await auth.setCustomUserClaims(user.uid, { role });

  // Create user document in Firestore
  await db.collection('users').doc(user.uid).set({
    email,
    displayName,
    role,
    createdAt: new Date(),
    active: true,
  });

  return NextResponse.json({ uid: user.uid, email }, { status: 201 });
}
```

---

## Agent Integration

### 1. Agent Service Integration

**File: `apps/backend/src/services/firebase-agent.service.ts`**

Four core managers for agent workflows:

#### AgentSessionManager

```typescript
const sessionManager = new AgentSessionManager();

// Create session
const session = await sessionManager.createSession(
  clientId,
  'property-matcher',
  { preferences: { bedrooms: 2, budget: 500000 } }
);

// Track messages
await sessionManager.addMessage(
  session.id,
  userId,
  'user',
  'Looking for 2-bedroom apartments in New Cairo'
);

// Update status
await sessionManager.updateStatus(session.id, 'completed');
```

#### PropertyDataManager

```typescript
const propertyMgr = new PropertyDataManager();

// Search listings
const listings = await propertyMgr.searchListingsByPrice(300000, 1000000);

// Get featured
const featured = await propertyMgr.getFeaturedListings(20);

// Create listing
const newListing = await propertyMgr.createListing({
  title: 'Luxury Apartment',
  type: 'apartment',
  price: 500000,
  // ... more fields
});
```

#### UserAuthManager

```typescript
const authMgr = new UserAuthManager();

// Upsert user
await authMgr.upsertUser(uid, {
  email: user.email,
  displayName: user.name,
  role: 'agent',
  permissions: ['create_listings', 'view_analytics'],
});

// Set role
await authMgr.setUserRole(uid, 'admin');

// Create token
const token = await authMgr.createAgentToken(agentUid);
```

#### AnalyticsManager

```typescript
const analyticsMgr = new AnalyticsManager();

// Log view
await analyticsMgr.logListingView(userId, listingId);

// Log inquiry
await analyticsMgr.logInquiry(userId, listingId, 'Please send more photos');

// Custom event
await analyticsMgr.logEvent(userId, 'agent_session_completed', {
  sessionDuration: 1800,
  matchesGenerated: 5,
  properties: { ... },
});
```

### 2. Agent Workflow Integration

**Example: Property Matching Agent**

```typescript
import {
  agentSessionManager,
  propertyDataManager,
  analyticsManager,
} from '@sierra-estates/backend/services/firebase-agent.service';

async function runPropertyMatcher(clientId: string, preferences: any) {
  // 1. Create agent session
  const session = await agentSessionManager.createSession(
    clientId,
    'property-matcher',
    { preferences }
  );

  try {
    // 2. Search properties
    const listings = await propertyDataManager.searchListingsByPrice(
      preferences.minPrice,
      preferences.maxPrice
    );

    // 3. Filter by preferences
    const matches = listings.filter(l =>
      l.bedrooms >= preferences.bedrooms &&
      l.location.compound === preferences.compound
    );

    // 4. Add agent response
    await agentSessionManager.addMessage(
      session.id,
      'agent',
      'agent',
      `Found ${matches.length} properties matching your criteria`
    );

    // 5. Log analytics
    await analyticsManager.logEvent(clientId, 'property_matches_generated', {
      sessionId: session.id,
      matchCount: matches.length,
      preferences,
    });

    // 6. Close session
    await agentSessionManager.closeSession(session.id, { matches });

    return matches;
  } catch (error) {
    await agentSessionManager.updateStatus(session.id, 'error');
    throw error;
  }
}
```

---

## Real-time Synchronization

### 1. Client App Sync (Next.js)

```typescript
// Use in Next.js page component
'use client';

import { useListings } from '@sierra-estates/db/useFirestore';

export function ListingsPage() {
  const { data: listings, loading, error } = useListings();

  if (loading) return <Skeleton />;
  if (error) return <ErrorBoundary error={error} />;

  return (
    <div>
      {listings.map(listing => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
}
```

### 2. Admin Dashboard Sync (React)

```typescript
// Use in admin dashboard
import { useListingsAdmin } from '../hooks/useListingsAdmin';

export function AdminListingsTable() {
  const { listings, loading, error, updateListing } = useListingsAdmin();

  const handleFeatureToggle = async (id: string, featured: boolean) => {
    await updateListing(id, { featured });
    // UI updates automatically via real-time subscription
  };

  return (
    <Table>
      {listings.map(listing => (
        <Row key={listing.id}>
          <Cell>{listing.title}</Cell>
          <Cell>
            <Toggle
              checked={listing.featured}
              onChange={(checked) => handleFeatureToggle(listing.id, checked)}
            />
          </Cell>
        </Row>
      ))}
    </Table>
  );
}
```

### 3. Backend Sync (Server)

```typescript
// Get data from Firebase in API routes
const db = getFirestoreAdmin();

// One-time read
const snap = await db.collection('houyez_listings').limit(10).get();
const listings = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

// Listen for real-time updates (useful for webhooks)
db.collection('houyez_listings')
  .where('featured', '==', true)
  .onSnapshot(snap => {
    snap.docChanges().forEach(change => {
      if (change.type === 'added') {
        notifyAdminOfNewFeatured(change.doc.data());
      }
    });
  });
```

---

## Security & Permissions

### 1. Firestore Security Rules

**File: `firestore.rules`**

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper: Get user role
    function getUserRole() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
    }

    function isAdmin() {
      return request.auth != null && getUserRole() == 'admin';
    }

    function isAgent() {
      return request.auth != null && getUserRole() == 'agent';
    }

    // Listings: Public read, admin/agent write
    match /houyez_listings/{listingId} {
      allow read: if true; // Public
      allow create, update, delete: if isAdmin() || isAgent();
    }

    // Compounds: Public read, admin write
    match /houyez_compounds/{compoundId} {
      allow read: if true;
      allow create, update, delete: if isAdmin();
    }

    // Users: Owners and admins
    match /users/{uid} {
      allow read: if uid == request.auth.uid || isAdmin();
      allow create: if uid == request.auth.uid || isAdmin();
      allow update: if uid == request.auth.uid || isAdmin();
      allow delete: if isAdmin();
    }

    // Agent sessions: Owner and admin
    match /agent_sessions/{sessionId} {
      allow read, create, update, delete: if isAdmin() || request.auth.uid == resource.data.client_uid;

      match /messages/{messageId} {
        allow read, create: if isAdmin() || request.auth.uid == get(/databases/$(database)/documents/agent_sessions/$(sessionId)).data.client_uid;
        allow update, delete: if false; // Messages immutable
      }
    }

    // Analytics: Write-only
    match /analytics/{docId} {
      allow create: if request.auth != null;
      allow read: if isAdmin();
    }

    // Default deny
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### 2. Custom Claims & Roles

```typescript
// Set on user creation
const auth = getAuthAdmin();
await auth.setCustomUserClaims(uid, {
  role: 'admin',
  permissions: ['create_listings', 'delete_users', 'view_analytics'],
  company: 'sierra-estates'
});

// Access in client apps
const user = await auth.currentUser;
const claims = user?.customClaims; // { role: 'admin', permissions: [...] }
```

### 3. Token Verification

```typescript
// Verify token in API routes
const token = request.headers.get('authorization')?.substring(7);
const decodedToken = await getAuthAdmin().verifyIdToken(token);

if (decodedToken.role !== 'admin') {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
}
```

---

## Deployment

### 1. Environment Variables

**File: `.env.example`**

```bash
# Firebase Client Config (public)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyD...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=sierra-estates.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=sierra-blu
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=sierra-blu.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXX

# Firebase Admin Config (server-only, keep secret)
FIREBASE_PROJECT_ID=sierra-blu
FIREBASE_ADMIN_SDK_KEY='{"type":"service_account",...}'

# Development
NEXT_PUBLIC_FIREBASE_EMULATOR=false
NODE_ENV=production

# API Settings
NEXT_PUBLIC_CLIENT_URL=https://sierra-estates.net
```

### 2. CI/CD Deployment

**File: `.github/workflows/firebase-deploy.yml`**

```yaml
name: Deploy Firebase

on:
  push:
    branches: [main, develop]
    paths:
      - 'firestore.rules'
      - 'firebase.json'
      - '.github/workflows/firebase-deploy.yml'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Firebase
        uses: w9jds/firebase-action@master
        with:
          args: deploy --only firestore:rules
        env:
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
```

### 3. Pre-Production Checklist

- [ ] All `.env` variables configured in production Firebase project
- [ ] Firestore security rules deployed
- [ ] Firebase service account key securely stored (FIREBASE_ADMIN_SDK_KEY)
- [ ] Admin dashboard tested in production (Sierra Estates 3.0)
- [ ] Backend API routes tested with Firebase
- [ ] Agent workflows tested end-to-end
- [ ] Analytics events flowing to Firestore
- [ ] Backups configured in Firebase Console

---

## Summary

This integration provides:

✅ **Admin Dashboard** — React + Vite with real-time Firestore sync
✅ **Backend APIs** — Next.js routes with Admin SDK
✅ **Agent Services** — Real-time session tracking and property management
✅ **Real-time Sync** — All apps stay in sync across Firestore
✅ **Security** — Role-based access control with Firestore rules
✅ **Analytics** — Event logging and audit trails

All components follow the established patterns and share centralized Firebase configuration.
