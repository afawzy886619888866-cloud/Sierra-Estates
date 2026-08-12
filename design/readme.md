# Sierra Estates — Design System

**Brand:** Sierra Estates (formerly *Sierra Blu Realty*)
**Product:** AI-driven PropTech "Intelligence OS" for luxury real estate in **New Cairo, Egypt** — rent & resale across ~19 compounds.
**Aesthetic:** Quiet luxury · editorial serif · deep-navy-and-gold · bilingual EN/AR.
**Year:** 2026

---

## 1 · What this is

Sierra Estates is an exclusive property-intelligence platform. Buyers search a curated,
AI-scored inventory across New Cairo compounds (Mivida, Hyde Park, Mountain View, Madinaty,
Eastown, Villette, Taj City…); brokers run the whole demand funnel from an admin "Intelligence
OS". A concierge AI persona, **Sierra**, threads through both — public-facing advisory and
deterministic back-office analytics.

This design system encodes the visual language, tokens and reusable components behind that
product, plus high-fidelity recreations of the two core surfaces.

### Sources (ground truth)
Reconstructed from the attached read-only codebase `Sierra Estates Design System/`:
- **`Sierra Blu Omega Final.html`** — canonical dual-theme token block (`[data-theme="light|dark"]`). Palette + surfaces come from here.
- **`assets/sierra.css` / `sierra.js`** — shared light-theme chrome, AI hub, compound dataset, fuzzy matcher.
- **`sierra/chrome.jsx`, `sierra/icons.jsx`** — hero/nav components and the Lucide-derived icon set.
- **`omega/data_v3.jsx`** — 26 production listings (SBR codes, prices, AI scores, compounds, agents) + Unsplash imagery URLs.
- **`CLAUDE.md`** — brand identity, agent architecture, feature request log.
- GitHub referenced in source: `ahmedfawzy8866/i-sierra-2027` (not fetched here).

> ⚠️ The legacy `README.md` in the source folder described a **navy / sky-blue / Playfair** palette that the shipped product no longer uses. The **gold + red on deep navy, Cormorant Garamond** system below is the real one (confirmed against production screenshots and the Omega Final tokens). Flagged for the owner to confirm.

---

## 2 · Content Fundamentals

**Voice:** confident, refined, direct — "quiet luxury" in copy. Expertise without jargon; short
active sentences. Warmth in the Arabic layer (Levantine/Egyptian, personal).

**Person:** speak to *you* ("Find your dream home", "matched to your brief"). The AI refers to
itself as **Sierra**.

**Casing & formatting:**
- Serif **headlines** in Title Case, often with one italic gold phrase ("Find Your *Dream Home*").
- **UI labels & nav** in UPPERCASE mono with wide tracking ("SITE NAVIGATION", "ALL · RENT · RESALE").
- **SBR codes** UPPERCASE mono: `[Compound]-[Type]-[nn]` → `MV-VL-02`, `HP-VL-04`, `MDN-PH-01`.
- **Prices** always mono: resale `EGP 14.2M`; rent `EGP 850K/yr`; sub-10k values in USD (`$1,800/mo`).

**Emoji:** never in core UI. The *one* on-brand use is the AI-tool tiles (🗺️ 📈 🎯 📷 💬 🧠) and
conversational Sierra replies.

**Bilingual:** every user string exists in English (LTR, Inter) and Arabic (RTL, Cairo).

**Copy examples**
- ✕ "Click here to browse our extensive inventory of luxury residences" → ✓ "Explore curated listings in New Cairo"
- ✕ "Innovative AI-powered property matching engine" → ✓ "Intelligence-led advisory"
- Tagline: **"Future of Real Estate"** · تراث "التميز العقاري برؤية ذكية"

---

## 3 · Visual Foundations

**Dual theme.** One brand, two surfaces, gold as the constant. Set `data-theme` on `<html>`:
- **Dark (default / signature)** — deep navy `#0B1A2E`, used for the hero, app shell, marketing and admin.
- **Light** — ivory `#F7F4EC`, used for content pages, AI tools and documents.

**Color.** Gold `#C8961A` / `#E9C176` is the primary accent (CTAs, active state, rules, data).
Red `#E63946` is the secondary accent (hot/live, the emblem glow). Blue `#1E88D9` and emerald
`#34D399` are status/info. Listing badges carry per-listing hues from the data.

**Type.** *Cormorant Garamond* — display/headlines, set **medium (500) and large**, frequently
italic for the gold flourish; luxury reads as air + serif, not bold weight. *Inter* — all UI and
body. *Cairo* — Arabic RTL. *JetBrains Mono* — prices, SBR codes, eyebrows, nav labels, stats
(uppercase, wide `0.28em` tracking on eyebrows).

**Backgrounds.** Full-bleed property photography (warm, high-contrast New Cairo villas — *not*
low-contrast American stock). A faint gold grid overlay + a soft radial red light animate the
hero. Map canvas uses a subtle dotted texture. No decorative gradients on content surfaces.

**Surfaces & cards.** Elevated navy (`--bg-e`) cards, 16px radius, hairline `rgba(255,255,255,.09)`
border. Resting state is flat; **hover** lifts `-5px`, glows the border gold (`--bd-gold`) and adds
a gold-tinted shadow. Glass surfaces use `backdrop-filter: blur(14–18px)` for the nav and in-hero
filter. Image cards carry a top-to-bottom protection scrim so text/badges stay legible.

