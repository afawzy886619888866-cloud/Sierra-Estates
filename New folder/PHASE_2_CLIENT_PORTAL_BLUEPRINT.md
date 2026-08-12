# Phase 2: Client Portal Implementation (Weeks 5-7)

**Building the user-facing client experience for Sierra Estates.**

---

## Executive Summary

**Timeline**: 3 weeks  
**Team**: 3 FTE (1 backend, 1.5 frontend, 0.5 design/PM)  
**Deliverables**: Enrollment management, real-time program sync, client dashboard  
**Risk Level**: 🟡 MEDIUM (depends on Phase 1 security rules)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   Client Portal                          │
│           (Next.js App Router + React 19)               │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Pages                                            │  │
│  │  ├─ /dashboard          (main hub)               │  │
│  │  ├─ /programs           (available programs)     │  │
│  │  ├─ /programs/[id]      (program detail)         │  │
│  │  ├─ /enroll             (enrollment flow)        │  │
│  │  ├─ /enrollments        (my programs)            │  │
│  │  ├─ /settings           (account settings)       │  │
│  │  └─ /logout             (auth teardown)          │  │
│  └──────────────────────────────────────────────────┘  │
│                           ↓                              │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Firestore Listeners                             │  │
│  │  ├─ Real-time program updates                   │  │
│  │  ├─ Enrollment status changes                   │  │
│  │  ├─ User profile sync                           │  │
│  │  └─ Automatic re-render on data change          │  │
│  └──────────────────────────────────────────────────┘  │
│                           ↓                              │
│  ┌──────────────────────────────────────────────────┐  │
│  │  API Routes (Next.js /api)                       │  │
│  │  ├─ /api/enroll           (POST enrollment)     │  │
│  │  ├─ /api/programs         (GET program list)    │  │
│  │  ├─ /api/user-profile     (GET user data)       │  │
│  │  └─ /api/[...auth]        (Firebase Auth flow)  │  │
│  └──────────────────────────────────────────────────┘  │
│                           ↓                              │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Firestore + Storage                            │  │
│  │  ├─ Security Rules (Phase 1.1)                  │  │
│  │  ├─ collections: programs, enrollments, users   │  │
│  │  └─ Storage: /programs/* for media              │  │
│  └──────────────────────────────────────────────────┘  │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## Key Features

### 1. Enrollment Management

**Goal**: Let clients discover programs and enroll

**Workflow**:

1. Client views available programs (list + search)
2. Client clicks "Enroll" on a program
3. System creates enrollment record with `status: pending`
4. Admin approves enrollment (Phase 3)
5. Client sees program in "My Programs"

**Database Schema**:

```typescript
// enrollments/{enrollmentId}
{
  enrollmentId: string;      // auto-generated
  clientId: string;          // user initiating enrollment
  programId: string;         // target program
  status: "pending" | "approved" | "rejected" | "completed";
  requestedAt: timestamp;
  approvedAt?: timestamp;
  rejectionReason?: string;
  metadata: {
    source: "web" | "mobile" | "admin";    // where enrolled from
    userAgent: string;                      // device info
  };
  createdAt: timestamp;
  updatedAt: timestamp;
}
```

### 2. Real-Time Program Sync

**Goal**: Keep client UI in sync with program updates

**Architecture**:

```typescript
// Client-side: lib/hooks/usePrograms.ts
function usePrograms(filters?: ProgramFilter) {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Real-time listener (Firestore)
    const query = db.collection("programs")
      .where("status", "==", "active");
    
    const unsubscribe = query.onSnapshot(
      (snapshot) => {
        const progs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setPrograms(progs);
        setLoading(false);
      },
      (error) => console.error("Failed to load programs:", error)
    );

    return unsubscribe;  // Cleanup listener on unmount
  }, []);

  return { programs, loading };
}
```

### 3. Client Dashboard

**Goal**: Centralized hub for client activity

**Dashboard Sections**:

- **Welcome Banner**: "Hi {firstName}, welcome back"
- **My Programs**: Cards for enrolled programs (status badge)
- **Available Programs**: Discover new programs
- **Recent Activity**: Timeline of enrollments + approvals
- **Quick Actions**: Enroll, view profile, contact support

**Database Queries**:

```typescript
// GET /api/dashboard for current user
{
  user: { id, email, firstName, lastName, role };
  enrolledPrograms: [
    { id, name, status, approvedAt, ... }
  ];
  availablePrograms: [
    { id, name, description, image, ... }
  ];
  recentActivity: [
    { event, programName, date, ... }
  ];
  stats: {
    totalEnrolled: number;
    pendingApprovals: number;
    completedPrograms: number;
  };
}
```

---

## Technical Implementation

### Frontend Structure

```
apps/sierra-estates-realty/app/
├── (client)/
│   ├── dashboard/
│   │   ├── page.tsx              # Dashboard main page
│   │   ├── layout.tsx            # Dashboard layout
│   │   ├── components/
│   │   │   ├── WelcomeBanner.tsx
│   │   │   ├── MyPrograms.tsx
│   │   │   ├── AvailablePrograms.tsx
│   │   │   └── RecentActivity.tsx
│   │   └── _actions.ts           # Server actions for enrollment
│   ├── programs/
│   │   ├── page.tsx              # Program list + search
│   │   ├── [id]/
│   │   │   ├── page.tsx          # Program detail
│   │   │   └── components/
│   │   │       └── EnrollButton.tsx
│   │   └── layout.tsx
│   ├── enrollments/
│   │   ├── page.tsx              # Enrollments list
│   │   ├── [id]/
│   │   │   ├── page.tsx          # Enrollment detail
│   │   │   └── components/
│   │   │       └── EnrollmentStatus.tsx
│   │   └── layout.tsx
│   └── settings/
│       ├── page.tsx              # Account settings
│       ├── components/
│       │   ├── ProfileForm.tsx
│       │   └── PreferencesForm.tsx
│       └── layout.tsx
├── api/
│   ├── enroll/
│   │   └── route.ts              # POST enrollment
│   ├── programs/
│   │   └── route.ts              # GET programs
│   ├── user-profile/
│   │   └── route.ts              # GET user data
│   └── dashboard/
│       └── route.ts              # GET dashboard data
└── layout.tsx                    # Root layout
```

### Key Components

#### 1. Dashboard Page

```typescript
// app/(client)/dashboard/page.tsx
import { Suspense } from "react";
import { WelcomeBanner } from "./components/WelcomeBanner";
import { MyPrograms } from "./components/MyPrograms";
import { AvailablePrograms } from "./components/AvailablePrograms";
import { RecentActivity } from "./components/RecentActivity";

export default function DashboardPage() {
  return (
    <div className="space-y-8 p-8">
      <Suspense fallback={<SkeletonBanner />}>
        <WelcomeBanner />
      </Suspense>

      <Suspense fallback={<SkeletonPrograms />}>
        <MyPrograms />
      </Suspense>

      <Suspense fallback={<SkeletonPrograms />}>
        <AvailablePrograms />
      </Suspense>

      <Suspense fallback={<SkeletonActivity />}>
        <RecentActivity />
      </Suspense>
    </div>
  );
}
```

#### 2. Program Listing with Real-Time Sync

```typescript
// app/(client)/programs/page.tsx
"use client";

import { usePrograms } from "@/lib/hooks/usePrograms";
import { ProgramCard } from "@/components/ProgramCard";

export default function ProgramsPage() {
  const { programs, loading } = usePrograms();
  
  if (loading) return <ProgramsSkeleton />;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {programs.map((program) => (
        <ProgramCard key={program.id} program={program} />
      ))}
    </div>
  );
}
```

#### 3. Enrollment API Endpoint

```typescript
// app/api/enroll/route.ts
import { verifyRequest } from "@/lib/server/auth-guard";
import { db } from "@/lib/server/firebase-admin";

export async function POST(req: Request) {
  const verified = await verifyRequest(req);
  if (!verified) return new Response("Unauthorized", { status: 401 });

  const { programId } = await req.json();
  const userId = verified.uid;

  // Check if already enrolled
  const existing = await db
    .collection("enrollments")
    .where("clientId", "==", userId)
    .where("programId", "==", programId)
    .get();

  if (!existing.empty) {
    return Response.json(
      { error: "Already enrolled in this program" },
      { status: 400 }
    );
  }

  // Create enrollment record
  const enrollment = await db.collection("enrollments").add({
    clientId: userId,
    programId,
    status: "pending",
    requestedAt: new Date(),
    metadata: {
      source: "web",
      userAgent: req.headers.get("user-agent"),
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Log to audit trail
  await db.collection("audit_logs").add({
    action: "enrollment_requested",
    userId,
    programId,
    enrollmentId: enrollment.id,
    timestamp: new Date(),
  });

  return Response.json({ enrollmentId: enrollment.id }, { status: 201 });
}
```

---

## Firestore Security (Phase 1 Rules Integration)

**Rules for Client Portal Access**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow clients to read active programs
    match /programs/{programId} {
      allow read: if request.auth != null && resource.data.status == "active";
    }

    // Allow clients to read/write their own enrollments
    match /enrollments/{enrollmentId} {
      allow read: if request.auth != null && 
                     resource.data.clientId == request.auth.uid;
      allow create: if request.auth != null && 
                       request.resource.data.clientId == request.auth.uid;
      allow update: if false;  // Clients can't update (admin only)
    }

    // Allow clients to read enrollment status
    match /users/{userId} {
      allow read: if request.auth.uid == userId;
      allow update: if request.auth.uid == userId &&
                       // Only allow updating specific fields
                       request.resource.data.keys().hasOnly(
                         ["firstName", "lastName", "email", "preferences"]
                       );
    }
  }
}
```

---

## Authentication & Authorization

### Auth Flow

1. User lands on `/` (public landing page)
2. Clicks "Sign In"
3. Redirects to `/login` (Firebase Auth UI)
4. After auth, redirects to `/dashboard`
5. Client role verified: `users/{uid}.role == "client"`
6. If unauthorized, shows 403 error

### Protected Routes

```typescript
// lib/AuthContext.tsx
export function useClientAuth() {
  const user = useAuth();
  const [role, setRole] = useState<"admin" | "client" | null>(null);

  useEffect(() => {
    if (!user) return;

    // Fetch user role from Firestore
    db.doc(`users/${user.uid}`).onSnapshot((snap) => {
      setRole(snap.data()?.role || null);
    });
  }, [user]);

  const isClient = role === "client";
  const isAuthenticated = !!user;

  return { user, role, isClient, isAuthenticated };
}
```

### Route Protection

```typescript
// app/(client)/dashboard/layout.tsx
import { requireClientAuth } from "@/lib/server/auth-guard";

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireClientAuth();  // Throws if not authenticated

  return (
    <nav>
      {/* Navigation */}
    </nav>
    <main>{children}</main>
  );
}
```

---

## Testing Strategy

### Unit Tests

- `usePrograms` hook (Firestore listener mocking)
- `EnrollButton` component (click handler)
- Enrollment API endpoint (POST /api/enroll)

### Integration Tests

- Full enrollment flow (discover → enroll → see in dashboard)
- Real-time sync (program update → UI refresh)
- Auth guard (unauthorized access denied)

### E2E Tests (Cypress)

```typescript
// e2e/client-portal.cy.ts
describe("Client Portal", () => {
  beforeEach(() => {
    cy.login("client@sierra.com");
  });

  it("should display dashboard on login", () => {
    cy.visit("/dashboard");
    cy.contains("Welcome back").should("be.visible");
  });

  it("should list available programs", () => {
    cy.visit("/programs");
    cy.get("[data-testid=program-card]").should("have.length.greaterThan", 0);
  });

  it("should enroll in a program", () => {
    cy.visit("/programs");
    cy.get("[data-testid=enroll-button]").first().click();
    cy.contains("Successfully enrolled").should("be.visible");
  });

  it("should show enrollment in dashboard", () => {
    cy.visit("/dashboard");
    cy.get("[data-testid=my-programs]").within(() => {
      cy.contains("Pending Approval").should("be.visible");
    });
  });
});
```

---

## Performance Optimization

### 1. Real-Time Sync Efficiency

- Use Firestore collection groups for indexed queries
- Limit listener to only necessary fields
- Debounce rapid updates

### 2. Image Optimization

- Use Next.js Image component for programs
- Optimize all images in Storage to WebP
- Lazy load images below fold

### 3. Code Splitting

- Dynamic imports for large components
- Route-based code splitting (Next.js default)

### 4. Caching Strategy

- Client-side: React Query for 1-minute cache
- Server-side: ISR (Incremental Static Regeneration) for program list

---

## Success Metrics (Post-Deployment)

| Metric | Target | How to Check |
| -------- | -------- | ------------- |
| Page load time | <2s | Lighthouse |
| Real-time sync latency | <1s | Firestore listener timestamp |
| Enrollment success rate | >99% | API logs + Firestore |
| 404 error rate | <0.1% | Cloud Logging |
| Mobile responsiveness | 100% | Testing on devices |
| Accessibility score | ≥95 | axe DevTools |

---

## Go-Live Checklist

**Code & Testing**:

- [ ] All components built and tested
- [ ] E2E tests passing
- [ ] Performance benchmarks met
- [ ] Security rules validated

**Infrastructure**:

- [ ] Firestore security rules deployed (Phase 1.1)
- [ ] Storage configured for program images
- [ ] Cloud CDN enabled for images

**Ops Readiness**:

- [ ] Monitoring dashboards created
- [ ] Alert policies configured
- [ ] Runbooks updated

**Team Readiness**:

- [ ] Customer support trained
- [ ] FAQs documented
- [ ] Feedback collection plan

---

## Rollback Plan

If issues are discovered:

1. Revert Next.js deployment (1 minute)
2. Keep Firestore data intact
3. Communicate status to users
4. Investigate and re-deploy

---

## Phase 2 Timeline

| Week | Tasks |
| ------ | ------- |
| Week 5 (Days 29-35) | Frontend setup, authentication, dashboard UI |
| Week 6 (Days 36-42) | Program listing, enrollment API, real-time sync |
| Week 7 (Days 43-49) | Testing, optimization, go-live prep |

---

**Next**: Phase 3 - Admin Console Implementation (Weeks 8-10)
