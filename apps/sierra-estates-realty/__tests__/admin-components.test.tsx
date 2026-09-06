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
import DataPipelineTelemetryCard from '../components/admin/DataPipelineTelemetryCard';
import DatabaseHealthCard from '../components/admin/DatabaseHealthCard';
import AccidentalDataLossGuardModal from '../components/admin/AccidentalDataLossGuardModal';
import AdminCopilotDrawer from '../components/admin/AdminCopilotDrawer';

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

  describe('DataPipelineTelemetryCard', () => {
    it('renders without throwing in English', () => {
      expect(() => render(<DataPipelineTelemetryCard lang="en" />)).not.toThrow();
    });

    it('renders without throwing in Arabic', () => {
      expect(() => render(<DataPipelineTelemetryCard lang="ar" />)).not.toThrow();
    });

    it('contains pipeline and BigQuery DTS information', () => {
      const html = render(<DataPipelineTelemetryCard lang="en" />);
      expect(html).toContain('Data Pipelines &amp; Ingestion Telemetry');
      expect(html).toContain('Watermark Freshness');
      expect(html).toContain('BigQuery DTS Transfer');
    });
  });

  describe('DatabaseHealthCard', () => {
    it('renders without throwing in English', () => {
      expect(() => render(<DatabaseHealthCard lang="en" />)).not.toThrow();
    });

    it('renders without throwing in Arabic', () => {
      expect(() => render(<DatabaseHealthCard lang="ar" />)).not.toThrow();
    });

    it('displays pgvector HNSW Recall and latency', () => {
      const html = render(<DatabaseHealthCard lang="en" />);
      expect(html).toContain('Database &amp; Vector Index Health');
      expect(html).toContain('pgvector HNSW Recall');
      expect(html).toContain('P95 Query Latency');
    });
  });

  describe('AccidentalDataLossGuardModal', () => {
    it('renders nothing when isOpen is false', () => {
      const html = render(
        <AccidentalDataLossGuardModal
          isOpen={false}
          title={{ en: 'Delete', ar: 'حذف' }}
          actionDescription={{ en: 'Test', ar: 'تجربة' }}
          impactSummary={{ en: 'Loss', ar: 'فقد' }}
          onConfirm={() => {}}
          onCancel={() => {}}
        />
      );
      expect(html).toBe('');
    });

    it('renders safety guardrail when isOpen is true', () => {
      const html = render(
        <AccidentalDataLossGuardModal
          isOpen={true}
          title={{ en: 'Purge Staging Cache', ar: 'تفريغ الكاش' }}
          actionDescription={{ en: 'Purge test cache', ar: 'حذف الكاش' }}
          impactSummary={{ en: 'Irreversible deletion', ar: 'حذف لا رجعة فيه' }}
          affectedCount={460}
          onConfirm={() => {}}
          onCancel={() => {}}
        />
      );
      expect(html).toContain('Data Loss Prevention Shield');
      expect(html).toContain('Purge Staging Cache');
      expect(html).toContain('460');
      expect(html).toContain('CONFIRM');
    });
  });

  describe('AdminCopilotDrawer', () => {
    it('renders nothing when isOpen is false', () => {
      const html = render(
        <AdminCopilotDrawer isOpen={false} onClose={() => {}} />
      );
      expect(html).toBe('');
    });

    it('renders Gemini Data Analytics copilot interface when isOpen is true', () => {
      const html = render(
        <AdminCopilotDrawer isOpen={true} onClose={() => {}} lang="en" />
      );
      expect(html).toContain('Sierra Copilot');
      expect(html).toContain('Gemini Analytics');
      expect(html).toContain('Suggested Analytical Inquiries:');
    });
  });
});
