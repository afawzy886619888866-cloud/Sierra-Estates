'use client';

import React from 'react';
import { I18nProvider } from '@/lib/i18n-client';
import { ToastProvider } from '@/components/client/Toast';
import { AuthProvider } from '@/components/client/AuthModal';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <ToastProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </ToastProvider>
      <SpeedInsights />
    </I18nProvider>
  );
}
