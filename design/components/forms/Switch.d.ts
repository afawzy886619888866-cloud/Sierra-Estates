import * as React from 'react';

export interface SwitchProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

/** Binary toggle switch. */
export declare function Switch(props: SwitchProps): JSX.Element;
