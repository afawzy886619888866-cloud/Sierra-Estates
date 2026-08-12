import * as React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.HTMLAttributes<HTMLElement> {
  /** Visual style. `primary` = gold gradient CTA (signature). @default 'primary' */
  variant?: ButtonVariant;
  /** @default 'md' — never render below md (44px) for touch targets */
  size?: ButtonSize;
  /** Stretch to full container width. @default false */
  block?: boolean;
  /** Disable interaction (button only). @default false */
  disabled?: boolean;
  /** Icon element rendered before the label (e.g. a Lucide <i>/<svg>). */
  iconLeft?: React.ReactNode;
  /** Icon element rendered after the label. */
  iconRight?: React.ReactNode;
  /** Render as a different element, e.g. 'a' for a link CTA. @default 'button' */
  as?: 'button' | 'a';
  children?: React.ReactNode;
}

/**
 * Sierra Estates action button.
 * @startingPoint section="Core" subtitle="Gold-gradient CTA + secondary/ghost/danger" viewport="360x120"
 */
export declare function Button(props: ButtonProps): JSX.Element;
