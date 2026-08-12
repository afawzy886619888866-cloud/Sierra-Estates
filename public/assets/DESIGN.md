# Design System Document

## 1. Overview & Creative North Star: "The Digital Concierge"

The design system for sierra estates Realty is anchored by the Creative North Star of **"The Digital Concierge."** Unlike standard, utilitarian admin panels that feel like rigid spreadsheets, this system is designed to feel like a high-end, bespoke editorial experience. It balances the "Operational Confidence" of an AI-driven platform with the "Elegance" of luxury real estate.

The UI rejects the "boxed-in" look. By utilizing intentional asymmetry, sophisticated tonal layering, and generous whitespace, we create a sense of breathing room that reflects the brand’s tagline: *Beyond Brokerage*. The interface doesn’t just show data; it presents intelligence.

---

## 2. Colors & Surface Philosophy

The palette is a dialogue between deep, authoritative Navy and prestigious Gold/Brass accents.

### The "No-Line" Rule
To achieve a premium feel, **1px solid borders are strictly prohibited for sectioning.** Boundaries must be defined through background color shifts or tonal transitions.
- **Surface:** `#f8f9fa` (The canvas)
- **Surface-Container-Low:** `#f3f4f5` (Subtle grouping)
- **Surface-Container-High:** `#e7e8e9` (Active focus)

### Surface Hierarchy & Nesting
Treat the UI as physical layers. Use the `surface-container` tiers to create depth. A `surface-container-lowest` (#ffffff) card should sit on a `surface-container-low` (#f3f4f5) background to create a soft, natural lift.

### The "Glass & Gradient" Rule
For floating elements (modals, dropdowns, or the topbar), use **Glassmorphism**.
- **Token:** `surface_container_lowest` at 80% opacity with a `24px` backdrop-blur.
- **Signature Texture:** Primary CTAs should use a subtle linear gradient from `primary` (#031632) to `primary_container` (#1a2b48) at a 135-degree angle to add "soul" and depth.

---

## 3. Typography: Editorial Authority

The system uses a dual-font strategy to balance character with readability.

*   **Display & Headlines:** `Manrope` — Chosen for its geometric precision and modern elegance. It conveys the "AI-Driven" aspect of the brand.
*   **Body & Labels:** `Inter` (LTR) and `Tajawal` (RTL) — Optimized for high-clarity data consumption.

### Hierarchy
- **Display-LG (3.5rem):** Reserved for high-impact dashboard summaries.
- **Headline-SM (1.5rem):** Used for primary section titles.
- **Title-SM (1rem, Bold):** Used for data labels in tables to ensure "Operational Confidence."
- **Label-SM (0.6875rem):** All-caps for metadata, increasing the editorial feel.

---

## 4. Elevation & Depth: Tonal Layering

We move away from traditional shadows in favor of **Tonal Layering**.

*   **The Layering Principle:** Depth is achieved by stacking. For instance, the Sidebar uses `primary` (#031632), while the main content area uses `surface` (#f8f9fa). High-priority cards use `surface-container-lowest` (#ffffff).
*   **Ambient Shadows:** For "floating" items like the User Profile dropdown, use an extra-diffused shadow:
    *   `box-shadow: 0 12px 32px -4px rgba(3, 22, 50, 0.08);`
*   **The Ghost Border:** If a separator is required (e.g., in complex tables), use `outline-variant` (#c5c6ce) at **15% opacity**. Never use 100% opaque lines.

---

## 5. Components

### Sidebar & Topbar Shell
- **Sidebar:** A solid `primary` block. Navigation items use `on_primary` at 70% opacity for inactive states, shifting to `secondary_fixed` (Gold) for active states.
- **Topbar:** Glassmorphic (`surface_container_lowest` @ 85% + blur) to allow content to scroll elegantly beneath it.

### Specialized Badges & Pills
Badges must be small, high-contrast, and use the `DEFAULT` (0.25rem) roundedness.
- **Source/Sync:** `tertiary_container` with `on_tertiary_container` text.
- **Override:** `error_container` with `on_error_container` text.
- **Status Pills:** Use `full` (9999px) roundedness. For "Draft" or "Manual," use `surface_container_highest` with `on_surface_variant`.

### Complex Data Tables
- **Layout:** Remove all vertical and horizontal lines.
- **Separation:** Use a alternating background color (`surface_container_low`) on hover.
- **Bilingual Support:** Forms and table cells must support `flex-direction: row-reverse` for RTL. The Arabic `Tajawal` font is weighted 10% lighter than `Inter` to visually match its "optical thickness."

### Input Fields
- **Style:** Underlined or "Soft Box."
- **Interaction:** On focus, the bottom border transitions to `secondary` (Gold). Error states use `error` (#ba1a1a) text with a `error_container` subtle background fill.

---

## 6. Do's and Don'ts

### Do:
- **Do** use `20` (5rem) spacing for major section gaps to maintain the "Editorial" feel.
- **Do** align icons and text precisely; in RTL mode, ensure the icon flips (e.g., "arrow-right" becomes "arrow-left").
- **Do** use the Gold/Brass (`secondary`) sparingly as a "Jewelry" accent—for buttons, active states, or critical icons only.

### Don't:
- **Don't** use pure black (#000000). Always use `primary` or `on_surface` for dark tones to maintain the navy-tinted sophistication.
- **Don't** use standard 1px borders to separate table rows. Use `1.5` (0.375rem) of vertical whitespace instead.
- **Don't** use heavy "Drop Shadows." If an element doesn't feel distinct enough, increase the background contrast rather than the shadow intensity.

---

## 7. Responsive Adaptability
- **Desktop:** Utilize 12-column asymmetric grids. The sidebar is fixed at `280px`.
- **Mobile:** The sidebar collapses into a bottom-navigation bar or a glassmorphic "hamburger" overlay. Focus on `body-lg` for readability on smaller screens.