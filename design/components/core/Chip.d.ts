import * as React from 'react';

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Selected (gold) state. @default false */
  active?: boolean;
  /** @default 'md' */
  size?: 'sm' | 'md';
  /** Optional leading icon. */
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

/** Toggleable filter pill — beds, compounds, amenities, etc. */
export declare function Chip(props: ChipProps): JSX.Element;
