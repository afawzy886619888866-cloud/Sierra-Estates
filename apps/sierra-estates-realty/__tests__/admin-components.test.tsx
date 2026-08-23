/**
 * Admin Components — Render & Behaviour Suite
 *
 * Covers:
 *  • EasyListingStudio
 *  • HarnessBenchmarkCard
 *  • NegotiationSimulator
 *  • PropertyTeaserBrochure
 *  • WhatsAppScheduledSender
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import EasyListingStudio from '../components/admin/EasyListingStudio';
import { HarnessBenchmarkCard } from '../components/admin/HarnessBenchmarkCard';
import { NegotiationSimulator } from '../components/admin/NegotiationSimulator';
import { PropertyTeaserBrochure } from '../components/admin/PropertyTeaserBrochure';
import WhatsAppScheduledSender from '../components/admin/WhatsAppScheduledSender';

function render(el: React.ReactElement): string {
  return renderToStaticMarkup(el);
}

describe('Admin Components Suite', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok', templates: [], queuedMessages: [] }),
    } as Response);
  });

  describe('EasyListingStudio', () => {
    it('renders without throwing in English', () => {
      expect(() => render(<EasyListingStudio lang="en" />)).not.toThrow();
    });

    it('renders without throwing in Arabic', () => {
      expect(() => render(<EasyListingStudio lang="ar" />)).not.toThrow();
    });

    it('renders with default props', () => {
      expect(() => render(<EasyListingStudio />)).not.toThrow();
    });

    it('contains Easy Listing studio title in English', () => {
      const html = render(<EasyListingStudio lang="en" />);
      expect(html).toContain('Easy Listing Studio');
    });

    it('contains Mivida compound sample and AI score', () => {
      const html = render(<EasyListingStudio />);
      expect(html).toContain('Mivida');
      expect(html).toContain('9.6');
    });
  });

  describe('HarnessBenchmarkCard', () => {
    it('renders without throwing', () => {
      expect(() => render(<HarnessBenchmarkCard />)).not.toThrow();
    });

    it('displays DeepSeek Reasoning & Benchmark title', () => {
      const html = render(<HarnessBenchmarkCard />);
      expect(html).toContain('DeepSeek Reasoning &amp; Benchmark Harness');
      expect(html).toContain('Run Full Benchmark');
    });
  });

  describe('NegotiationSimulator', () => {
    it('renders without throwing', () => {
      expect(() => render(<NegotiationSimulator />)).not.toThrow();
    });

    it('contains Autonomous Negotiation Simulator title', () => {
      const html = render(<NegotiationSimulator />);
      expect(html).toContain('Stage-9 Autonomous Negotiation Simulator');
      expect(html).toContain('AI Closer Leila');
    });
  });

  describe('PropertyTeaserBrochure', () => {
    it('renders without throwing in English', () => {
      expect(() => render(<PropertyTeaserBrochure lang="en" />)).not.toThrow();
    });

    it('renders without throwing in Arabic', () => {
      expect(() => render(<PropertyTeaserBrochure lang="ar" />)).not.toThrow();
    });

    it('contains Investment Brochure generator controls', () => {
      const html = render(<PropertyTeaserBrochure lang="en" />);
      expect(html).toContain('Brochure');
    });
  });

  describe('WhatsAppScheduledSender', () => {
    it('renders without throwing in English', () => {
      expect(() => render(<WhatsAppScheduledSender lang="en" />)).not.toThrow();
    });

    it('renders without throwing in Arabic', () => {
      expect(() => render(<WhatsAppScheduledSender lang="ar" />)).not.toThrow();
    });

    it('contains WhatsApp messaging scheduler UI elements', () => {
      const html = render(<WhatsAppScheduledSender lang="en" />);
      expect(html).toContain('WhatsApp');
    });
  });
});
