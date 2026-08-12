import * as React from 'react';

export interface PropertyCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Cover photo URL. */
  image?: string;
  /** SBR code, e.g. "MV-VL-02" (top-left mono pill). */
  code?: string;
  /** Property title (Cormorant serif). */
  title?: string;
  /** Location line (uppercase mono, e.g. "Mountain View · 5th Settlement"). */
  location?: string;
  /** Formatted price, e.g. "EGP 14.2M" or "EGP 850K/yr". */
  price?: string;
  /** Listing badge label, e.g. "Featured", "Off-Market". */
  badge?: string;
  /** Badge background colour (hex). @default '#C8961A' */
  badgeColor?: string;
  /** AI match score 0–10 (live emerald pill). */
  aiScore?: number;
  beds?: number;
  baths?: number;
  /** Built area in m². */
  area?: number | string;
  /** Saved (heart filled red) state. @default false */
  saved?: boolean;
  /** Called with next saved boolean when the heart is clicked. */
  onSave?: (saved: boolean) => void;
}

/**
 * Signature property listing card.
 * @startingPoint section="Property" subtitle="Listing card with SBR code, AI score & save" viewport="360x400"
 */
export declare function PropertyCard(props: PropertyCardProps): JSX.Element;
