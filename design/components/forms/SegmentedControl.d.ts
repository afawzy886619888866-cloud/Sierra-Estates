import * as React from 'react';

export interface SegmentOption { value: string; label: string; }

export interface SegmentedControlProps {
  /** Options as strings or {value,label}. */
  options: Array<string | SegmentOption>;
  /** Currently selected value. */
  value: string;
  /** Called with the new value on change. */
  onChange?: (value: string) => void;
  /** @default 'md' */
  size?: 'sm' | 'md';
  className?: string;
}

/** Pill segmented control (e.g. All · Rent · Resale). */
export declare function SegmentedControl(props: SegmentedControlProps): JSX.Element;
