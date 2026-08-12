import * as React from 'react';

export type BadgeTone = 'gold' | 'red' | 'blue' | 'emerald' | 'violet' | 'neutral';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Translucent-fill colour. @default 'gold' */
  tone?: BadgeTone;
  /** Show a leading status dot. @default false */
  dot?: boolean;
  /** Opaque background colour (hex) for badges placed over photos. Overrides tone fill. */
  solidColor?: string;
  /** Optional leading icon. */
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

/** Status / label pill in mono uppercase. */
export declare function Badge(props: BadgeProps): JSX.Element;
