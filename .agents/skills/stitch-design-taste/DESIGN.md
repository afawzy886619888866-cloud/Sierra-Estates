# Design System: Sierra Estates (i:Sierra 2026/2027)

## 1. Visual Theme & Atmosphere

- **Brand Authority:** **SIERRA ESTATES** (سييرا إيستيتس)
- **Official Slogan:** **FUTURE OF REAL ESTATE** (مستقبل الاستثمار العقاري)
- **Mood:** A refined, cinematic luxury interface embodying Apple-style minimalism and editorial cartography. The atmosphere is prestigious, quiet, and weightless — blending high-end private wealth advisory with state-of-the-art GIS urban intelligence.
- **Density:** 4 (Art Gallery Airy & Balanced)
- **Variance:** 8 (Offset Asymmetric & High Agency)
- **Motion:** 6 (Fluid & Weightless Spring Motion)
- **Spatial Depth:** Multi-layered Z-axis elevation with glassmorphic translucency (`backdrop-filter: blur(16px)`), subtle metallic whisper borders, and soft diffused shadows (`box-shadow: 0 20px 48px rgba(0,0,0,0.3)`).

## 2. Color Palette & Roles

- **Obsidian Deep Base** (`#061122` / `#080E1A`) — Primary dark background canvas and deep void containment.
- **Pure Dark Elevation** (`#0B1526` / `#0F1E36`) — Secondary surface fill for inset components, search headers, and dark cards.
- **Luxury Alabaster Canvas** (`#FAF8F5`) — Primary light mode background.
- **Signature Metallic Gold** (`#EAB308` / `#D4AF37`) — Singular luxury accent for primary brand mark, CTAs, active states, score badges, and slogan illumination.
- **Warm Bronze Accent** (`#B45309` / `#C2410C`) — Light-mode slogan and badge typography.
- **Soft Ivory Ink** (`#F4F0E8`) — Primary text fill on dark surfaces (soft contrast without hash glare).
- **Muted Slate Ink** (`#8E9BAE` / `#94A3B8`) — Secondary metadata, subheadings, and descriptive helper text.
- **Deep Navy Ink** (`#061122`) — Primary text fill on light surfaces.
- **Cyan Neural Vector** (`#2DD4BF` / `#38BDF8`) — Masterplan compound outlines, tech highlights, and live satellite indicators.
- **Whisper Gold Border** (`rgba(234, 179, 8, 0.22)`) — 1px glassmorphic borders and structural dividing rules.

*Strict Rules:* Saturation calibrated to prevent eye fatigue. Pure black (`#000000`) is strictly BANNED. Neon outer glows, side-stripe borders, and generic purple/cyan SaaS gradients are strictly BANNED.

## 3. Brand Identity & Logo Architecture

- **Emblem Mark:** 3D Gold-Trimmed Shield featuring architectural pyramids, residential roof foundation, and glowing neural network circuitry.
- **Alpha Transparency:** 100% true alpha transparency (`channels: 4, hasAlpha: true`). Zero bounding boxes, zero rectangular borders.
- **Zero Artifact Lines:** Cleaned geometry eliminating all side drop-shadow artifacts and horizontal dividing rules.
- **Core Vector Assets:**
  - `logo-shield.png` (549 × 800) — Pure isolated emblem mark.
  - `logo-dark.png` (1200 × 1350) — Vertical brand lockup on dark background (White Cinzel title + Gold Inter slogan).
  - `logo-light.png` (1200 × 1350) — Vertical brand lockup on light background (Navy Cinzel title + Bronze Inter slogan).
  - `logo-horizontal-dark.png` (1400 × 340) — Navigation bar and header banner.
  - `whatsapp-business-qr.png` (1024 × 1024) — High-res luxury QR code linked to official WhatsApp channel (`+201092048333`).
  - `sierra-whatsapp-business-card.png` (1200 × 1680) — Complete VIP digital credentials card.

## 4. Typography Rules

- **Display & Brand Title:** `Cinzel` / `Playfair Display` — Track-wide (`letter-spacing: 0.08em` to `0.12em`), uppercase, 900 font-weight, authoritative and timeless.
- **Brand Slogan:** `Inter` / `Plus Jakarta Sans` — All-caps wide tracking (`letter-spacing: 0.14em`), font-weight 800, metallic gold or bronze gradient fill.
- **Body Text (EN):** `Plus Jakarta Sans` or `Outfit` — Relaxed line height (`line-height: 1.6`), max 65 characters per line.
- **Arabic UI & Brand (AR):** `Cairo` — Clean, modern Arabic typography with native font-weight variations (`سييرا إيستيتس` · `مستقبل الاستثمار العقاري`).
- **Data, Coordinates & Numbers:** `JetBrains Mono` — Forced for all numerical figures, GPS coordinates, property areas (SQM), and price tags (EGP/USD).

## 5. Interactive Logo & Brand Component Logic

The official `<SierraBrandLogo />` component implements reactive, high-polish interaction logic:
1. **Interactive Parallax / 3D Tilt:** On mouse move, calculates normalized cursor offset and applies GPU-accelerated micro-rotation (`perspective(800px) rotateX(...) rotateY(...) scale3d(1.02, 1.02, 1.02)`).
2. **Light-Sweep Sheen:** On hover, a metallic gold specular reflection sweeps across the shield emblem (`clip-path` + linear gradient sweep).
3. **VIP Modal & Quick Connect:** Clicking the logo or VIP badge triggers the floating VIP Credentials Drawer featuring:
   - Verified brand seal and authority license.
   - High-resolution scan-ready WhatsApp QR code.
   - One-click direct VIP chat with Sierra Estates (`+201092048333`).
   - One-click copy for official portfolio link (`https://sierra-estates.net`).
   - Instant language switch between English and Arabic (`EN ⇋ AR`).
4. **Theme-Aware Swap:** Dynamic asset switching between `logo-dark.png` and `logo-light.png` based on system theme.

## 6. Layout Principles & Anti-Patterns

- **No Overlapping:** Every element occupies a clean spatial zone.
- **Asymmetric Grid:** Fluid CSS Grid layouts, avoiding predictable equal-3-column card rows.
- **Containment:** Max-width constraint of `1400px` centered with fluid edge padding (`clamp(1.5rem, 5vw, 4rem)`).
- **Height Rules:** Full-viewport sections use `min-h-[100dvh]` to eliminate iOS Safari viewport jumps.
- **Anti-Patterns Banned:** No emojis in code/interface text, no generic serif fonts (`Times New Roman`, `Georgia`), no artificial round percentages, and no AI copywriting clichés ("Elevate", "Seamless", "Unleash").
