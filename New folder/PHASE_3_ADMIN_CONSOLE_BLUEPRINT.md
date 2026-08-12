# Phase 3: Admin Console Implementation (Weeks 8-10)

**Building the staff-facing administrative interface for Sierra Estates.**

---

## Executive Summary

**Timeline**: 3 weeks  
**Team**: 2 FTE (1 backend, 1 frontend)  
**Deliverables**: Program management, enrollment approval, user management, reporting  
**Risk Level**: 🟡 MEDIUM (depends on Phase 1 security rules)  
**Entry Gate**: Phase 1.1 (Firestore Rules) must be deployed first

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│              Admin Console (Next.js)                      │
│          (localhost:3000/admin - same codebase)           │
├──────────────────────────────────────────────────────────┤
│                                                            │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Pages                                              │  │
│  │  ├─ /admin/dashboard      (overview + KPIs)       │  │
│  │  ├─ /admin/programs       (program CRUD)          │  │
│  │  ├─ /admin/programs/[id]  (program detail)        │  │
│  │  ├─ /admin/enrollments    (pending approvals)     │  │
│  │  ├─ /admin/enrollments/[id] (enrollment detail)  │  │
│  │  ├─ /admin/users          (user management)       │  │
│  │  ├─ /admin/users/[id]     (user detail + role)   │  │
│  │  ├─ /admin/reports        (analytics dashboard)   │  │
│  │  ├─ /admin/audit-logs     (compliance audit)      │  │
│  │  └─ /admin/settings       (system config)         │  │
│  └────────────────────────────────────────────────────┘  │
│                           ↓                               │
│  ┌────────────────────────────────────────────────────┐  │
│  │  API Routes (/api/admin/*)                        │  │
│  │  ├─ POST   /programs       (create program)       │  │
│  │  ├─ PUT    /programs/:id   (update program)       │  │
│  │  ├─ DELETE /programs/:id   (archive program)      │  │
│  │  ├─ GET    /enrollments    (list pending)         │  │
│  │  ├─ PUT    /enrollments/:id (approve/reject)     │  │
│  │  ├─ GET    /users          (list users)           │  │
│  │  ├─ PUT    /users/:id      (update role)          │  │
│  │  └─ GET    /reports        (analytics data)       │  │
│  └────────────────────────────────────────────────────┘  │
│                           ↓                               │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Firestore + Storage                             │  │
│  │  ├─ Security Rules (admin-only RBAC)             │  │
│  │  ├─ Collections: programs, enrollments, users    │  │
│  │  ├─ audit_logs (immutable)                       │  │
│  │  └─ Storage: /admin/* for documents              │  │
│  └────────────────────────────────────────────────────┘  │
│                                                            │
└──────────────────────────────────────────────────────────┘
```

---

## Key Features

### 1. Program Management

**CRUD Operations**:

```typescript
interface Program {
  id: string;
  name: string;
  description: string;
  category: string;          // "wealth", "wellness", "education"
  status: "draft" | "active" | "archived";
  image: string;             // Storage path
  capacity: number;          // Max enrollments
  enrollmentCount: number;   // Current enrollments
  eligibility: {
    minAge?: number;
    maxAge?: number;
    requiresApproval: boolean;
  };
  metadata: {
    createdBy: string;       // Admin UID
    createdAt: timestamp;
    updatedAt: timestamp;
    tags: string[];
  };
}
```

**Admin Capabilities**:

- Create new programs with media upload
- Edit program details (name, description, capacity)
- Activate/archive programs
- View enrollment stats
- Bulk archive programs

### 2. Enrollment Approval Workflow

**Approval Queue**:

```typescript
interface EnrollmentApprovalTask {
  enrollmentId: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  programId: string;
  programName: string;
  requestedAt: timestamp;
  status: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  approvedBy?: string;       // Admin UID
  approvedAt?: timestamp;
}
```

**Workflow**:

1. Admin views `/admin/enrollments` (pending queue)
2. Clicks enrollment → detail view
3. Reviews client info + program
4. Clicks "Approve" or "Reject"
5. System updates enrollment + notifies client (email via Pub/Sub)
6. Enrollment appears in client dashboard

### 3. User Management

**User Roles & Permissions**:

```typescript
interface User {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "admin" | "manager" | "client";
  status: "active" | "suspended" | "deleted";
  createdAt: timestamp;
  lastLogin?: timestamp;
  metadata: {
    source: "web" | "import" | "invite";
    approvedBy?: string;
  };
}

// Role Permissions
const PERMISSIONS = {
  admin: ["read_all", "write_all", "delete_users", "manage_admins"],
  manager: ["read_all", "approve_enrollments", "manage_programs"],
  client: ["read_own", "enroll_programs", "view_dashboard"],
};
```

**Admin Actions**:

- Create users (import CSV or manual)
- Edit user info
- Change user role
- Suspend/reactivate users
- View login history

### 4. Analytics Dashboard

**KPI Metrics**:

```typescript
interface AdminDashboard {
  stats: {
    totalUsers: number;
    activeClients: number;
    totalPrograms: number;
    totalEnrollments: number;
    pendingApprovals: number;
  };
  enrollmentTrend: [
    { date: string; enrollments: number }
  ];
  topPrograms: [
    { name: string; enrollmentCount: number }
  ];
  approvalRate: {
    approved: number;
    rejected: number;
    pending: number;
    approvalTimeAvg: number;  // minutes
  };
  auditTrail: [
    { action: string; user: string; timestamp: date }
  ];
}
```

**Dashboard Sections**:

- Real-time KPIs (users, enrollments, programs)
- Enrollment trend chart (7-day)
- Top programs by enrollment
- Approval queue overview
- System health status

---

## Technical Implementation

### Frontend Structure

```
apps/sierra-estates-realty/app/
├── admin/
│   ├── layout.tsx              # Admin layout (sidebar + nav)
│   ├── page.tsx                # Dashboard
│   ├── dashboard/
│   │   ├── page.tsx
│   │   └── components/
│   │       ├── KPICards.tsx
│   │       ├── EnrollmentChart.tsx
│   │       ├── ApprovalQueue.tsx
│   │       └── RecentActivity.tsx
│   ├── programs/
│   │   ├── page.tsx            # Program list
│   │   ├── [id]/
│   │   │   ├── page.tsx        # Program detail
│   │   │   └── edit.tsx        # Edit form
│   │   ├── new/
│   │   │   └── page.tsx        # Create form
│   │   └── components/
│   │       ├── ProgramForm.tsx
│   │       ├── ProgramTable.tsx
│   │       └── BulkActions.tsx
│   ├── enrollments/
│   │   ├── page.tsx            # Approval queue
│   │   ├── [id]/
│   │   │   ├── page.tsx        # Detail + approve/reject
│   │   │   └── components/
│   │   │       ├── ApprovalForm.tsx
│   │   │       └── ClientInfo.tsx
│   │   └── components/
│   │       └── EnrollmentTable.tsx
│   ├── users/
│   │   ├── page.tsx            # User list
│   │   ├── [id]/
│   │   │   ├── page.tsx        # User detail
│   │   │   └── edit.tsx        # Edit role/status
│   │   ├── import/
│   │   │   └── page.tsx        # CSV import
│   │   └── components/
│   │       ├── UserForm.tsx
│   │       ├── UserTable.tsx
│   │       └── ImportDialog.tsx
│   ├── reports/
│   │   ├── page.tsx            # Analytics dashboard
│   │   ├── enrollments/
│   │   │   └── page.tsx        # Enrollment report
│   │   ├── users/
│   │   │   └── page.tsx        # User report
│   │   └── components/
│   │       ├── ReportChart.tsx
│   │       ├── ExportButton.tsx
│   │       └── DateRangePicker.tsx
│   ├── audit-logs/
│   │   ├── page.tsx            # Audit trail
│   │   └── components/
│   │       └── AuditTable.tsx
│   └── settings/
│       ├── page.tsx            # System settings
│       └── components/
│           ├── SystemSettings.tsx
│           └── IntegrationConfig.tsx
```

### API Routes

```typescript
// app/api/admin/programs/route.ts
export async function GET(req: Request) {
  const verified = await verifyAdminRequest(req);
  if (!verified) return new Response("Unauthorized", { status: 401 });

  const programs = await db
    .collection("programs")
    .orderBy("createdAt", "desc")
    .get();

  return Response.json({
    programs: programs.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  });
}

export async function POST(req: Request) {
  const verified = await verifyAdminRequest(req);
  if (!verified) return new Response("Unauthorized", { status: 401 });

  const programData = await req.json();

  // Validate required fields
  if (!programData.name || !programData.description) {
    return Response.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  // Create program
  const docRef = await db.collection("programs").add({
    ...programData,
    status: "draft",
    enrollmentCount: 0,
    createdBy: verified.uid,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Log to audit trail
  await db.collection("audit_logs").add({
    action: "program_created",
    adminId: verified.uid,
    programId: docRef.id,
    timestamp: new Date(),
  });

  return Response.json(
    { programId: docRef.id },
    { status: 201 }
  );
}
```

### Enrollment Approval

```typescript
// app/api/admin/enrollments/[id]/route.ts
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const verified = await verifyAdminRequest(req);
  if (!verified) return new Response("Unauthorized", { status: 401 });

  const { action, rejectionReason } = await req.json();

  const enrollmentRef = db.collection("enrollments").doc(params.id);
  const enrollment = await enrollmentRef.get();

  if (!enrollment.exists) {
    return Response.json(
      { error: "Enrollment not found" },
      { status: 404 }
    );
  }

  if (action === "approve") {
    await enrollmentRef.update({
      status: "approved",
      approvedBy: verified.uid,
      approvedAt: new Date(),
    });

    // Enqueue email notification via Pub/Sub
    await enqueueRetryTask("email", {
      to: enrollment.data().clientEmail,
      template: "enrollment_approved",
      data: {
        programName: enrollment.data().programName,
        clientName: enrollment.data().clientName,
      },
    });
  } else if (action === "reject") {
    await enrollmentRef.update({
      status: "rejected",
      rejectionReason,
      approvedBy: verified.uid,
      approvedAt: new Date(),
    });

    // Enqueue rejection email
    await enqueueRetryTask("email", {
      to: enrollment.data().clientEmail,
      template: "enrollment_rejected",
      data: { rejectionReason },
    });
  }

  // Audit log
  await db.collection("audit_logs").add({
    action: `enrollment_${action}`,
    adminId: verified.uid,
    enrollmentId: params.id,
    timestamp: new Date(),
  });

  return Response.json({ success: true });
}
```

---

## Firestore Security Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Admin-only: all programs
    match /programs/{programId} {
      allow read: if getRole(request.auth.uid) == "admin";
      allow write: if getRole(request.auth.uid) == "admin";
      allow delete: if getRole(request.auth.uid) == "admin";
    }

    // Admin: manage enrollments
    match /enrollments/{enrollmentId} {
      allow read: if getRole(request.auth.uid) in ["admin", "manager"];
      allow update: if getRole(request.auth.uid) == "admin" &&
                       (request.resource.data.status == "approved" ||
                        request.resource.data.status == "rejected");
      allow delete: if false;  // Never delete, only archive
    }

    // Admin: manage users
    match /users/{userId} {
      allow read: if getRole(request.auth.uid) == "admin";
      allow write: if getRole(request.auth.uid) == "admin";
      allow delete: if getRole(request.auth.uid) == "admin";
    }

    // Admin-only: immutable audit logs
    match /audit_logs/{logId} {
      allow read: if getRole(request.auth.uid) == "admin";
      allow create: if request.auth != null;  // Any authenticated user can create
      allow update: if false;  // Never update
      allow delete: if false;  // Never delete
    }
  }
}
```

---

## Testing Strategy

### Unit Tests

- Program CRUD operations
- Enrollment approval logic
- User role validation
- KPI calculations

### Integration Tests

- Full approval workflow (request → approve → notification)
- User import via CSV
- Program creation with media
- Audit log immutability

### E2E Tests (Cypress)

```typescript
// e2e/admin-enrollment-approval.cy.ts
describe("Admin Enrollment Approval", () => {
  beforeEach(() => {
    cy.login("admin@sierra.com");
  });

  it("should display pending enrollments", () => {
    cy.visit("/admin/enrollments");
    cy.get("[data-testid=enrollment-table]").should("be.visible");
    cy.get("[data-testid=pending-badge]").should("have.length.greaterThan", 0);
  });

  it("should approve an enrollment", () => {
    cy.visit("/admin/enrollments");
    cy.get("[data-testid=enrollment-row]").first().click();
    cy.get("[data-testid=approve-button]").click();
    cy.contains("Enrollment approved").should("be.visible");
  });

  it("should log approval in audit trail", () => {
    // After approval, check audit logs
    cy.visit("/admin/audit-logs");
    cy.contains("enrollment_approved").should("be.visible");
  });

  it("should send notification email", () => {
    // Verify email was queued in retry queue
    cy.window().then((win) => {
      cy.task("getRetryQueueTasks", {
        type: "email",
        limit: 1
      }).then((tasks) => {
        expect(tasks[0].status).to.equal("completed");
      });
    });
  });
});
```

---

## Performance Optimization

### 1. Real-Time Updates

- WebSocket listeners for approval queue
- Auto-refresh when enrollment status changes
- Debounce rapid updates

### 2. Large Dataset Handling

- Pagination for user list (50 per page)
- Lazy load analytics charts
- Compress audit logs older than 90 days

### 3. Image Optimization

- WebP format for all program images
- Thumbnail generation in Cloud Functions
- CDN caching for static assets

---

## Success Metrics (Post-Deployment)

| Metric | Target | How to Check |
| -------- | -------- | ------------- |
| Admin login time | <1s | Dashboard load time |
| Approval throughput | >20 enrollments/min | Manual testing |
| Audit trail completeness | 100% | Check all actions logged |
| Role enforcement | 100% | Client can't access admin pages |
| Report generation | <5s | Analytics dashboard |
| Data integrity | 100% | No orphaned records |

---

## Go-Live Checklist

**Code & Testing**:

- [ ] All admin routes protected with `verifyAdminRequest`
- [ ] E2E tests passing
- [ ] Audit logging working for all actions
- [ ] Email notifications queued on approval/rejection
- [ ] Role-based permissions validated

**Infrastructure**:

- [ ] Firestore security rules deployed
- [ ] Storage buckets configured for admin uploads
- [ ] Pub/Sub topics for admin notifications

**Ops Readiness**:

- [ ] Admin dashboard monitoring active
- [ ] Alert policies for admin errors
- [ ] Support team trained on admin features

**Team Readiness**:

- [ ] Admins trained on approval workflow
- [ ] Enrollment templates ready
- [ ] FAQ documentation complete

---

## Rollback Plan

If issues discovered:

1. Revert Next.js deployment (1 minute)
2. Manually approve pending enrollments (if needed)
3. Investigate and re-deploy

---

## Phase 3 Timeline

| Week | Tasks |
| ------ | ------- |
| Week 8 (Days 50-56) | Dashboard, program CRUD, database schema |
| Week 9 (Days 57-63) | Approval workflow, user management, emails |
| Week 10 (Days 64-70) | Reports, audit logs, testing, go-live prep |

---

## Dependencies & Gates

**Must be complete before Phase 3 starts**:

- ✅ Phase 1.1 (Firestore Rules)
- ✅ Phase 1.3 (Pub/Sub Retry Queue - for email notifications)
- ✅ Phase 1.4 (Observability - for monitoring)
- ✅ Phase 2 (Client Portal - for enrollment data)

**After Phase 3, can start**:

- Phase 4: Intelligence OS (AI-powered admin agent)
- Phase 5: Mobile apps
- Phase 6: External integrations (PropertyFinder sync, WhatsApp)

---

**Next**: Phase 4 - Intelligence OS & AI Agent (Weeks 11-13)
