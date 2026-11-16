/**
 * Tests for WhatsAppScheduledSender component (SIE-107-003)
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import WhatsAppScheduledSender from '@/components/admin/WhatsAppScheduledSender';

describe('SIE-107-003: WhatsAppScheduledSender Truthful View', () => {
  it('renders with empty initial recipient state requiring deliberate operator entry', () => {
    const html = renderToStaticMarkup(<WhatsAppScheduledSender lang="en" />);

    // Must have the textarea input for recipients
    expect(html).toContain('<textarea');
    expect(html).toContain('rows="2"');
    // Must NOT contain the old sample dummy recipients
    expect(html).not.toContain('+201001112233');
    expect(html).not.toContain('+201012223344');
  });

  it('renders bilingual interface elements correctly', () => {
    const htmlAr = renderToStaticMarkup(<WhatsAppScheduledSender lang="ar" />);
    expect(htmlAr).toContain('مرسل رسائل واتساب المجدول');

    const htmlEn = renderToStaticMarkup(<WhatsAppScheduledSender lang="en" />);
    expect(htmlEn).toContain('WhatsApp Outreach &amp; Date Scheduler');
  });
});
