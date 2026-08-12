# OpenClaw Architect Mode — Design Document

## Concept

OpenClaw acts as an **AI architect** for the Sierra Estates portal. When you
describe a change in natural language (e.g., "add a mortgage calculator below
the listings" or "change the hero background to a sunset image"), OpenClaw:

1. **Analyzes** the current codebase
2. **Plans** the best approach based on existing patterns
3. **Proposes** the change for your approval
4. **Executes** only after you approve
5. **Never deploys** without explicit permission

## How It Works

```
You: "Add a contact form in the footer"
         ↓
OpenClaw reads the codebase
         ↓
OpenClaw plans: "I'll add a <form> in the footer section with
   name, email, message fields matching the existing .form-group
   pattern. I'll reuse the shared.css form styles."
         ↓
OpenClaw shows you the diff
         ↓
You: "Yes, do it"
         ↓
OpenClaw makes the change locally
         ↓
You review → approve → OpenClaw commits + pushes
         ↓
GitHub Pages rebuilds automatically
```

## What OpenClaw Can Do

| Action | Example Prompt |
|--------|---------------|
| Add a section | "Add a testimonials carousel after the stats section" |
| Modify styling | "Make the hero text larger on mobile" |
| Add a page | "Create a mortgage calculator page" |
| Fix a bug | "The map markers overlap on zoom out" |
| Update content | "Change the phone number in the contact section" |
| Add a feature | "Add a dark/light toggle to the career page" |
| Optimize | "Lazy-load all images below the fold" |

## What OpenClaw Cannot Do (Without Permission)

- ❌ Push to GitHub without approval
- ❌ Deploy changes without showing you a preview
- ❌ Delete files without confirmation
- ❌ Modify security-sensitive files (.env, service-account.json, SSL certs)
- ❌ Change the Firebase configuration

## Wiring with Backend (Future)

When the portal is wired to Firestore:

1. **Admin page** edits content (slides, listings, compounds, tours)
2. **OpenClaw** can suggest admin page changes based on user behavior analytics
3. **Insights section** reads from Firestore `houyez_listings` collection
4. **Admin** can change which properties appear in "Best Listings" by updating
   AI scores or tags in Firestore
5. **Changes appear instantly** on the live site (no redeploy needed)

## Current State

The portal is currently a **static HTML site** on GitHub Pages. Content is in
`data.js`. To make it fully dynamic:

1. Set up Firebase Firestore (already scaffolded in Sierra-Estates-Final)
2. Replace `data.js` reads with Firestore `onSnapshot` subscriptions
3. Build an admin page that writes to Firestore
4. OpenClaw can then suggest content changes via the admin page

## OpenClaw Integration Points

- **Site URL:** https://ahmedfawzy8866.github.io/SE/
- **Repo:** https://github.com/ahmedfawzy8866/SE (gh-pages branch)
- **Admin page (future):** `/admin.html` — CRUD for all content
- **API (future):** `/api/insights` — returns top listings from Firestore
- **Webhook (future):** OpenClaw calls `/api/proposed-change` → admin approves → change applies
