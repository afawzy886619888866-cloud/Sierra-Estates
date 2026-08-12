---
name: sierra-estates-design
description: Use this skill to generate well-branded interfaces and assets for Sierra Estates (AI-driven luxury PropTech for New Cairo, Egypt), either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the `readme.md` file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Fast orientation
- **Brand:** Sierra Estates — quiet-luxury, bilingual (EN/AR) property intelligence for New Cairo. Gold + red on deep navy; ivory light theme. Tagline "Future of Real Estate".
- **Link `styles.css`** (root) for all tokens. Set `data-theme="dark"` (signature) or `data-theme="light"` on `<html>`.
- **Type:** Cormorant Garamond (display, medium/italic) · Inter (UI) · Cairo (Arabic) · JetBrains Mono (prices, SBR codes, eyebrows). All via Google Fonts.
- **Color:** gold `#C8961A`/`#E9C176`, red `#E63946`, navy `#0B1A2E`, ivory `#F7F4EC`, emerald `#34D399`, blue `#1E88D9`.
- **Components:** bundled on `window` — see `readme.md §4`. Mount in plain HTML via
  `<script src=".../_ds_bundle.js">` then `const { Button, PropertyCard, … } = window.SierraEstatesDesignSystem_<id>`.
- **Icons:** Lucide (line, 2px). Emoji only in AI tiles.
- **Assets:** `assets/logo-gold.png` (on light), `assets/logo-red.png` (on dark).

## Signature moves
- Eyebrow = mono uppercase gold with a leading rule. Headlines = serif with one italic gold phrase.
- Prices/SBR codes/data always in JetBrains Mono. SBR format `MV-VL-02`.
- Cards: 16px radius, hairline border, hover lifts −5px + gold border glow + image zoom.
- Motion: silk easing `cubic-bezier(.16,1,.3,1)`; entrances keep opacity 1; respect reduced-motion.
