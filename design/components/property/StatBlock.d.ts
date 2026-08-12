import * as React from 'react';

export interface Stat { value: React.ReactNode; label: string; }

export interface StatBlockProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Stats to render, each {value, label}. */
  stats: Stat[];
  /** Column count. Defaults to number of stats. */
  columns?: number;
}

/** Headline stat grid — mono gold values with uppercase labels. */
export declare function StatBlock(props: StatBlockProps): JSX.Element;
