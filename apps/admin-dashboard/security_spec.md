# Firebase CRM Security Specification & Rules Audit

This spec defines our Zero-Trust access model protecting Sierra Estates 3.0 Real-time CRM.

## 1. Data Invariants

1. **Strict Admin Rule**: Only authenticated, email-verified users with a bootstrapped permission of `A.fawzy8866@gmail.com` or listed in the `/admins` collection can write to `leads`, `listings`, `agents`, `workflows`, or `chats`.
2. **Timestamps Validated**: Creation coordinates `createdAt` and `updatedAt` must match `request.time` exactly.
3. **Immutability Checklist**: Core fields (`code`, `createdAt`, `ownerId`) cannot be mutated upon update.
4. **Valid ID Rule**: Every document ID must conform to alphanumeric characters and be under 128 characters: `^[a-zA-Z0-9_\-]+$`.
5. **Verified Email Mandate**: `request.auth.token.email_verified == true` is required for any operation by and for an administrator.

## 2. The "Dirty Dozen" Payloads

Here are the 12 payloads representing targeted security compromise attacks. They must all produce `PERMISSION_DENIED`:

### Identity Spoofing (PII / Owner Hijacking)
1. **Unauthenticated Read on Leads**: anonymous read requests.
2. **Admin Spoofing by Email String**: writing to `/admins/{anyUserId}` from an unverified admin email.
3. **Lead Author Hijacking**: creating a Lead with another broker's UID in `ownerId`.

### Integrity Violation (State and Code injection)
4. **Giant ID Poisoning**: Trying to create a listing where document ID is 5KB.
5. **Shadow Field Injection**: Saving custom unauthorized fields (e.g. `isVerified: true`) in a Lead.
6. **Negative Value / Giant Load**: Overriding agent CPU load indicator with `999999%` or `-234` to exhaust database compute.
7. **Malformed Schema Field**: Saving a Listing price as a deep JSON map instead of a structured EGP string.

### Immutable Violation (Time / ID Grafting)
8. **Forged Timeline**: Setting backdated or client-based `createdAt` values for historical forgery.
9. **Mutation of Immutables**: Attempting to alter `code` or `cmp` of a listing during an AVM slider change.

### Access Bypass (Loose Queries / Role Elevation)
10. **Listing Database Scrape**: Scraping listing catalogs without proper Admin validation.
11. **Self-Elevated Access**: An authenticated regular user trying to write an admin role into their user profile directly.
12. **Bypassing Verification Gate**: Authenticated user with email `A.fawzy8866@gmail.com` but `email_verified == false` trying to perform sync admin functions.

---

## 3. The Test Runner Spec (`firestore.rules.test.ts`)

Included here is illustrative structure referencing `@firebase/rules-unit-testing` or similar, validating constraints:

```typescript
import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { setDoc, getDoc, collection } from 'firebase/firestore';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "sierra-blu-realty",
    firestore: {
      rules: require('fs').readFileSync('firestore.rules', 'utf8')
    }
  });
});

test("Anonymous user cannot read leads", async () => {
  const unauthedDb = testEnv.unauthenticatedContext().firestore();
  await expect(getDoc(doc(unauthedDb, "leads/lead-123"))).rejects.toThrow();
});

test("Unverified admin cannot access workflows", async () => {
  const customDb = testEnv.authenticatedContext("user_abc", {
    email: "A.fawzy8866@gmail.com",
    email_verified: false
  }).firestore();
  await expect(setDoc(doc(customDb, "workflows/wf-1"), { name: "Ingestion" })).rejects.toThrow();
});
```
