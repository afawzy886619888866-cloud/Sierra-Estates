import * as React from 'react';

export interface AITileProps extends React.HTMLAttributes<HTMLElement> {
  /** Emoji or icon glyph (44px slot). AI tiles are the on-brand home for emoji. */
  icon?: React.ReactNode;
  /** Tool name, e.g. "Best ROI Analysis". */
  title: string;
  /** One-line description. */
  desc?: string;
  /** Link target when rendered as an anchor. */
  href?: string;
  /** Element tag. @default 'a' */
  as?: 'a' | 'button';
}

/** AI Support hub tile (icon · title · desc · arrow). */
export declare function AITile(props: AITileProps): JSX.Element;
