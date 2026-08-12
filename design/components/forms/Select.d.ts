import * as React from 'react';

export interface SelectOption { value: string; label: string; }

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  /** Field label. */
  label?: string;
  /** Options as strings or {value,label}. Ignored if children are provided. */
  options?: Array<string | SelectOption>;
  /** Disabled first option shown when nothing is selected. */
  placeholder?: string;
  children?: React.ReactNode;
}

/** System-styled native select with chevron. */
export declare function Select(props: SelectProps): JSX.Element;
