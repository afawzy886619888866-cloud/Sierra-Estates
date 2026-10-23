# Design System: Sierra Estates (i:Sierra 2027)

## 1. Visual Theme & Atmosphere

- **Mood:** A refined, cinematic luxury interface embodying Apple-style minimalism and editorial elegance. The atmosphere is prestigious, quiet, and weightless — like a high-end private wealth management portal or an architectural design studio.
- **Density:** 4 (Art Gallery Airy & Balanced)
- **Variance:** 8 (Offset Asymmetric & High Agency)
- **Motion:** 6 (Fluid & Cinematic Spring Motion)
- **Spatial Depth:** Multi-layered Z-axis elevation with glassmorphic translucency (`backdrop-filter: blur(16px)`), subtle metallic whisper borders, and soft diffused shadows (`box-shadow: 0 20px 40px rgba(0,0,0,0.25)`).

## 2. Color Palette & Roles

- **Deep Navy Surface** (`#0A1628`) — Primary background canvas and deep void containment.
- **Pure Dark Elevation** (`#07121E`) — Secondary surface fill for inset components, search headers, and dark cards.
- **Signature Matte Gold** (`#C9A24D`) — Singular luxury accent for primary CTAs, active states, score badges, and logo accents. Saturation calibrated below 75%.
- **Soft Gold Highlight** (`#E9C176`) — Subtle highlight variant for micro-animations and active indicators.
- **Soft Ivory Ink** (`#F4F0E8`) — Primary text fill on dark surfaces (soft contrast without hash glare).
- **Muted Slate** (`#8E9BAE`) — Secondary metadata, subheadings, and descriptive helper text.
- **Whisper Border** (`rgba(201, 162, 77, 0.22)`) — 1px glassmorphic borders and structural dividing rules.
- **Translucent Fill** (`rgba(244, 240, 232, 0.04)`) — Card fill for subtle elevation without heavy backgrounds.

*Strict Rules:* Maximum 1 accent color (`#C9A24D`). Pure black (`#000000`) is strictly BANNED. Neon outer glows and purple/cyan AI gradients are strictly BANNED.

## 3. Typography Rules

- **Display & Headlines (EN):** `Playfair Display` or `Cormorant Garamond` — Track-tight (`letter-spacing: -0.02em`), controlled scale, editorial luxury with weight-driven hierarchy.
- **Body Text (EN):** `Plus Jakarta Sans` or `Outfit` — Relaxed line height (`line-height: 1.6`), max 65 characters per line, Soft Ivory ink.
- **Arabic UI & Headlines (AR):** `Cairo` — Clean, well-spaced Arabic typography with native font-weight variations.
- **Data, Numbers & Analytics:** `JetBrains Mono` — Forced for all numerical figures, AI scores, price tags, and property specs.
- **Banned:** `Inter` is BANNED for creative text and headlines (permitted only for low-level system logs if necessary). Generic serif fonts (`Times New Roman`, `Georgia`) are strictly BANNED.

## 4. Hero Section Architecture

- **Structure:** Asymmetric split hero layout with a high-impact primary headline and inline visual punctuation.
- **Inline Image Typography:** Contextual micro-photos embedded directly between words in the main headline, rounded (`border-radius: 999px`), acting as visual punctuation.
- **No Overlapping:** Text must never overlap images or secondary UI elements. Every element occupies a clean spatial zone.
- **CTA Restraint:** Single primary CTA ("Explore Portfolio") in Signature Matte Gold. No redundant secondary links.
- **Zero Filler:** "Scroll to explore", bouncing chevrons, and floating scroll arrows are strictly BANNED.

## 5. Component Stylings

- **Buttons:** Tactile feedback on active state (`transform: translateY(1px)`). Signature Matte Gold fill for primary actions with dark navy text (`#07121E`). Outline/glassmorphic ghost buttons for secondary actions. No neon glows or custom cursors.
- **Cards:** Glassmorphic translucent cards (`backdrop-filter: blur(12px)` + `rgba(244, 240, 232, 0.04)` fill). Border tint aligned to Whisper Gold (`rgba(201, 162, 77, 0.22)`). Generous rounding (`1rem` / `16px`). Used strictly when elevation communicates structure.
- **Inputs & Filters:** Top-aligned labels, helper text below. Minimalist under-border or pill-shaped glass container. Focus ring in Signature Matte Gold (`#C9A24D`). Floating labels BANNED.
- **Loading States:** Skeletal shimmer loaders matching exact element dimensions. Generic spinning loader wheels BANNED.
- **Badges & Tags:** Compact tags (`padding: 4px 10px`, `border-radius: 6px`) with monospace numbers and Signature Matte Gold accents.

## 6. Layout Principles

- **Grid Architecture:** Strict CSS Grid over Flexbox math. No `calc()` percentage hacks.
- **Containment:** Max-width constraint of `1400px` centered with fluid edge padding (`clamp(1.5rem, 5vw, 4rem)`).
- **Height Rules:** Full-viewport sections use `min-h-[100dvh]` to prevent iOS Safari viewport jumps.
- **No 3-Equal Cards:** Generic "3 equal feature cards in a row" layouts BANNED — replaced by asymmetric 2-column zig-zag or horizontal interactive carousels.

## 7. Responsive & Mobile Rules

- **Mobile-First Collapse (< 768px):** All multi-column grids collapse to a clean single column.
- **Zero Horizontal Overflow:** Page body width strictly constrained to `100vw` / `100%`.
- **Fluid Scaling:** Headlines scale using CSS `clamp()` functions.
- **Touch Targets:** Minimum tap target of `44px x 44px` on all interactive buttons and chips.
- **Inline Hero Images:** Inline typographic photos stack below headline gracefully on screens smaller than `640px`.

## 8. Motion & Interaction Philosophy

- **Spring Physics:** All micro-interactions use weightless spring curves (`stiffness: 100, damping: 20`). No linear easing.
- **Cascade Reveals:** List items and card grids mount with staggered entry delays (`0.08s` stagger interval).
- **Perpetual Micro-Loops:** Ambient glowing indicators, subtle card glows, and live market tickers run on GPU-accelerated infinite loops (`transform` and `opacity` only).
- **GPU Offloading:** `will-change: transform` used for all animated surfaces. Never animate `top`, `left`, `width`, or `height`.

## 9. Anti-Patterns (Banned AI Tells)

- No emojis anywhere in the interface or content.
- No `Inter` font for headlines or editorial text.
- No pure black (`#000000`) or pure harsh white background contrast.
- No neon shadows or purple/blue AI glow effects.
- No 3-column identical card rows.
- No AI copywriting clichés ("Elevate", "Seamless", "Unleash", "Next-Gen", "Tailored").
- No fake round numbers (`99.99%`, `100%`).
- No generic placeholder names ("John Doe", "Acme").
- No filler UI text (e.g. "Scroll to explore", bouncing arrows).
- No broken image links or missing fallback placeholders.
