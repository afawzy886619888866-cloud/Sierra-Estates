import * as React from 'react';

export interface RangeSliderProps {
  /** Label shown top-left. */
  label?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange?: (value: number) => void;
  /** Formats the live value (e.g. n => `EGP ${n}M`). */
  format?: (value: number) => string;
  className?: string;
}

/** Gold range slider — used for the price / area filters. */
export declare function RangeSlider(props: RangeSliderProps): JSX.Element;
