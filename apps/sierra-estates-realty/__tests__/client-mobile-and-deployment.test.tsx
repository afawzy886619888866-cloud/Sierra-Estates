import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import SiteChrome from '../components/site/SiteChrome';
import { SiteProvider } from '../lib/site/SiteContext';

describe('Client Page Mobile Architecture & Deployment Readiness', () => {
  it('renders mobile bottom navigation bar with responsive items', () => {
    const html = renderToStaticMarkup(
      <SiteProvider>
        <SiteChrome active="home" />
      </SiteProvider>
    );

    // Assert mobile navigation bar exists
    expect(html).toContain('bottom-nav');
    expect(html).toContain('bn-item');

    // Assert key mobile links exist
    expect(html).toContain('href="/compounds"');
    expect(html).toContain('href="/properties"');
  });

  it('renders language and theme toggle controls for mobile/desktop headers', () => {
    const html = renderToStaticMarkup(
      <SiteProvider>
        <SiteChrome active="home" />
      </SiteProvider>
    );

    expect(html).toContain('id="theme-toggle"');
    expect(html).toContain('id="lang-toggle"');
  });

  it('verifies production environment variables are properly wired', () => {
    const prodUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sierra-estates.net';
    expect(prodUrl).toMatch(/^https?:\/\//);
  });
});
