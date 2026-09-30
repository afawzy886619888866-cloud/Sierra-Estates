# 📦 Announcement — Heavy Assets Relocated to `SE-assets-archive`

**Date:** 30 September 2026 · **Status:** Completed · **Nothing deleted — preserved.**

To keep this deploy repo lean (clones + Vercel builds), **14 unreferenced asset files (~64.5 MB)** were relocated out of this repository into a dedicated archive repository:

> **`sierrablue8866-droid/SE-assets-archive`**
> https://github.com/sierrablue8866-droid/SE-assets-archive

## What was relocated

| Set | Files | Size | Why safe |
|-----|-------|------|----------|
| `apps/sierra-estates-realty/public/cairo-plaza/` | 12 media files: `ai-concept-*.png`, `real-frontage-enhanced.png`, `real-tower-enhanced.png`, `cairo-plaza-site-panorama.jpg`, 5 unused ad creatives in `ads/`, 1 style reference in `social/` | ~34.8 MB | Zero references in application code (audited 2026-09-30) |
| `apps/sierra-estates-realty/public/feeds/` | `propertyfinder-all-units.xml`, `propertyfinder-owners-full.xml` | ~29.7 MB | Legacy XML snapshots, zero code references |

## What was intentionally kept (actively used)

- **The Cairo Plaza microsite media** — 81 files (~87 MB) referenced by `CairoPlazaExperience.tsx`, `CairoPlazaScene.tsx`, admin views, and the `/cairo-plaza` + `/ar/cairo-plaza` routes. Removing these would break live pages.
- **`public/feeds/propertyfinder-feed.xml`** — primary data source read by `/api/feeds/property-finder` (with DB generation fallback) and linked as "Static XML" in the Admin Portal.
- **`public/feeds/propertyfinder-photos-only.xml`** — small (36 KB), harmless.

## Restoring an archived file

Copy it back at the matching path under `apps/sierra-estates-realty/public/` from the archive repo.
