import * as React from 'react';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** @default 'md' (44px) */
  size?: 'sm' | 'md' | 'lg';
  /** Pill/circular shape. @default false */
  round?: boolean;
  /** Gold-gradient solid fill instead of subtle surface. @default false */
  solid?: boolean;
  /** Icon glyph (Lucide <i>/<svg>). */
  children?: React.ReactNode;
}

/** Icon-only button — always pass an `aria-label`. */
export declare function IconButton(props: IconButtonProps): JSX.Element;
