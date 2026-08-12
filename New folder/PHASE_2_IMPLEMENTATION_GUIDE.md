# Phase 2: Client Portal - Complete Implementation Guide

**Timeline**: 3 weeks (Days 29-49)  
**Team**: 3 FTE (1 backend, 1.5 frontend, 0.5 design/PM)  
**Status**: READY FOR IMPLEMENTATION

---

## Table of Contents

1. [Database Schema](#database-schema)
2. [Frontend Components](#frontend-components)
3. [React Hooks & State Management](#react-hooks--state-management)
4. [API Routes](#api-routes)
5. [Authentication & Authorization](#authentication--authorization)
6. [Real-Time Sync Implementation](#real-time-sync-implementation)
7. [Testing Strategy](#testing-strategy)
8. [Performance Optimization](#performance-optimization)
9. [Deployment Checklist](#deployment-checklist)

---

## Database Schema

### Firestore Collections (Already Designed)

All collections below should be created in the `sierra-blu` Firebase project.

#### 1. `users/{uid}`

```typescript
{
  uid: string;              // Firebase Auth UID
  email: string;            // User email
  firstName: string;        // Given name
  lastName: string;         // Family name
  role: "admin" | "client" | "manager";  // From Phase 1
  enrollments?: string[];   // Array of enrollment IDs (denormalized for fast access)
  preferences?: {
    language: "en" | "ar";
    notifications: boolean;
    newsletter: boolean;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### 2. `programs/{programId}`

```typescript
{
  programId: string;        // Auto-generated or UUID
  name: string;            // Program title
  description: string;     // Rich description
  category: string;        // e.g., "wellness", "education", "career"
  status: "active" | "draft" | "archived";
  capacity: number;        // Max enrollment slots
  enrolledCount: number;   // Current enrollment count (denormalized)
  image?: {
    url: string;          // Cloud Storage path
    alt: string;
  };
  requirements?: string[]; // List of eligibility requirements
  startDate?: Timestamp;  // Program start date
  endDate?: Timestamp;    // Program end date
  tags: string[];         // Search tags
  createdBy: string;      // Admin UID who created
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### 3. `enrollments/{enrollmentId}`

```typescript
{
  enrollmentId: string;          // Auto-generated
  clientId: string;              // User UID
  programId: string;             // Program ID
  status: "pending" | "approved" | "rejected" | "completed";
  requestedAt: Timestamp;
  approvedAt?: Timestamp;
  completedAt?: Timestamp;
  rejectionReason?: string;
  approvedBy?: string;           // Admin UID who approved
  metadata: {
    source: "web" | "mobile" | "admin";
    userAgent: string;
    ipAddress?: string;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### 4. `agent_sessions/{sessionId}`

```typescript
{
  sessionId: string;        // Auto-generated
  userId: string;          // Client UID
  userMessage: string;     // Client input
  agentResponse: string;   // AI response
  timestamp: Timestamp;
  metadata?: {
    model: string;         // Gemini version used
    tokens: number;
  };
}
```

#### 5. `audit_logs/{logId}` (Immutable)

```typescript
{
  logId: string;           // Auto-generated
  action: string;          // e.g., "enrollment_requested", "program_updated"
  userId: string;          // Who triggered the action
  resourceType: string;    // "enrollment", "program", "user"
  resourceId: string;      // ID of resource affected
  changes?: Record<string, any>;  // What changed (before/after)
  timestamp: Timestamp;
}
```

---

## Frontend Components

### Component Hierarchy

```
app/
├── (client)/
│   ├── layout.tsx                 # Protected layout
│   ├── dashboard/
│   │   ├── page.tsx              # Main dashboard
│   │   ├── layout.tsx
│   │   └── components/
│   │       ├── WelcomeBanner.tsx
│   │       ├── MyPrograms.tsx
│   │       ├── AvailablePrograms.tsx
│   │       ├── RecentActivity.tsx
│   │       └── StatsCards.tsx
│   ├── programs/
│   │   ├── page.tsx              # Program listing + search
│   │   ├── [id]/
│   │   │   ├── page.tsx          # Program detail
│   │   │   └── components/
│   │   │       ├── ProgramHeader.tsx
│   │   │       ├── EnrollButton.tsx
│   │   │       └── RequirementsPanel.tsx
│   │   └── components/
│   │       ├── ProgramCard.tsx
│   │       └── SearchBar.tsx
│   ├── enrollments/
│   │   ├── page.tsx              # My enrollments
│   │   ├── [id]/
│   │   │   ├── page.tsx          # Enrollment detail
│   │   │   └── components/
│   │   │       └── EnrollmentStatus.tsx
│   │   └── components/
│   │       └── EnrollmentCard.tsx
│   └── settings/
│       ├── page.tsx              # Account settings
│       ├── layout.tsx
│       └── components/
│           ├── ProfileForm.tsx
│           └── PreferencesForm.tsx
└── api/
    ├── enroll/
    │   └── route.ts
    ├── programs/
    │   └── route.ts
    ├── enrollments/
    │   └── route.ts
    ├── user-profile/
    │   └── route.ts
    └── dashboard/
        └── route.ts
```

### Core Components with Full Code

#### 1. Protected Client Layout

```typescript
// app/(client)/layout.tsx
import { ReactNode } from "react";
import { requireClientAuth } from "@/lib/server/auth-guard";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";

export default async function ClientLayout({
  children,
}: {
  children: ReactNode;
}) {
  // This throws if not authenticated as client
  await requireClientAuth();

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
```

#### 2. Dashboard Page (Main Hub)

```typescript
// app/(client)/dashboard/page.tsx
import { Suspense } from "react";
import { WelcomeBanner } from "./components/WelcomeBanner";
import { MyPrograms } from "./components/MyPrograms";
import { AvailablePrograms } from "./components/AvailablePrograms";
import { StatsCards } from "./components/StatsCards";
import { RecentActivity } from "./components/RecentActivity";
import {
  SkeletonBanner,
  SkeletonCards,
  SkeletonPrograms,
} from "@/components/Skeletons";

export const metadata = {
  title: "Dashboard | Sierra Estates",
};

export default function DashboardPage() {
  return (
    <div className="space-y-8 p-8">
      {/* Welcome Section */}
      <Suspense fallback={<SkeletonBanner />}>
        <WelcomeBanner />
      </Suspense>

      {/* Stats Cards */}
      <Suspense fallback={<SkeletonCards />}>
        <StatsCards />
      </Suspense>

      {/* My Programs (Enrolled) */}
      <section>
        <h2 className="text-2xl font-bold mb-6">My Programs</h2>
        <Suspense fallback={<SkeletonPrograms />}>
          <MyPrograms />
        </Suspense>
      </section>

      {/* Available Programs (To Discover) */}
      <section>
        <h2 className="text-2xl font-bold mb-6">Discover Programs</h2>
        <Suspense fallback={<SkeletonPrograms />}>
          <AvailablePrograms />
        </Suspense>
      </section>

      {/* Recent Activity */}
      <section>
        <h2 className="text-2xl font-bold mb-6">Recent Activity</h2>
        <Suspense fallback={<SkeletonPrograms />}>
          <RecentActivity />
        </Suspense>
      </section>
    </div>
  );
}
```

#### 3. Welcome Banner Component

```typescript
// app/(client)/dashboard/components/WelcomeBanner.tsx
"use client";

import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export function WelcomeBanner() {
  const { user } = useAuth();
  const firstName = user?.displayName?.split(" ")[0] || "there";

  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-8 text-white shadow-lg">
      <h1 className="text-4xl font-bold mb-2">
        Welcome back, {firstName}! 👋
      </h1>
      <p className="text-blue-100 mb-6">
        Discover new programs and manage your enrollments.
      </p>
      <div className="flex gap-4">
        <Link href="/programs">
          <Button className="bg-white text-blue-600 hover:bg-blue-50">
            Browse Programs
          </Button>
        </Link>
        <Link href="/settings">
          <Button variant="outline" className="border-white text-white hover:bg-blue-700">
            Settings
          </Button>
        </Link>
      </div>
    </div>
  );
}
```

#### 4. My Programs (Enrolled Programs)

```typescript
// app/(client)/dashboard/components/MyPrograms.tsx
"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { EnrollmentCard } from "@/components/EnrollmentCard";
import { SkeletonPrograms } from "@/components/Skeletons";

interface Enrollment {
  enrollmentId: string;
  programId: string;
  status: "pending" | "approved" | "rejected" | "completed";
  requestedAt: any;
  approvedAt?: any;
  programName?: string;
  programImage?: string;
}

export function MyPrograms() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Real-time listener for approved/completed enrollments only
    const q = query(
      collection(db, "enrollments"),
      where("clientId", "==", user.uid),
      where("status", "in", ["approved", "completed"])
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          enrollmentId: doc.id,
          ...doc.data(),
        })) as Enrollment[];
        setEnrollments(data);
        setLoading(false);
      },
      (error) => {
        console.error("Failed to fetch enrollments:", error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user]);

  if (loading) return <SkeletonPrograms />;

  if (enrollments.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
        <p className="text-gray-500">No enrolled programs yet.</p>
        <a href="/programs" className="text-blue-600 hover:underline">
          Browse programs →
        </a>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {enrollments.map((enrollment) => (
        <EnrollmentCard key={enrollment.enrollmentId} enrollment={enrollment} />
      ))}
    </div>
  );
}
```

#### 5. Available Programs (Discovery)

```typescript
// app/(client)/dashboard/components/AvailablePrograms.tsx
"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, limit, onSnapshot } from "firebase/firestore";
import { ProgramCard } from "@/components/ProgramCard";
import { SkeletonPrograms } from "@/components/Skeletons";
import Link from "next/link";

interface Program {
  programId: string;
  name: string;
  description: string;
  category: string;
  image?: { url: string; alt: string };
  capacity: number;
  enrolledCount: number;
}

export function AvailablePrograms() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Real-time listener for active programs (limit to first 6)
    const q = query(
      collection(db, "programs"),
      where("status", "==", "active"),
      limit(6)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          programId: doc.id,
          ...doc.data(),
        })) as Program[];
        setPrograms(data);
        setLoading(false);
      },
      (error) => {
        console.error("Failed to fetch programs:", error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  if (loading) return <SkeletonPrograms />;

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {programs.map((program) => (
          <ProgramCard key={program.programId} program={program} />
        ))}
      </div>
      <Link href="/programs" className="text-blue-600 font-semibold hover:underline">
        View all programs →
      </Link>
    </div>
  );
}
```

#### 6. Program List Page with Search

```typescript
// app/(client)/programs/page.tsx
"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { ProgramCard } from "@/components/ProgramCard";
import { SearchBar } from "./components/SearchBar";

interface Program {
  programId: string;
  name: string;
  description: string;
  category: string;
  image?: { url: string; alt: string };
  capacity: number;
  enrolledCount: number;
  tags: string[];
}

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [filteredPrograms, setFilteredPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    // Real-time listener for all active programs
    const q = query(
      collection(db, "programs"),
      where("status", "==", "active")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          programId: doc.id,
          ...doc.data(),
        })) as Program[];
        setPrograms(data);
        setLoading(false);
      },
      (error) => {
        console.error("Failed to fetch programs:", error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  // Filter programs by search term and category
  useEffect(() => {
    let filtered = programs;

    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.tags.some((tag) =>
            tag.toLowerCase().includes(searchTerm.toLowerCase())
          )
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    setFilteredPrograms(filtered);
  }, [programs, searchTerm, selectedCategory]);

  const categories = [...new Set(programs.map((p) => p.category))];

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold mb-8">Discover Programs</h1>

      {/* Search & Filter */}
      <div className="mb-8 space-y-4">
        <SearchBar value={searchTerm} onChange={setSearchTerm} />

        {/* Category Filter */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-full transition ${
              selectedCategory === null
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full transition ${
                selectedCategory === cat
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div>Loading programs...</div>
      ) : filteredPrograms.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">
            No programs found matching your criteria.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPrograms.map((program) => (
            <ProgramCard key={program.programId} program={program} />
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## React Hooks & State Management

### Custom Hooks

#### 1. `usePrograms` - Real-time program fetching

```typescript
// lib/hooks/usePrograms.ts
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, QueryConstraint } from "firebase/firestore";

interface Program {
  programId: string;
  name: string;
  description: string;
  category: string;
  status: "active" | "draft" | "archived";
  capacity: number;
  enrolledCount: number;
  image?: { url: string; alt: string };
  tags: string[];
}

export function usePrograms(...constraints: QueryConstraint[]) {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    try {
      const q = query(collection(db, "programs"), ...constraints);

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const data = snapshot.docs.map((doc) => ({
            programId: doc.id,
            ...doc.data(),
          })) as Program[];
          setPrograms(data);
          setLoading(false);
        },
        (err) => {
          setError(err as Error);
          setLoading(false);
        }
      );

      return unsubscribe;
    } catch (err) {
      setError(err as Error);
      setLoading(false);
    }
  }, []);

  return { programs, loading, error };
}

// Usage example:
// const { programs, loading } = usePrograms(where("status", "==", "active"))
```

#### 2. `useEnrollments` - Real-time enrollment fetching

```typescript
// lib/hooks/useEnrollments.ts
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";

interface Enrollment {
  enrollmentId: string;
  clientId: string;
  programId: string;
  status: "pending" | "approved" | "rejected" | "completed";
  requestedAt: any;
  approvedAt?: any;
}

export function useEnrollments() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) return;

    try {
      const q = query(
        collection(db, "enrollments"),
        where("clientId", "==", user.uid)
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const data = snapshot.docs.map((doc) => ({
            enrollmentId: doc.id,
            ...doc.data(),
          })) as Enrollment[];
          setEnrollments(data);
          setLoading(false);
        },
        (err) => {
          setError(err as Error);
          setLoading(false);
        }
      );

      return unsubscribe;
    } catch (err) {
      setError(err as Error);
      setLoading(false);
    }
  }, [user]);

  return { enrollments, loading, error };
}
```

#### 3. `useClientAuth` - Auth with role checking

```typescript
// lib/hooks/useClientAuth.ts
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

interface ClientProfile {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export function useClientAuth() {
  const user = useAuth();
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, "users", user.uid),
      (doc) => {
        if (doc.exists()) {
          setProfile({
            uid: user.uid,
            ...doc.data(),
          } as ClientProfile);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Failed to fetch profile:", error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user?.uid]);

  return { profile, loading, isClient: profile?.role === "client" };
}
```

---

## API Routes

### 1. POST /api/enroll - Create enrollment

```typescript
// app/api/enroll/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyRequest } from "@/lib/server/auth-guard";
import { db } from "@/lib/server/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    // Verify user is authenticated
    const verified = await verifyRequest(req);
    if (!verified) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { programId } = await req.json();
    const userId = verified.uid;

    // Validate program exists
    const programSnap = await db.doc(`programs/${programId}`).get();
    if (!programSnap.exists) {
      return NextResponse.json(
        { error: "Program not found" },
        { status: 404 }
      );
    }

    // Check if already enrolled
    const existingEnrollments = await db
      .collection("enrollments")
      .where("clientId", "==", userId)
      .where("programId", "==", programId)
      .get();

    if (!existingEnrollments.empty) {
      return NextResponse.json(
        { error: "Already enrolled in this program" },
        { status: 400 }
      );
    }

    // Check capacity
    const program = programSnap.data();
    if (program.enrolledCount >= program.capacity) {
      return NextResponse.json(
        { error: "Program is at full capacity" },
        { status: 400 }
      );
    }

    // Create enrollment record
    const enrollmentRef = await db.collection("enrollments").add({
      clientId: userId,
      programId,
      status: "pending",
      requestedAt: new Date(),
      metadata: {
        source: "web",
        userAgent: req.headers.get("user-agent") || "",
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Increment enrolled count
    await db.doc(`programs/${programId}`).update({
      enrolledCount: program.enrolledCount + 1,
    });

    // Log to audit trail
    await db.collection("audit_logs").add({
      action: "enrollment_requested",
      userId,
      resourceType: "enrollment",
      resourceId: enrollmentRef.id,
      timestamp: new Date(),
    });

    return NextResponse.json(
      { enrollmentId: enrollmentRef.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Enrollment error:", error);
    return NextResponse.json(
      { error: "Failed to create enrollment" },
      { status: 500 }
    );
  }
}
```

### 2. GET /api/programs - List programs

```typescript
// app/api/programs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/firebase-admin";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const category = searchParams.get("category");
    const status = searchParams.get("status") || "active";

    let query = db.collection("programs").where("status", "==", status);

    if (category) {
      query = query.where("category", "==", category);
    }

    const snapshot = await query.get();
    const programs = snapshot.docs.map((doc) => ({
      programId: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ programs }, { status: 200 });
  } catch (error) {
    console.error("Programs fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch programs" },
      { status: 500 }
    );
  }
}
```

### 3. GET /api/user-profile - Get current user profile

```typescript
// app/api/user-profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyRequest } from "@/lib/server/auth-guard";
import { db } from "@/lib/server/firebase-admin";

export async function GET(req: NextRequest) {
  try {
    const verified = await verifyRequest(req);
    if (!verified) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userSnap = await db.doc(`users/${verified.uid}`).get();
    
    if (!userSnap.exists) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { user: { uid: verified.uid, ...userSnap.data() } },
      { status: 200 }
    );
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}
```

### 4. GET /api/dashboard - Dashboard data (all stats + programs)

```typescript
// app/api/dashboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyRequest } from "@/lib/server/auth-guard";
import { db } from "@/lib/server/firebase-admin";

export async function GET(req: NextRequest) {
  try {
    const verified = await verifyRequest(req);
    if (!verified) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user
    const userSnap = await db.doc(`users/${verified.uid}`).get();

    // Fetch enrolled programs
    const enrollmentsSnap = await db
      .collection("enrollments")
      .where("clientId", "==", verified.uid)
      .get();

    // Fetch available programs
    const programsSnap = await db
      .collection("programs")
      .where("status", "==", "active")
      .limit(6)
      .get();

    // Build response
    const enrolledPrograms = enrollmentsSnap.docs.map((doc) => ({
      enrollmentId: doc.id,
      ...doc.data(),
    }));

    const availablePrograms = programsSnap.docs.map((doc) => ({
      programId: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json(
      {
        user: { uid: verified.uid, ...userSnap.data() },
        enrolledPrograms,
        availablePrograms,
        stats: {
          totalEnrolled: enrolledPrograms.length,
          pendingApprovals: enrolledPrograms.filter(
            (e) => e.status === "pending"
          ).length,
          completedPrograms: enrolledPrograms.filter(
            (e) => e.status === "completed"
          ).length,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
```

---

## Authentication & Authorization

### Firestore Security Rules (Phase 1.1 - Applied)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }

    function getUserRole() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
    }

    function isAdmin() {
      return getUserRole() == 'admin';
    }

    function isClient() {
      return getUserRole() == 'client';
    }

    function isOwner(userId) {
      return request.auth.uid == userId;
    }

    // Allow clients to read active programs
    match /programs/{programId} {
      allow read: if isAuthenticated() && resource.data.status == 'active';
      allow write: if isAdmin();
    }

    // Allow clients to create and read their own enrollments
    match /enrollments/{enrollmentId} {
      allow create: if isAuthenticated() && 
                       request.resource.data.clientId == request.auth.uid;
      allow read: if isAuthenticated() && 
                     (resource.data.clientId == request.auth.uid || isAdmin());
      allow update: if isAdmin();  // Only admins can update status
      allow delete: if false;       // Never delete enrollments
    }

    // Allow clients to read/update their own profile
    match /users/{userId} {
      allow read: if isOwner(userId) || isAdmin();
      allow update: if isOwner(userId) && 
                       request.resource.data.keys().hasOnly([
                         'firstName', 'lastName', 'email', 'preferences'
                       ]);
      allow write: if isAdmin();
    }

    // Immutable audit logs (append-only)
    match /audit_logs/{logId} {
      allow create: if isAuthenticated();
      allow read: if isAdmin();
      allow update, delete: if false;
    }

    // Deny by default
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Client-Side Auth Guard

```typescript
// app/(client)/layout.tsx or app/auth-guard.ts
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";

export function useClientProtection() {
  const router = useRouter();
  const { user, loading, role } = useAuth();

  useEffect(() => {
    if (!loading && (!user || role !== "client")) {
      router.push("/login");
    }
  }, [user, loading, role, router]);

  return { user, loading, isAuthorized: role === "client" };
}
```

---

## Real-Time Sync Implementation

### Optimized Firestore Listeners

```typescript
// lib/firebase-listeners.ts
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Unsubscribe,
} from "firebase/firestore";

export function listenToUserEnrollments(
  userId: string,
  onUpdate: (enrollments: any[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, "enrollments"),
    where("clientId", "==", userId),
    orderBy("requestedAt", "desc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const enrollments = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      onUpdate(enrollments);
    },
    onError
  );
}

export function listenToActivePrograms(
  onUpdate: (programs: any[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, "programs"),
    where("status", "==", "active"),
    orderBy("enrolledCount", "desc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const programs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      onUpdate(programs);
    },
    onError
  );
}

// Clean up with: unsubscribe() when component unmounts
```

### Optimistic Updates

```typescript
// lib/optimistic-updates.ts
export async function enrollInProgramOptimistic(
  programId: string,
  onSuccess: () => void,
  onError: (error: Error) => void
) {
  try {
    // Optimistically update UI (show pending enrollment)
    // Then make API call
    const response = await fetch("/api/enroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ programId }),
    });

    if (!response.ok) {
      throw new Error("Failed to enroll");
    }

    onSuccess();
  } catch (error) {
    onError(error as Error);
  }
}
```

---

## Testing Strategy

### Unit Tests

```typescript
// app/(client)/dashboard/components/__tests__/WelcomeBanner.test.tsx
import { render, screen } from "@testing-library/react";
import { WelcomeBanner } from "../WelcomeBanner";
import { useAuth } from "@/lib/AuthContext";

jest.mock("@/lib/AuthContext");

describe("WelcomeBanner", () => {
  it("displays user's first name", () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { displayName: "John Doe" },
    });

    render(<WelcomeBanner />);
    expect(screen.getByText(/Welcome back, John/i)).toBeInTheDocument();
  });

  it("renders browse programs button", () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { displayName: "Jane Smith" },
    });

    render(<WelcomeBanner />);
    expect(screen.getByRole("link", { name: /Browse Programs/i })).toBeInTheDocument();
  });
});
```

### Integration Tests

```typescript
// e2e/enrollment-flow.cy.ts (Cypress)
describe("Enrollment Flow", () => {
  beforeEach(() => {
    cy.login("client@sierra.com");
  });

  it("should enroll in a program from start to finish", () => {
    // 1. Navigate to programs
    cy.visit("/programs");
    cy.get("[data-testid=program-card]").first().as("firstProgram");

    // 2. Click enroll
    cy.get("@firstProgram").find("[data-testid=enroll-button]").click();
    cy.contains("Successfully enrolled").should("be.visible");

    // 3. Verify enrollment appears in dashboard
    cy.visit("/dashboard");
    cy.get("[data-testid=my-programs]").should("contain", "Pending Approval");
  });

  it("should prevent duplicate enrollments", () => {
    cy.visit("/programs");
    cy.get("[data-testid=program-card]").first().as("firstProgram");

    // Enroll first time
    cy.get("@firstProgram").find("[data-testid=enroll-button]").click();
    cy.contains("Successfully enrolled").should("be.visible");

    // Try to enroll again
    cy.get("@firstProgram").find("[data-testid=enroll-button]").click();
    cy.contains("Already enrolled").should("be.visible");
  });
});
```

---

## Performance Optimization

### 1. Image Optimization

```typescript
// components/ProgramCard.tsx
import Image from "next/image";

export function ProgramCard({ program }: { program: Program }) {
  return (
    <div className="rounded-lg overflow-hidden shadow-md">
      {program.image && (
        <Image
          src={program.image.url}
          alt={program.image.alt}
          width={400}
          height={250}
          className="w-full h-48 object-cover"
          priority={false}  // Lazy load
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      )}
      {/* Rest of card */}
    </div>
  );
}
```

### 2. Code Splitting

```typescript
// Dashboard with dynamic imports
const MyPrograms = dynamic(
  () => import("./components/MyPrograms"),
  { loading: () => <SkeletonPrograms /> }
);

const AvailablePrograms = dynamic(
  () => import("./components/AvailablePrograms"),
  { loading: () => <SkeletonPrograms /> }
);
```

### 3. Debounced Search

```typescript
// lib/hooks/useDebounce.ts
import { useState, useEffect } from "react";

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// Usage in search:
const debouncedSearch = useDebounce(searchTerm, 300);
useEffect(() => {
  // Filter programs based on debouncedSearch
}, [debouncedSearch]);
```

---

## Deployment Checklist

### Pre-Deployment (Week 6, Friday)

- [ ] All components built and tested
- [ ] E2E tests passing (Cypress)
- [ ] Performance benchmarks met (Lighthouse >90)
- [ ] Security rules validated (Phase 1.1 deployed)
- [ ] Mobile responsiveness verified
- [ ] Accessibility score ≥95 (axe DevTools)

### Deployment Day (Week 7, Monday)

- [ ] Code review completed (2+ engineers)
- [ ] All tests passing (Jest + Cypress)
- [ ] Environment variables set on Vercel
- [ ] Firestore indexes created for queries
- [ ] Cloud CDN enabled for images
- [ ] Monitoring dashboards ready

### Post-Deployment (Week 7, Days 1-3)

- [ ] Monitor error rates (<1%)
- [ ] Check real-time sync latency (<1s)
- [ ] Verify P95 latency (<2s)
- [ ] Run smoke tests on all pages
- [ ] Collect team feedback
- [ ] Document any issues found

### Go-Live (Week 7, Friday)

- [ ] Client team training completed
- [ ] FAQs documented
- [ ] Support runbooks updated
- [ ] Soft launch (10% of users)
- [ ] Monitor adoption metrics
- [ ] Full rollout once stable

---

## Success Metrics

| Metric | Target | How to Measure |
| -------- | -------- | --- |
| Page load time | <2s | Lighthouse, Core Web Vitals |
| Real-time sync latency | <1s | Firestore listener timestamps |
| Enrollment success rate | >99% | API logs + Firestore |
| 404 error rate | <0.1% | Cloud Logging |
| Mobile responsiveness | 100% | Device testing |
| Accessibility score | ≥95 | axe DevTools |
| Adoption rate | >60% (Day 30) | Analytics |

---

## Next Steps

1. **Week 5 (Days 29-35)**: Frontend setup, auth, dashboard UI
2. **Week 6 (Days 36-42)**: Program listing, enrollment API, real-time sync
3. **Week 7 (Days 43-49)**: Testing, optimization, deployment prep

**Phase 2 complete → Phase 3 (Admin Console) begins Week 8**
