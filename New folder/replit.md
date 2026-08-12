# Sierra Estates — Premium Real Estate Portal

A luxury real estate website cloned and significantly improved from the original, featuring bilingual support, playing-card property listings, controllable virtual tour, and animated AI intelligence stats.

## Run & Operate

- `pnpm --filter @workspace/sierra-estates run dev` — run the frontend (port 20466)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS v4, Framer Motion, Lucide React
- Fonts: Cormorant Garamond (serif), Inter (sans), Cairo (Arabic)
- API: Express 5
- DB: PostgreSQL + Drizzle ORM (not yet provisioned — frontend-only)

## Where things live

- `artifacts/sierra-estates/src/` — main React app
- `artifacts/sierra-estates/src/contexts/LanguageContext.tsx` — EN/AR i18n with RTL support
- `artifacts/sierra-estates/src/components/` — all UI components
- `artifacts/sierra-estates/src/index.css` — premium dark/gold theme

## Architecture decisions

- Frontend-only app — no backend needed for this portal
- Language context drives RTL/LTR switching at the HTML element level
- CSS-only scroll reveal animations using IntersectionObserver
- Playing card flip is pure CSS `rotateY(180deg)` with `backface-visibility: hidden`
- Virtual tour uses IntersectionObserver + keyboard/pointer/swipe controls, auto-advances every 8s

## Product

- **Hero**: Full-bleed background cycling through 4 luxury properties with search + filter tabs
- **Stats**: Animated number counters (count up from 0 on scroll-into-view)
- **Listings**: 6 curated properties displayed as flippable playing cards — front shows photo, flip reveals details + amenities
- **Virtual Tour**: 7-room navigable tour with thumbnails, keyboard arrows, swipe/drag, fullscreen, and auto-advance
- **Testimonials**: 3 client reviews with 5-star ratings
- **Contact**: Full inquiry form with name/email/phone/budget/message fields
- **Footer**: Social links, site map columns, branding

## User preferences

- English first, Arabic second (toggle in navbar)
- Mobile-first responsive layout
- Premium dark background (#0A0A0A) with gold (#C9A96E) accents
- CSS-based static animations (no heavy JS dynamics)
- Controllable virtual tour (keyboard, click, swipe, fullscreen)

## Gotchas

- Google Fonts `@import` MUST be the very first line in index.css (before Tailwind imports)
- The `@media` rule cannot be used as an inline React style key — use `<style>` tags or CSS classes instead
