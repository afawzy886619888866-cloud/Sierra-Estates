<!-- Generated: 2026-08-02 | Files scanned: ~200 | Token estimate: ~600 -->

# Sierra Estates Frontend Architecture

## Client Portal (`apps/sierra-estates-realty`)
Next.js 15+ App Router application with Tailwind CSS and React Server Components.

### Key Routes
- `/` → Home page with search bar, featured compounds.
- `/properties` → Listing grid with advanced filters (price, area, compound, bedrooms).
- `/properties/[id]` → Single property detail view with high-res galleries, map, and "Contact Agent" form.
- `/compounds` → Directory of major developments (e.g., Mountain View, Palm Hills).

### State Management & Data Fetching
- **Server Components**: Used for direct Firestore reads on initial load (SEO & Performance).
- **Client Hooks**: 
  - `usePFListings` (Real-time syncing with Firebase active listings).
  - `usePFLeads` (Live updates for CRM status).

## Admin Dashboard (`apps/admin-dashboard`)
Next.js SPA heavily utilizing client-side rendering for real-time reactivity.

### Key Routes
- `/admin` → High-level metrics (Leads received, viewings scheduled).
- `/admin/properties` → Data grid of all inventory. Actions: Sync to PF, Edit, Archive.
- `/admin/leads` → Kanban board of incoming leads (New → Contacted → Viewing → Offer).
- `/admin/agents` → AI Agent configuration (Matchmaker prompt tuning, WhatsApp active sessions).

### UI Library
- Custom components built on Radix UI primitives and Tailwind CSS.
- Motion/Animations using Framer Motion (glassmorphism themes).
