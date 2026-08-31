# Sierra Estates Role-Based Access Control (RBAC) Specification

## Overview

Sierra Estates enforces strict Role-Based Access Control across all client portals, administrative dashboards, background agents, and API routes.

---

## Role Hierarchy

| Role | Hierarchy Level | Target Audience | Primary Responsibilities |
| :--- | :--- | :--- | :--- |
| **`super_admin`** | 100 | Founders & CTO | System-wide configuration, environment secret rotation, service account management, and database schema migrations. |
| **`admin`** | 80 | Technical & Operational Leads | Full administrative dashboard access, agent fleet management, workflow overrides, and user role provisioning. |
| **`manager`** | 60 | Sales & Operations Managers | Catalog write/edit access, lead routing approvals, high-value deal review, and broker assignment. |
| **`agent`** | 40 | Licensed Brokers & Sales Agents | Assigned lead interaction, viewing scheduling, property note creation, and contract drafting requests. |
| **`auditor`** | 20 | Compliance & Legal Officers | Read-only access to transaction logs, AVM valuation models, KYC records, and security audit collections. |
| **`service_account`** | 10 | Automated Agents & Cron Bots | Machine-to-machine operations (OpenClaw, VertexOmni, WhatsApp Bot, PropertyFinder sync) using scoped API tokens. |

---

## Granular Permissions Matrix

| Resource / Action | `super_admin` | `admin` | `manager` | `agent` | `auditor` | `service_account` |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Public Listings (Read)** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Public Listings (Write/Edit)** | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| **Leads & Pipeline (All)** | ✅ | ✅ | ✅ | Assigned Only | Read-Only | ✅ |
| **Valuations (AVM Execution)** | ✅ | ✅ | ✅ | Request Only | Read-Only | ✅ |
| **DocuSign / Deal Contracts** | ✅ | ✅ | ✅ | Draft Only | Read-Only | ✅ |
| **Engine Memory Read** | ✅ | ✅ | ✅ | ❌ | Read-Only | ✅ |
| **Engine Memory Write** | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| **Engine Audit Logs (Read)** | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| **Secret Rotation & CI Ops** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## Firestore Security Rules Enforcement

Firestore rules enforce roles via:

```javascript
function isStaff() {
  return request.auth != null
    && exists(/databases/$(database)/documents/users/$(request.auth.uid))
    && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'manager', 'agent'];
}
```

Privileged engine collections (`engine_memory_audit`, `ai_workflow_results`, `propertyfinder_sync`) are strictly write-restricted and audited on every state transition.
