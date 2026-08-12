import * as React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Surface style. `glass` = translucent blur; `well` = recessed. @default 'solid' */
  variant?: 'solid' | 'glass' | 'well';
  /** Apply standard 24px padding. @default true */
  pad?: boolean;
  /** Enable the gold hover lift. @default false */
  hover?: boolean;
  children?: React.ReactNode;
}

/** Generic surface container / panel. */
export declare function Card(props: CardProps): JSX.Element;
