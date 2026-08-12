# Design System: Sierra Estates Admin Panel (Unified OS)

## 1. Visual Theme & Atmosphere
A sophisticated, "Cockpit Dense" (Density: 7) yet visually breathable unified operations dashboard. The variance is Predictable Symmetric (3) to ensure massive amounts of data (CRM, Bots, Listings) remain legible. The atmosphere embodies "Quiet Luxury" — it feels like the digital command center of a high-end investment bank: deeply cinematic, glassmorphic, and strictly professional.

## 2. Color Palette & Roles
- **Corporate Navy Canvas** (`#0A1628`) — The primary deep background surface for the entire application. Pure black (`#000000`) is BANNED.
- **Surface Navy** (`#152232`) — Elevated card and container fill (used with backdrop-blur for glassmorphism).
- **Signature Matte Gold** (`#C9A24D`) — The SINGULAR accent color. Used for active states, primary buttons, highlights, and focus rings. High-saturation neon or purple glows are strictly BANNED.
- **Soft Ivory** (`#F4F0E8`) — Primary typography on dark surfaces. Provides lower eye strain than pure white.
- **Muted Platinum** (`rgba(244, 240, 232, 0.5)`) — Secondary text, metadata, subtle borders, and disabled states.
- **Whisper Gold Border** (`rgba(201, 162, 77, 0.2)`) — 1px structural lines, divider borders, and glassmorphic card edges.

## 3. Typography Rules
- **Display & Headings:** `Playfair Display` — Track-tight, controlled scale, weight-driven hierarchy. Used for section titles and primary branding.
- **Body & Arabic:** `Cairo` (for Arabic context) and a modern Sans-Serif (e.g., `Geist` or `Outfit`) for UI text — Relaxed leading, neutral secondary color.
- **Mono / Data:** `Inter` — Strictly reserved for numbers, metrics, KPIs, and data grids.
- **Banned:** Generic system fonts, neon gradients on text. `Inter` is banned for creative headlines, used only for data readability.

## 4. Component Stylings
- **Buttons:** Flat with subtle glassmorphic depth. Tactile -1px translate on active state. Accent fill (Matte Gold) for primary actions, ghost/outline with Gold borders for secondary actions. No outer glow.
- **Cards / Widgets:** Glassmorphic (`backdrop-blur-md`). Background is Surface Navy (`#152232`) at 80% opacity. Borders are Whisper Gold (`rgba(201, 162, 77, 0.2)`). Generously rounded corners (`1rem` or `1.5rem`). Deep, subtle drop shadows (`0 10px 30px rgba(0,0,0,0.4)`).
- **Inputs:** Label above input, error below. Focus ring in Matte Gold. Background is deeper Navy (`#060C16`) with subtle Gold border on focus. No floating labels.
- **Loaders:** Skeletal shimmer matching exact layout dimensions using Matte Gold gradients. No generic circular spinners.
- **Empty States:** Composed, cinematic compositions indicating how to populate data, not just "No data" text.

## 5. Layout Principles
- **Unified Dashboard (Mega Grid):** The UI operates as a single pane of glass. No hard tab switching that hides information entirely. Use CSS Grid to create a responsive masonry or bento-box layout where KPIs, CRM, Bots, and Listings coexist.
- **Collapsible Panes:** Use sidebars or expanding panels for deep-dive editing (e.g., Editing a Listing slides out a panel rather than routing to a new page).
- **Spatial Separation:** No overlapping elements — every widget occupies its own clear spatial zone.
- **Responsive:** Strict single-column collapse below 768px. Max-width containment for ultra-wide monitors.
- **Full Height:** The dashboard is a `min-h-[100dvh]` application viewport.

## 6. Motion & Interaction
- **Spring Physics:** `stiffness: 100, damping: 20` default for all transitions (panel slides, modal popups). Weighty, premium feel.
- **Staggered Cascade:** On initial load, dashboard widgets cascade in sequentially.
- **Hardware Acceleration:** Animate exclusively via `transform` and `opacity`.

## 7. Anti-Patterns (Banned)
- NEVER use pure black (`#000000`).
- NEVER use neon/outer glow shadows.
- NEVER use purple or oversaturated AI aesthetic colors.
- NEVER overlap structural elements.
- NEVER use emojis for professional dashboard icons.
- NEVER use AI copywriting clichés ("Elevate", "Seamless", "Next-Gen").
- NEVER use horizontal scroll on mobile viewports.
