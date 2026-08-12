# Sierra Estates Design System

**Status:** Unified (merged from sierra-estates)  
**Date:** 2026-06-08

## Overview
Luxury real-estate design language for Sierra Estates — "Quiet Luxury" aesthetic with navy (#0A1F44) and gold (#D4AF37) accents.

## Components
- **LuxurySkeleton** — Loading state with gradient pulse
- **PremiumHero** — Hero banner component with luxury styling

## Design Tokens
### Colors
- `$navy-structure` — #0A1F44 (primary structure)
- `$gold-jewelry` — #D4AF37 (accent)
- `$tonal-gradient` — Navy-to-gold diagonal

### Typography
See `design-tokens.scss` for Tailwind v4 integration.

## Usage
```tsx
import { LuxurySkeleton, PremiumHero } from '@sierra/ui/design-system';

export default function Page() {
  return (
    <>
      <PremiumHero title="Luxury Properties" />
      <LuxurySkeleton />
    </>
  );
}
```

## Future
- Expand component library (cards, modals, forms)
- Add Figma design system spec
- Document accessibility patterns
- Bilingual (en/ar) component variants
