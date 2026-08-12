# 🔐 Security Rules & Role Gating
> **Path:** `docs/memory/security_rules.md`  
> **Parent Node:** `docs/memory/index.md`

This document details the critical Firestore security rules and authentication gating structure inside Sierra Estates to guarantee data privacy and role compliance.

---

## 🔒 Master Role Gating Architecture

Users are authenticated via **Firebase Auth**. Access to operational data in Firestore is gated based on custom user documents stored in the `users/{uid}` collection.

### Valid Roles:
*   `admin` — Complete control over configuration, agents, leads, and API triggers.
*   `manager` — CRM access, deal scoping, listing publishes.
*   `agent` — Matches client requests, triggers viewings, logs customer communications.

---

## 📝 Firestore Rules Enforcement (`firestore.rules`)

These rules are enforced globally to prevent unauthorized writes or reading of private leads/deals:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
    function isSignedIn() {
      return request.auth != null;
    }
    
    function getUserData() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }
    
    function isStaff() {
      return isSignedIn() && 
        (getUserData().role == 'admin' || 
         getUserData().role == 'manager' || 
         getUserData().role == 'agent');
    }

    // Gated Rules
    match /users/{userId} {
      allow read, write: if isSignedIn() && request.auth.uid == userId;
    }

    match /listings/{listingId} {
      allow read: if true; // Publicly searchable listings
      allow write: if isStaff(); // Staff only write
    }

    match /leads/{leadId} {
      allow read, write: if isStaff(); // Highly confidential leads
    }

    match /deals/{dealId} {
      allow read, write: if isStaff(); // Real estate contracts & deals
    }
  }
}
```

---

## 🚨 Guard rails for future migrations
1.  **Do not deploy rules without local test checks!** Running `pnpm test` executes the unit tests which validate these rules against the Firebase Emulator before they are uploaded.
2.  **Ensure every staff user has a corresponding document in `/users` collection** specifying their role, otherwise they will be blocked from accessing the CRM dashboard.

