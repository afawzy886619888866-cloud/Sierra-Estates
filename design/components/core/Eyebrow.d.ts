import * as React from 'react';

export interface EyebrowProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Center layout with rules on both sides (for centered section headers). @default false */
  center?: boolean;
  children?: React.ReactNode;
}

/** Section eyebrow / kicker label. */
export declare function Eyebrow(props: EyebrowProps): JSX.Element;
