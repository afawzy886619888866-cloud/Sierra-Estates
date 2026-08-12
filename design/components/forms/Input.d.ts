import * as React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Field label rendered above the control. */
  label?: string;
  /** Helper or error text below the control. */
  hint?: string;
  /** Error styling (red border + red hint). @default false */
  error?: boolean;
  /** Leading icon inside the field. */
  icon?: React.ReactNode;
  /** Trailing icon/element inside the field. */
  iconRight?: React.ReactNode;
}

/** Text input with label, icon, hint and error state. */
export declare function Input(props: InputProps): JSX.Element;
