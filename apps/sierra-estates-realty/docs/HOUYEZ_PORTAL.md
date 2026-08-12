# Houyez-Style Portal — Dynamic Data Architecture

The `/clients` page renders a **Houyez-Style Portal** as its first section.
The portal is **fully dynamic**: all content (hero slides, compounds, 360°
rooms, listings, stats) is fetched live from Firestore and re-renders in
real-time whenever an admin edits a document.

## Data flow

```
data/houyez-properties.ts          ← static seed (fallback + initial paint)
        │
        ▼
lib/houyez/firestore.ts            ← Firestore subscriptions + seed helpers
        │
        ▼
lib/houyez/useHouyezPortal.ts      ← React hook: subscribes to 4 collections
        │
        ▼
components/houyez-portal/HouyezPortal.tsx   ← renders live data
        │
        ▼
app/clients/page.tsx               ← embeds <HouyezPortal />
```

## Firestore collections

Four collections power the portal. Each doc has an `order: number` field
(ascending = earlier in the UI) and bilingual `en`/`ar` fields.

| Collection          | UI section                 | Doc shape                                                                  |
| ------------------- | -------------------------- | -------------------------------------------------------------------------- |
| `houyez_slides`     | Hero slider                | `{ pre, preAr, main, mainAr, img, order }`                                |
| `houyez_compounds`  | Compounds grid             | `{ name, nameAr, zone, zoneAr, count, img, order }`                       |
| `houyez_rooms`      | 360° rooms strip           | `{ name, nameAr, sub, subAr, img, order }`                                |
| `houyez_listings`   | AI-curated listings grid   | `{ code, cmp, cmpAr, zone, zoneAr, type, typeAr, beds, bath, area, egpM, usd, ai, tag, tagAr, mode, modeAr, agent, agentAr, ago, agoAr, img, order, active }` |

The `houyez_listings.active` boolean is the soft-delete flag — set `false`
to hide a listing without deleting the doc.

## Seeding

The first time you deploy, the four collections are empty. The portal will
render with the static seed data (from `data/houyez-properties.ts`) and show
a small orange "Demo data" badge at the top.

To populate Firestore, call the seed endpoint:

```bash
# Default: skip collections that already have docs
curl -X POST https://your-app.vercel.app/api/houyez/seed \
  -H "Content-Type: application/json" \
  -H "x-admin-key: $ADMIN_API_KEY" \
  -d '{}'

# Force re-seed (wipe + re-insert)
curl -X POST https://your-app.vercel.app/api/houyez/seed \
  -H "Content-Type: application/json" \
  -H "x-admin-key: $ADMIN_API_KEY" \
  -d '{"overwrite": true}'
```

The endpoint is `app/api/houyez/seed/route.ts`. It's auth-gated by
`ADMIN_API_KEY` (header `x-admin-key`). In dev with no `ADMIN_API_KEY` set,
the endpoint is open for convenience.

You can also call the seed function directly from a script:

```ts
import { seedHouyezPortal } from '@/lib/houyez/firestore';
await seedHouyezPortal({ overwrite: false });
```

## Real-time updates

The portal uses Firestore `onSnapshot` listeners. When an admin edits a doc
via Firebase Console, the admin portal, or any other client:

1. Firestore pushes the change to all connected clients.
2. The corresponding `useHouyezPortal()` state setter fires.
3. The portal re-renders with the new data.

No redeploy, no refresh, no polling.

## Fallbacks

The portal never renders blank. The static seed data is used when:

- Firebase client isn't configured (dev without `NEXT_PUBLIC_FIREBASE_*` env vars).
- A collection is empty (first run before seeding).
- The subscription fails (network error, permission denied).

In all three cases, `usingSeed` becomes `true` and the orange "Demo data"
badge appears at the top of the portal.

## Stats are computed live

The stats strip at the bottom of the portal shows:

- **Live Listings** — `listings.length` (active listings count from Firestore)
- **24/7 Expert Support** — static
- **100% Verified Properties** — static
- **Avg AI Match Score** — `mean(listings.ai)`, computed with `useMemo`

So when an admin deletes a listing or changes its `ai` score, the average
updates automatically.

## Editing content

Admins have three ways to edit portal content:

1. **Firebase Console** — directly edit docs in `houyez_*` collections.
2. **Admin portal** — build a UI that calls `upsertHouyezDoc()` from
   `lib/houyez/firestore.ts` (already exported, ready to wire to a form).
3. **API** — write a custom admin route that calls `upsertHouyezDoc()`.

The `upsertHouyezDoc(col, data, id?)` helper:
- Omit `id` → creates a new doc with auto-id.
- Pass `id` → merges into the existing doc (partial updates OK).

## See also

- `components/houyez-portal/HouyezPortal.tsx` — the React component
- `components/houyez-portal/houyez-portal.css` — scoped styles (cyan + navy palette)
- `data/houyez-properties.ts` — static seed + TypeScript types
- `lib/houyez/firestore.ts` — Firestore subscriptions + seed + upsert
- `lib/houyez/useHouyezPortal.ts` — React hook
- `app/api/houyez/seed/route.ts` — admin seed endpoint
