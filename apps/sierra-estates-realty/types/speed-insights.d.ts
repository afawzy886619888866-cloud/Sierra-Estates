declare module '@vercel/speed-insights/next' {
  import type { ComponentType } from 'react';

  export interface SpeedInsightsProps {
    dsn?: string;
    sampleRate?: number;
    route?: string | null;
    beforeSend?: (data: unknown) => unknown;
    debug?: boolean;
    endpoint?: string;
  }

  export const SpeedInsights: ComponentType<SpeedInsightsProps>;
}