**Radius.** chips 6 · buttons/inputs 10 · tiles 14 · cards 16 · panels/modals 24 · pills 999.

**Motion.** Signature silk easing `cubic-bezier(.16,1,.3,1)`. Durations 180 / 280 / 400 / 700ms.
Entrances fade + gentle `translateY` (opacity **always 1** so print/PDF/reduced-motion are safe —
only transform eases). Gold text shimmers on a 6s loop. Pulse rings (gold/red) for live/AI dots.
**No bounce, no off-screen slide-ins.** All decorative motion respects `prefers-reduced-motion`.

**States.** Hover — color shift to gold, border to gold, lift. Press/active — `scale(.98)`.
Focus — 2px gold outline / gold ring on inputs. Disabled — 40% opacity, no transform.

**Iconography.** See §5.

---

## 4 · Component Index

All components are exported on `window.SierraEstatesDesignSystem_210542` (call
`check_design_system` for the live namespace) and consume the CSS custom properties — they adapt
to the active `data-theme` automatically. Each `.jsx` has a sibling `.d.ts`; key ones have a
`.prompt.md`.

**Core** (`components/core/`)
- **Button** — gold-gradient primary CTA + secondary / ghost / danger; sm·md·lg *(starting point)*
- **IconButton** — square/round icon-only button, optional gold solid fill
- **Badge** — mono status/label pill; translucent tones or opaque `solidColor` over photos
- **Chip** — toggleable filter pill (gold when active)
- **Eyebrow** — the signature mono-uppercase-gold section kicker with rule
- **Avatar** — agent/user avatar with gold initials fallback
- **Card** — generic surface: solid / glass / well, optional hover lift

**Forms** (`components/forms/`)
- **Input** — labelled text field with icon, hint & error state
- **Select** — system-styled native select with chevron
- **SegmentedControl** — the All · Rent · Resale pill toggle
- **RangeSlider** — gold price/area slider with live formatted value
- **Switch** — binary toggle

**Property** (`components/property/`)
- **PropertyCard** — flagship listing card: photo · SBR code · listing badge · live AI score · save heart · title/price/specs *(starting point)*
- **StatBlock** — headline stat grid (mono gold values)

**Navigation** (`components/navigation/`)
- **Tabs** — underline tab bar with animated gold ink + counts

**AI** (`components/ai/`)
- **AITile** — Sierra AI-hub module tile (the on-brand home for emoji)

---

## 5 · Iconography

- **Primary set: Lucide** (line icons, 2px stroke, round caps, 20–24px). The source ships a
  Lucide-derived inline set (`sierra/icons.jsx`); cards and kits here load Lucide from CDN
  (`unpkg.com/lucide`) — visually identical. Use `<i data-lucide="search"></i>` then
  `lucide.createIcons()`.
- **Emoji** — reserved strictly for AI-tool tiles and conversational replies (🗺️ 📈 🎯 📷 💬 🧠 🔎). Never in core UI.
- **Brand marks** in `assets/`: `logo-gold.png` (3D gold shield — use on light) and
  `logo-red.png` (red line-art shield with glow — use on dark). Both depict a city-skyline +
  upward-arrow shield emblem.
- No hand-rolled decorative SVG; no unicode-glyph icons.

---

## 6 · File Index

```
styles.css                     ← consumers link THIS (only @imports the token layers)
tokens/
  colors.css       brand palette + [data-theme] light/dark surface stacks
  typography.css   fonts (Cormorant/Inter/Cairo/JetBrains Mono) + type scale + text classes
  spacing.css      spacing (8px base), radius, elevation
  motion.css       durations, silk easing, keyframes, reveal/lift utilities
  base.css         element resets
guidelines/        foundation specimen cards → "Colors / Type / Spacing / Brand" tabs
components/
  core/  forms/  property/  navigation/  ai/    ← each: Name.jsx + Name.d.ts (+ .prompt.md) + one @dsCard .html
ui_kits/
  web-app/         Client Portal — mobile-first responsive (Mobile v23-7): hero, AI listings, live Leaflet map, 360° tour, AI hub + 12 sheets; EN/AR + dark/light
  admin/           Intelligence OS — KPIs, S1→S9 pipeline, agent fleet, CRM, OpenClaw terminal
assets/            logo-gold.png · logo-red.png
SKILL.md           Agent-Skills / Claude Code handoff
```

The **Design System** tab renders every `@dsCard`-tagged HTML: ~16 foundation cards + 5 component
demos + the two UI-kit previews.

---

## 7 · Caveats & next steps

- **Fonts are loaded from Google Fonts CDN** (Cormorant Garamond, Inter, Cairo, JetBrains Mono).
  The only self-hosted binary in the source was `Geist-Regular.ttf`, which is *not* part of the
  real brand stack — omitted. If you want fully self-hosted webfonts, supply the four families and
  I'll swap the `@import` for `@font-face` rules.
- **Palette conflict** between the legacy source README and shipped product — resolved in favour of
  the gold/navy Omega Final tokens. Please confirm.
- Listing imagery uses the production Unsplash URLs from `data_v3.jsx`.
- UI kits are cosmetic recreations (fake data, click-through), not production code.
