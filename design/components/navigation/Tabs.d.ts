import * as React from 'react';

export interface TabItem { value: string; label: string; count?: number; }

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Tabs as strings or {value,label,count}. */
  tabs: Array<string | TabItem>;
  value: string;
  onChange?: (value: string) => void;
}

/** Underline tab bar with animated gold ink + optional counts. */
export declare function Tabs(props: TabsProps): JSX.Element;
