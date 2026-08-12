import * as React from 'react';

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Image URL. When omitted, gold initials are shown. */
  src?: string;
  /** Full name — used for alt text and initials fallback. */
  name?: string;
  /** @default 'md' */
  size?: 'sm' | 'md' | 'lg';
  /** Gold ring outline. @default false */
  ring?: boolean;
}

/** Agent / user avatar with initials fallback. */
export declare function Avatar(props: AvatarProps): JSX.Element;
